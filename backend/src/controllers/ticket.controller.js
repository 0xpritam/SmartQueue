const { Ticket, Department, User } = require('../models');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { createNotification, handleQueuePositionChanges, getCleanTicketNumber } = require('../utils/notification');

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

      // Asynchronously trigger booking notification
      createNotification(io, {
        userId: req.user.id,
        ticketId: ticket.id,
        title: 'Ticket Booked',
        message: `Your ticket ${getCleanTicketNumber(ticket)} has been booked successfully.`,
        type: 'queue_update',
      }).catch((err) => console.error('[NOTIFICATION ERROR] Booked notification failed:', err));
    }

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
    }

    ticket.status = status;
    await ticket.save();

    // Emit socket updates
    const io = req.app?.get?.('io');
    if (io) {
      io.to(`ticket_${ticket.id}`).emit('ticket_updated', ticket);
      io.to(`department_${ticket.departmentId}`).emit('queue_updated', { departmentId: ticket.departmentId });

      // Handle queue shifts asynchronously
      if (oldStatus === 'waiting' && status !== 'waiting') {
        Ticket.findAll({
          where: { departmentId: oldDepartmentId, status: 'waiting' },
          order: [['createdAt', 'ASC']],
        }).then((ticketsAfter) => {
          handleQueuePositionChanges(io, oldDepartmentId, ticketsBefore, ticketsAfter);
        }).catch((err) => console.error('[NOTIFICATION ERROR] Fetching ticketsAfter failed:', err));
      }

      // Send status change notification asynchronously
      if (status === 'serving') {
        createNotification(io, {
          userId: ticket.userId,
          ticketId: ticket.id,
          title: 'Now Serving',
          message: 'You are now being served.',
          type: 'serving',
        }).catch((err) => console.error('[NOTIFICATION ERROR] Status update notification failed:', err));
      } else if (status === 'completed') {
        createNotification(io, {
          userId: ticket.userId,
          ticketId: ticket.id,
          title: 'Visit Completed',
          message: 'Your visit has been completed.',
          type: 'completed',
        }).catch((err) => console.error('[NOTIFICATION ERROR] Status update notification failed:', err));
      } else if (status === 'cancelled') {
        createNotification(io, {
          userId: ticket.userId,
          ticketId: ticket.id,
          title: 'Ticket Cancelled',
          message: `Your ticket ${getCleanTicketNumber(ticket)} has been cancelled.`,
          type: 'queue_update',
        }).catch((err) => console.error('[NOTIFICATION ERROR] Status update notification failed:', err));
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
    const isAdmin = user.role === 'admin';
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
    console.log("Found Ticket:", ticket);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // 3. Load current user from database
    const user = await User.findByPk(req.user.id);
    console.log("DB User:", user?.id, user?.role);

console.log("Ticket User:", ticket.userId);
console.log("Request User:", req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // 4. Check access permissions
    const isOwner = ticket.userId === req.user.id;
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this ticket',
      });
    }

    // 5. Only allow cancellation when status is 'waiting'
    console.log("Current Status:", ticket?.status);
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

    // 7. Update status to 'cancelled' and save
    ticket.status = 'cancelled';
    await ticket.save();

    // 8. Fetch waiting tickets after cancellation
    const ticketsAfter = await Ticket.findAll({
      where: { departmentId, status: 'waiting' },
      order: [['createdAt', 'ASC']],
    });

    // 9. Socket.io updates
    const io = req.app?.get?.('io');
    if (io) {
      // Emit ticket_updated to the ticket room
      io.to(`ticket_${ticket.id}`).emit('ticket_updated', ticket);
      // Emit queue_updated to the department room
      io.to(`department_${departmentId}`).emit('queue_updated', { departmentId });

      // Call handleQueuePositionChanges asynchronously
      handleQueuePositionChanges(io, departmentId, ticketsBefore, ticketsAfter);

      // Create cancellation notification
      createNotification(io, {
        userId: ticket.userId,
        ticketId: ticket.id,
        title: 'Ticket Cancelled',
        message: `Your ticket ${getCleanTicketNumber(ticket)} has been cancelled.`,
        type: 'queue_update',
      }).catch((err) => console.error('[NOTIFICATION ERROR] Cancellation notification failed:', err));
    }

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
};

