const { Ticket, Department } = require('../models');
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
// EXPORTS
// ==========================================
module.exports = {
  generateTicket,
  getMyTickets,
  getTicketById,
  getAllTickets,
  updateTicketStatus,
};

