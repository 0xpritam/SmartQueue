const { Ticket, Department } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { sendSuccess, sendError } = require('../utils/response');
const catchAsync = require('../utils/catchAsync');

// ==========================================
// GENERATE TICKET
// ==========================================
const generateTicket = catchAsync(async (req, res) => {
  const { departmentId } = req.body;

  if (!departmentId) {
    return sendError(res, 400, 'departmentId is required');
  }

  // Verify department exists
  const department = await Department.findByPk(departmentId);
  if (!department) {
    return sendError(res, 404, 'Department not found');
  }

  // Generate unique ticket number
  const ticketNumber = `TKT-${Date.now()}-${uuidv4().replace(/-/g, '').toUpperCase()}`;

  const ticket = await Ticket.create({
    ticketNumber,
    status: 'waiting',
    userId: req.user.id,
    departmentId,
  });

  return sendSuccess(res, 201, 'Ticket generated successfully', { ticket });
});

// ==========================================
// GET MY TICKETS
// ==========================================
const getMyTickets = catchAsync(async (req, res) => {
  const tickets = await Ticket.findAll({
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']],
  });

  return sendSuccess(res, 200, undefined, { tickets });
});

// ==========================================
// GET TICKET BY ID
// ==========================================
const getTicketById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const ticket = await Ticket.findOne({
    where: { id, userId: req.user.id },
  });
  if (!ticket) {
    return sendError(res, 404, 'Ticket not found');
  }

  return sendSuccess(res, 200, undefined, { ticket });
});

// ==========================================
// EXPORTS
// ==========================================
module.exports = {
  generateTicket,
  getMyTickets,
  getTicketById,
};
