const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const { getCurrentServing, callNext, getWaiting } = require('../controllers/queue.controller');

// All routes require authentication
router.use(authenticate);

// GET /api/queues/:departmentId/current
router.get('/:departmentId/current', getCurrentServing);

// POST /api/queues/:departmentId/next (admin only)
router.post('/:departmentId/next', adminOnly, callNext);

// GET /api/queues/:departmentId/waiting
router.get('/:departmentId/waiting', getWaiting);

module.exports = router;
