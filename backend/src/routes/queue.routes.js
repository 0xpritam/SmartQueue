const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
  getCurrentTicket,
  getWaitingTickets,
  callNextPatient,
  completeCurrentPatient,
} = require('../controllers/queue.controller');

// GET /api/queues/:departmentId/current
router.get('/:departmentId/current', authenticate, getCurrentTicket);

// GET /api/queues/:departmentId/waiting
router.get('/:departmentId/waiting', authenticate, getWaitingTickets);

// POST /api/queues/:departmentId/call-next
router.post('/:departmentId/call-next', authenticate, callNextPatient);

// POST /api/queues/:departmentId/complete-current
router.post('/:departmentId/complete-current', authenticate, completeCurrentPatient);

module.exports = router;
