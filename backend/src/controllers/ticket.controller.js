const { Ticket, Department } = require('../models');
const { v4: uuidv4 } = require('uuid');

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
    const ticketNumber = `TKT-${Date.now()}-${uuidv4().slice(0, 4).toUpperCase()}`;

    const ticket = await Ticket.create({
      ticketNumber,
      status: 'waiting',
      userId: req.user.id,
      departmentId,
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

    const ticket = await Ticket.findByPk(id);
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
// EXPORTS
// ==========================================
module.exports = {
  generateTicket,
  getMyTickets,
  getTicketById,
};
