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
  cancelTicket
} = require('../controllers/ticket.controller');

//TEMPORARY 
router.get('/test-cancel', (req, res) => {
  console.log("TEST ROUTE HIT");
  res.json({
    success: true,
    message: "cancel route deployed"
  });
});


// POST /api/tickets - Generate a new ticket (authenticated)
router.post('/', authenticate, generateTicket);

// GET /api/tickets - Get all tickets (authenticated, for staff dashboard)
router.get('/', authenticate, getAllTickets);

// GET /api/tickets/my - Get all tickets for logged-in user (authenticated)
router.get('/my', authenticate, getMyTickets);

// GET /api/tickets/:id - Get ticket by ID (authenticated)
router.get('/:id', authenticate, getTicketById);

// GET /api/tickets/:id/qr - Get ticket QR code (authenticated)
router.get('/:id/qr', authenticate, getTicketQR);

// PATCH /api/tickets/:id/status - Update ticket status (authenticated, for staff dashboard)
router.patch('/:id/status', authenticate, updateTicketStatus);

// PATCH /api/tickets/:id/cancel - Cancel ticket (authenticated)
router.patch('/:id/cancel', authenticate, cancelTicket);

module.exports = router;

