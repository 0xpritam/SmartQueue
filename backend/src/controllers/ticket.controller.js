const { Ticket, Department, User } = require('../models');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { logAudit } = require('../utils/auditLogger');
const { createNotification, handleQueuePositionChanges, getCleanTicketNumber, sendBookingNotification, sendCancellationNotification, sendCompletionNotification, sendServingNotification } = require('../utils/notification');

// ==========================================
// GENERATE TICKET
// ==========================================
const generateTicket = async (req, res) => {
  try {
    const { departmentId } = req.body;

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message: 'departmentId is required',
      });
    }

    // Verify department exists
    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    // Generate unique ticket number
    const ticketNumber = `TKT-${Date.now()}-${uuidv4().replace(/-/g, '').toUpperCase()}`;

    const ticket = await Ticket.create({
      ticketNumber,
      status: 'waiting',
      userId: req.user.id,
      departmentId,
    });

    // Emit socket update
    const io = req.app?.get?.('io');
    if (io) {
      io.to(`department_${departmentId}`).emit('queue_updated', { departmentId });

      // Trigger socket analytics update
      const { emitAnalyticsUpdate } = require('./analytics.controller');
      emitAnalyticsUpdate(io);

      // Asynchronously trigger booking notification
      sendBookingNotification(io, ticket, req.user.id).catch((err) => console.error('[NOTIFICATION ERROR] Booked notification failed:', err));
    }

    // Calculate queue position
    const queuePosition = (Ticket.count && typeof Ticket.count === 'function')
      ? await Ticket.count({ where: { departmentId, status: 'waiting' } })
      : null;

    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'BOOK_TICKET',
      entityType: 'Ticket',
      entityId: ticket.id,
      description: `Ticket ${ticket.ticketNumber} booked successfully`,
      ipAddress: req.ip,
      metadata: {
        ticketNumber: ticket.ticketNumber,
        department: department.name,
        queuePosition
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Ticket generated successfully',
      ticket,
    });
  } catch (error) {
    console.error('Generate ticket error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ==========================================
// GET MY TICKETS
// ==========================================
const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      tickets,
    });
  } catch (error) {
    console.error('Get my tickets error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ==========================================
// GET TICKET BY ID
// ==========================================
const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findOne({
      where: { id, userId: req.user.id },
    });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    return res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Get ticket by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ==========================================
// GET ALL TICKETS (for staff dashboard)
// ==========================================
const getAllTickets = async (req, res) => {
  try {
    const { status, departmentId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;

    const tickets = await Ticket.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'phone', 'age'],
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      tickets,
    });
  } catch (error) {
    console.error('Get all tickets error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ==========================================
// UPDATE TICKET STATUS (for staff dashboard)
// ==========================================
const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['waiting', 'serving', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    const oldStatus = ticket.status;
    const oldDepartmentId = ticket.departmentId;

    let ticketsBefore = [];
    if (oldStatus === 'waiting') {
      ticketsBefore = await Ticket.findAll({
        where: { departmentId: oldDepartmentId, status: 'waiting' },
        order: [['createdAt', 'ASC']],
      });
      ticketsBefore.sort((a, b) => {
        const timeA = a.rescheduledAt || a.createdAt;
        const timeB = b.rescheduledAt || b.createdAt;
        return new Date(timeA) - new Date(timeB);
      });
    }

    if (status === 'serving') {
      ticket.calledAt = new Date();
    }
    ticket.status = status;
    await ticket.save();

    // Emit socket updates
    const io = req.app?.get?.('io');
    if (io) {
      io.to(`ticket_${ticket.id}`).emit('ticket_updated', ticket);
      io.to(`department_${ticket.departmentId}`).emit('queue_updated', { departmentId: ticket.departmentId });
      io.to(`department_${ticket.departmentId}`).emit('prediction_updated', { departmentId: ticket.departmentId });
      io.to(`ticket_${ticket.id}`).emit('prediction_updated', { ticketId: ticket.id });

      // Trigger socket analytics update
      const { emitAnalyticsUpdate } = require('./analytics.controller');
      emitAnalyticsUpdate(io);

      // Handle queue shifts asynchronously
      if (oldStatus === 'waiting' && status !== 'waiting') {
        Ticket.findAll({
          where: { departmentId: oldDepartmentId, status: 'waiting' },
          order: [['createdAt', 'ASC']],
        }).then((ticketsAfter) => {
          ticketsAfter.sort((a, b) => {
            const timeA = a.rescheduledAt || a.createdAt;
            const timeB = b.rescheduledAt || b.createdAt;
            return new Date(timeA) - new Date(timeB);
          });
          handleQueuePositionChanges(io, oldDepartmentId, ticketsBefore, ticketsAfter);
        }).catch((err) => console.error('[NOTIFICATION ERROR] Fetching ticketsAfter failed:', err));
      }

      // Send status change notification asynchronously
      if (status === 'serving') {
        sendServingNotification(io, ticket).catch((err) => console.error('[NOTIFICATION ERROR] Status update notification failed:', err));
      } else if (status === 'completed') {
        sendCompletionNotification(io, ticket).catch((err) => console.error('[NOTIFICATION ERROR] Status update notification failed:', err));
      } else if (status === 'cancelled') {
        sendCancellationNotification(io, ticket).catch((err) => console.error('[NOTIFICATION ERROR] Status update notification failed:', err));
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Ticket status updated successfully',
      ticket,
    });
  } catch (error) {
    console.error('Update ticket status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ==========================================
// GET TICKET QR CODE
// ==========================================
const getTicketQR = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket ID format',
      });
    }

    // 2. Find ticket by ID
    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // 3. Load current user from database
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // 4. Check access permissions
    const isOwner = ticket.userId === req.user.id;
    const isAdmin = user.role === 'admin' || user.role === 'staff';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this ticket',
      });
    }

    // 5. Generate QR payload
    const qrPayload = {
      ticketNumber: ticket.ticketNumber,
      ticketId: ticket.id,
      patientId: ticket.userId,
    };

    // 6. Generate QR dynamically using qrcode package
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload));

    // 7. Return successful response
    return res.status(200).json({
      success: true,
      ticketId: ticket.ticketNumber,
      qrCode: qrCodeDataUrl,
    });
  } catch (error) {
    console.error('Get ticket QR error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ==========================================
// CANCEL TICKET
// ==========================================
const cancelTicket = async (req, res) => {
  try {
    console.log("CANCEL CONTROLLER HIT");
    console.log("Ticket ID:", req.params.id);
    const { id } = req.params;

    // 1. Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket ID format',
      });
    }

    // 2. Find ticket by ID
    const ticket = await Ticket.findByPk(id);
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // 3. Load current user from database
    const user = await User.findByPk(req.user.id);
    


    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // 4. Check access permissions
    const isOwner = ticket.userId === req.user.id;
    const isAdmin = user.role === 'admin' || user.role === 'staff';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this ticket',
      });
    }

    // 5. Only allow cancellation when status is 'waiting'
   
    if (ticket.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        message: `Only tickets with status 'waiting' can be cancelled. Current status is '${ticket.status}'.`,
      });
    }

    const departmentId = ticket.departmentId;

    // 6. Fetch waiting tickets before cancellation
    const ticketsBefore = await Ticket.findAll({
      where: { departmentId, status: 'waiting' },
      order: [['createdAt', 'ASC']],
    });
    ticketsBefore.sort((a, b) => {
      const timeA = a.rescheduledAt || a.createdAt;
      const timeB = b.rescheduledAt || b.createdAt;
      return new Date(timeA) - new Date(timeB);
    });

    // 7. Update status to 'cancelled' and save
    ticket.status = 'cancelled';
    await ticket.save();

    // 8. Fetch waiting tickets after cancellation
    const ticketsAfter = await Ticket.findAll({
      where: { departmentId, status: 'waiting' },
      order: [['createdAt', 'ASC']],
    });
    ticketsAfter.sort((a, b) => {
      const timeA = a.rescheduledAt || a.createdAt;
      const timeB = b.rescheduledAt || b.createdAt;
      return new Date(timeA) - new Date(timeB);
    });

    // 9. Socket.io updates
    const io = req.app?.get?.('io');
    if (io) {
      // Emit ticket_updated to the ticket room
      io.to(`ticket_${ticket.id}`).emit('ticket_updated', ticket);
      // Emit queue_updated to the department room
      io.to(`department_${departmentId}`).emit('queue_updated', { departmentId });
      io.to(`department_${departmentId}`).emit('prediction_updated', { departmentId });
      io.to(`ticket_${ticket.id}`).emit('prediction_updated', { ticketId: ticket.id });

      // Trigger socket analytics update
      const { emitAnalyticsUpdate } = require('./analytics.controller');
      emitAnalyticsUpdate(io);

      // Call handleQueuePositionChanges asynchronously
      handleQueuePositionChanges(io, departmentId, ticketsBefore, ticketsAfter);

      // Create cancellation notification
      sendCancellationNotification(io, ticket).catch((err) => console.error('[NOTIFICATION ERROR] Cancellation notification failed:', err));
    }

    const queuePosition = ticketsBefore.findIndex(t => t.id === ticket.id) + 1;

    logAudit({
      userId: req.user.id,
      role: user.role,
      action: 'CANCEL_TICKET',
      entityType: 'Ticket',
      entityId: ticket.id,
      description: `Ticket ${ticket.ticketNumber} cancelled`,
      ipAddress: req.ip,
      metadata: {
        ticketNumber: ticket.ticketNumber,
        queuePosition
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Ticket cancelled successfully',
      ticket,
    });
  } catch (error) {
    console.error('Cancel ticket error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ==========================================
// GET APPOINTMENT HISTORY (completed & cancelled)
// ==========================================
const getAppointmentHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Ticket.findAndCountAll({
      where: {
        userId: req.user.id,
        status: ['completed', 'cancelled'],
      },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'description'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      tickets: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error('Get appointment history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ==========================================
// RESCHEDULE TICKET
// ==========================================
const rescheduleTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { departmentId: newDepartmentId } = req.body;

    if (!newDepartmentId) {
      return res.status(400).json({
        success: false,
        message: 'Destination departmentId is required',
      });
    }

    // 1. Fetch ticket
    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // 2. Validate authorization (only owner can reschedule)
    if (ticket.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only reschedule your own tickets',
      });
    }

    // 3. Validate status (only waiting tickets can be rescheduled)
    if (ticket.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        message: `Only tickets with status 'waiting' can be rescheduled. Current status is '${ticket.status}'.`,
      });
    }

    // 4. Validate destination department exists
    const newDept = await Department.findByPk(newDepartmentId);
    if (!newDept) {
      return res.status(404).json({
        success: false,
        message: 'Destination department does not exist',
      });
    }

    // 5. Reject if destination department is the same as the current department
    const oldDepartmentId = ticket.departmentId;
    if (oldDepartmentId === newDepartmentId) {
      return res.status(400).json({
        success: false,
        message: 'Destination department cannot be the same as the current department',
      });
    }

    // 6. Fetch waiting tickets before reschedule in both departments
    const [oldTicketsBefore, newTicketsBefore] = await Promise.all([
      Ticket.findAll({
        where: { departmentId: oldDepartmentId, status: 'waiting' },
        order: [['createdAt', 'ASC']],
      }),
      Ticket.findAll({
        where: { departmentId: newDepartmentId, status: 'waiting' },
        order: [['createdAt', 'ASC']],
      })
    ]);

    oldTicketsBefore.sort((a, b) => {
      const timeA = a.rescheduledAt || a.createdAt;
      const timeB = b.rescheduledAt || b.createdAt;
      return new Date(timeA) - new Date(timeB);
    });
    newTicketsBefore.sort((a, b) => {
      const timeA = a.rescheduledAt || a.createdAt;
      const timeB = b.rescheduledAt || b.createdAt;
      return new Date(timeA) - new Date(timeB);
    });

    const oldQueuePosition = oldTicketsBefore.findIndex(t => t.id === ticket.id) + 1;

    // 7. Update ticket
    ticket.departmentId = newDepartmentId;
    ticket.rescheduledAt = new Date();
    await ticket.save();

    // 8. Fetch waiting tickets after reschedule in both departments
    const [oldTicketsAfter, newTicketsAfter] = await Promise.all([
      Ticket.findAll({
        where: { departmentId: oldDepartmentId, status: 'waiting' },
        order: [['createdAt', 'ASC']],
      }),
      Ticket.findAll({
        where: { departmentId: newDepartmentId, status: 'waiting' },
        order: [['createdAt', 'ASC']],
      })
    ]);

    oldTicketsAfter.sort((a, b) => {
      const timeA = a.rescheduledAt || a.createdAt;
      const timeB = b.rescheduledAt || b.createdAt;
      return new Date(timeA) - new Date(timeB);
    });
    newTicketsAfter.sort((a, b) => {
      const timeA = a.rescheduledAt || a.createdAt;
      const timeB = b.rescheduledAt || b.createdAt;
      return new Date(timeA) - new Date(timeB);
    });

    const newQueuePosition = newTicketsAfter.findIndex(t => t.id === ticket.id) + 1;

    // 9. Socket emissions
    const io = req.app?.get?.('io');
    if (io) {
      io.to(`ticket_${ticket.id}`).emit('ticket_updated', ticket);
      io.to(`department_${oldDepartmentId}`).emit('queue_updated', { departmentId: oldDepartmentId });
      io.to(`department_${newDepartmentId}`).emit('queue_updated', { departmentId: newDepartmentId });
      io.to(`department_${oldDepartmentId}`).emit('prediction_updated', { departmentId: oldDepartmentId });
      io.to(`department_${newDepartmentId}`).emit('prediction_updated', { departmentId: newDepartmentId });
      io.to(`ticket_${ticket.id}`).emit('prediction_updated', { ticketId: ticket.id });

      // Trigger analytics update
      const { emitAnalyticsUpdate } = require('./analytics.controller');
      emitAnalyticsUpdate(io);

      // Handle queue shifts in both departments
      handleQueuePositionChanges(io, oldDepartmentId, oldTicketsBefore, oldTicketsAfter);
      handleQueuePositionChanges(io, newDepartmentId, newTicketsBefore, newTicketsAfter);

      // Trigger reschedule notification
      const { sendRescheduleNotification } = require('../utils/notification');
      sendRescheduleNotification(io, ticket, oldDepartmentId, oldQueuePosition).catch((err) => {
        console.error('[NOTIFICATION ERROR] Failed to send reschedule notification:', err);
      });
    }

    const oldDept = await Department.findByPk(oldDepartmentId);
    const oldDepartment = oldDept ? oldDept.name : oldDepartmentId;
    const newDepartment = newDept ? newDept.name : newDepartmentId;

    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'RESCHEDULE_TICKET',
      entityType: 'Ticket',
      entityId: ticket.id,
      description: `Ticket ${ticket.ticketNumber} rescheduled`,
      ipAddress: req.ip,
      metadata: {
        oldDepartment,
        newDepartment,
        oldQueuePosition,
        newQueuePosition
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Ticket rescheduled successfully',
      ticket,
    });

  } catch (error) {
    console.error('Reschedule ticket error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ==========================================
// START SERVING TICKET (for staff operations)
// ==========================================
const startServingTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(req.user.id);
    if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Staff or admins only.',
      });
    }

    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // Permission lock check
    if (user.role === 'staff' && ticket.departmentId !== user.departmentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only manage tickets for your assigned department.',
      });
    }

    if (ticket.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        message: 'Ticket status must be waiting.',
      });
    }

    // Check if another ticket is already serving in this department
    const servingTicketExists = await Ticket.findOne({
      where: { departmentId: ticket.departmentId, status: 'serving' }
    });

    if (servingTicketExists) {
      return res.status(409).json({
        success: false,
        message: 'Another patient is currently being served in this department.',
      });
    }

    // Fetch waiting tickets before status change to calculate queue reordering
    const ticketsBefore = await Ticket.findAll({
      where: { departmentId: ticket.departmentId, status: 'waiting' },
      order: [['createdAt', 'ASC']],
    });
    ticketsBefore.sort((a, b) => {
      const timeA = a.rescheduledAt || a.createdAt;
      const timeB = b.rescheduledAt || b.createdAt;
      return new Date(timeA) - new Date(timeB);
    });

    // Update status, calledAt and servingStartTime
    ticket.status = 'serving';
    ticket.calledAt = new Date();
    ticket.servingStartTime = new Date();
    await ticket.save();

    // Fetch waiting tickets after status change
    const ticketsAfter = await Ticket.findAll({
      where: { departmentId: ticket.departmentId, status: 'waiting' },
      order: [['createdAt', 'ASC']],
    });
    ticketsAfter.sort((a, b) => {
      const timeA = a.rescheduledAt || a.createdAt;
      const timeB = b.rescheduledAt || b.createdAt;
      return new Date(timeA) - new Date(timeB);
    });

    // Socket.io broadcasts & triggers
    const io = req.app?.get?.('io');
    if (io) {
      io.to(`ticket_${ticket.id}`).emit('ticket_updated', ticket);
      io.to(`department_${ticket.departmentId}`).emit('queue_updated', { departmentId: ticket.departmentId });
      io.emit('serving_started', ticket);
      io.to(`department_${ticket.departmentId}`).emit('prediction_updated', { departmentId: ticket.departmentId });
      io.to(`ticket_${ticket.id}`).emit('prediction_updated', { ticketId: ticket.id });

      // Trigger socket analytics update
      const { emitAnalyticsUpdate } = require('./analytics.controller');
      emitAnalyticsUpdate(io);

      // Recalculate remaining waiting queue positions and notify affected users
      handleQueuePositionChanges(io, ticket.departmentId, ticketsBefore, ticketsAfter);

      // Send the "Now Serving" notification
      sendServingNotification(io, ticket).catch((err) =>
        console.error('[NOTIFICATION ERROR] Serving notification failed:', err)
      );
    }

    const queuePosition = ticketsBefore.findIndex(t => t.id === ticket.id) + 1;

    logAudit({
      userId: req.user.id,
      role: user.role,
      action: 'START_SERVING',
      entityType: 'Ticket',
      entityId: ticket.id,
      description: `Started serving ticket ${ticket.ticketNumber}`,
      ipAddress: req.ip,
      metadata: {
        ticketNumber: ticket.ticketNumber,
        queuePosition
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Ticket status updated to serving.',
      ticket,
    });
  } catch (error) {
    console.error('Start serving ticket error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ==========================================
// COMPLETE VISIT (for staff operations)
// ==========================================
const completeTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(req.user.id);
    if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Staff or admins only.',
      });
    }

    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // Permission lock check
    if (user.role === 'staff' && ticket.departmentId !== user.departmentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only manage tickets for your assigned department.',
      });
    }

    if (ticket.status !== 'serving') {
      return res.status(400).json({
        success: false,
        message: 'Ticket must currently be serving.',
      });
    }

    ticket.status = 'completed';
    ticket.completedAt = new Date();
    await ticket.save();

    // Socket.io broadcasts & triggers
    const io = req.app?.get?.('io');
    if (io) {
      io.to(`ticket_${ticket.id}`).emit('ticket_updated', ticket);
      io.to(`department_${ticket.departmentId}`).emit('queue_updated', { departmentId: ticket.departmentId });
      io.emit('visit_completed', ticket);
      io.to(`department_${ticket.departmentId}`).emit('prediction_updated', { departmentId: ticket.departmentId });
      io.to(`ticket_${ticket.id}`).emit('prediction_updated', { ticketId: ticket.id });

      // Trigger socket analytics update
      const { emitAnalyticsUpdate } = require('./analytics.controller');
      emitAnalyticsUpdate(io);

      // Send completion notification & email
      sendCompletionNotification(io, ticket).catch((err) =>
        console.error('[NOTIFICATION ERROR] Completion notification failed:', err)
      );
    }

    const durationMs = new Date(ticket.completedAt) - new Date(ticket.servingStartTime);

    logAudit({
      userId: req.user.id,
      role: user.role,
      action: 'COMPLETE_TICKET',
      entityType: 'Ticket',
      entityId: ticket.id,
      description: `Completed ticket ${ticket.ticketNumber}`,
      ipAddress: req.ip,
      metadata: {
        ticketNumber: ticket.ticketNumber,
        durationMs
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Ticket completed successfully.',
      ticket,
    });
  } catch (error) {
    console.error('Complete ticket error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ==========================================
// CANCEL VISIT (for staff operations)
// ==========================================
const cancelTicketStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(req.user.id);
    if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Staff or admins only.',
      });
    }

    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // Permission lock check
    if (user.role === 'staff' && ticket.departmentId !== user.departmentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only manage tickets for your assigned department.',
      });
    }

    if (ticket.status !== 'waiting' && ticket.status !== 'serving') {
      return res.status(400).json({
        success: false,
        message: 'Only waiting or serving tickets can be cancelled.',
      });
    }

    const oldStatus = ticket.status;

    // Fetch waiting tickets before status change to calculate queue reordering if it was waiting
    let ticketsBefore = [];
    if (oldStatus === 'waiting') {
      ticketsBefore = await Ticket.findAll({
        where: { departmentId: ticket.departmentId, status: 'waiting' },
        order: [['createdAt', 'ASC']],
      });
      ticketsBefore.sort((a, b) => {
        const timeA = a.rescheduledAt || a.createdAt;
        const timeB = b.rescheduledAt || b.createdAt;
        return new Date(timeA) - new Date(timeB);
      });
    }

    ticket.status = 'cancelled';
    await ticket.save();

    // Fetch waiting tickets after status change if it was waiting
    let ticketsAfter = [];
    if (oldStatus === 'waiting') {
      ticketsAfter = await Ticket.findAll({
        where: { departmentId: ticket.departmentId, status: 'waiting' },
        order: [['createdAt', 'ASC']],
      });
      ticketsAfter.sort((a, b) => {
        const timeA = a.rescheduledAt || a.createdAt;
        const timeB = b.rescheduledAt || b.createdAt;
        return new Date(timeA) - new Date(timeB);
      });
    }

    // Socket.io broadcasts & triggers
    const io = req.app?.get?.('io');
    if (io) {
      io.to(`ticket_${ticket.id}`).emit('ticket_updated', ticket);
      io.to(`department_${ticket.departmentId}`).emit('queue_updated', { departmentId: ticket.departmentId });
      io.emit('ticket_cancelled', ticket);
      io.to(`department_${ticket.departmentId}`).emit('prediction_updated', { departmentId: ticket.departmentId });
      io.to(`ticket_${ticket.id}`).emit('prediction_updated', { ticketId: ticket.id });

      // Trigger socket analytics update
      const { emitAnalyticsUpdate } = require('./analytics.controller');
      emitAnalyticsUpdate(io);

      // Recalculate remaining waiting queue positions and notify affected users if it was waiting
      if (oldStatus === 'waiting') {
        handleQueuePositionChanges(io, ticket.departmentId, ticketsBefore, ticketsAfter);
      }

      // Send cancellation notification & email
      sendCancellationNotification(io, ticket).catch((err) =>
        console.error('[NOTIFICATION ERROR] Cancellation notification failed:', err)
      );
    }

    const queuePosition = oldStatus === 'waiting' ? (ticketsBefore.findIndex(t => t.id === ticket.id) + 1) : null;

    logAudit({
      userId: req.user.id,
      role: user.role,
      action: 'CANCEL_TICKET',
      entityType: 'Ticket',
      entityId: ticket.id,
      description: `Ticket ${ticket.ticketNumber} cancelled by staff/admin`,
      ipAddress: req.ip,
      metadata: {
        ticketNumber: ticket.ticketNumber,
        queuePosition
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Ticket cancelled successfully.',
      ticket,
    });
  } catch (error) {
    console.error('Cancel staff ticket error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ==========================================
// EXPORTS
// ==========================================
module.exports = {
  generateTicket,
  getMyTickets,
  getTicketById,
  getAllTickets,
  updateTicketStatus,
  getTicketQR,
  cancelTicket,
  getAppointmentHistory,
  rescheduleTicket,
  startServingTicket,
  completeTicket,
  cancelTicketStaff,
};

