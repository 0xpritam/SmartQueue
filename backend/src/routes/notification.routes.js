// src/routes/notification.routes.js

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notification.controller');

// GET /api/notifications - Get paginated notifications (authenticated)
router.get('/', authenticate, getNotifications);

// PUT /api/notifications/read-all - Mark all notifications as read (authenticated)
router.put('/read-all', authenticate, markAllAsRead);

// PUT /api/notifications/:id/read - Mark a specific notification as read (authenticated)
router.put('/:id/read', authenticate, markAsRead);

module.exports = router;
