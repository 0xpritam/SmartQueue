const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { 
  generateTicket, 
  getMyTickets, 
  getTicketById, 
  getAllTickets, 
  updateTicketStatus,
  getTicketQR,
  cancelTicket,
  getAppointmentHistory,
  rescheduleTicket
} = require('../controllers/ticket.controller');




// POST /api/tickets - Generate a new ticket (authenticated)
router.post('/', authenticate, generateTicket);

// GET /api/tickets - Get all tickets (authenticated, for staff dashboard)
router.get('/', authenticate, getAllTickets);

// GET /api/tickets/my - Get all tickets for logged-in user (authenticated)
router.get('/my', authenticate, getMyTickets);

// GET /api/tickets/history - Get appointment history for logged-in user (authenticated)
router.get('/history', authenticate, getAppointmentHistory);

// GET /api/tickets/:id - Get ticket by ID (authenticated)
router.get('/:id', authenticate, getTicketById);

// GET /api/tickets/:id/qr - Get ticket QR code (authenticated)
router.get('/:id/qr', authenticate, getTicketQR);

// PATCH /api/tickets/:id/status - Update ticket status (authenticated, for staff dashboard)
router.patch('/:id/status', authenticate, updateTicketStatus);

// PATCH /api/tickets/:id/cancel - Cancel ticket (authenticated)
router.patch('/:id/cancel', authenticate, cancelTicket);

// PATCH /api/tickets/:id/reschedule - Reschedule ticket (authenticated)
router.patch('/:id/reschedule', authenticate, rescheduleTicket);

module.exports = router;

