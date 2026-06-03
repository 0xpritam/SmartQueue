const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { validateFields } = require('../middleware/validate');
const { generateTicket, getMyTickets, getTicketById } = require('../controllers/ticket.controller');

// POST /api/tickets - Generate a new ticket (authenticated)
router.post('/', authenticate, validateFields(['departmentId']), generateTicket);

// GET /api/tickets/my - Get all tickets for logged-in user (authenticated)
router.get('/my', authenticate, getMyTickets);

// GET /api/tickets/:id - Get ticket by ID (authenticated)
router.get('/:id', authenticate, getTicketById);

module.exports = router;
