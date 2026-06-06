const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { 
  generateTicket, 
  getMyTickets, 
  getTicketById, 
  getAllTickets, 
  updateTicketStatus 
} = require('../controllers/ticket.controller');

// POST /api/tickets - Generate a new ticket (authenticated)
router.post('/', authenticate, generateTicket);

// GET /api/tickets - Get all tickets (authenticated, for staff dashboard)
router.get('/', authenticate, getAllTickets);

// GET /api/tickets/my - Get all tickets for logged-in user (authenticated)
router.get('/my', authenticate, getMyTickets);

// GET /api/tickets/:id - Get ticket by ID (authenticated)
router.get('/:id', authenticate, getTicketById);

// PATCH /api/tickets/:id/status - Update ticket status (authenticated, for staff dashboard)
router.patch('/:id/status', authenticate, updateTicketStatus);

module.exports = router;

