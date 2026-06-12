// src/controllers/notification.controller.js

const { Notification } = require('../models');

// GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    // Validate parameters
    const sanitizedPage = Math.max(1, page);
    const sanitizedLimit = Math.max(1, Math.min(100, limit)); // Cap at 100 per page
    const offset = (sanitizedPage - 1) * sanitizedLimit;

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: sanitizedLimit,
      offset,
    });

    const totalPages = Math.ceil(count / sanitizedLimit);

    return res.status(200).json({
      success: true,
      notifications,
      pagination: {
        totalCount: count,
        totalPages,
        currentPage: sanitizedPage,
        limit: sanitizedLimit,
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// PUT /api/notifications/:id/read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    notification.isRead = true;
    await notification.save();

    // Emit socket update to other tabs
    const io = req.app?.get?.('io');
    if (io) {
      io.to(`user:${req.user.id}`).emit('notification_read', { id });
    }

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// PUT /api/notifications/read-all
const markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { userId: req.user.id, isRead: false } }
    );

    // Emit socket update to other tabs
    const io = req.app?.get?.('io');
    if (io) {
      io.to(`user:${req.user.id}`).emit('all_notifications_read');
    }

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
