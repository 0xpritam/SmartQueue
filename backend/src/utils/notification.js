// src/utils/notification.js

const { Notification, Ticket } = require('../models');
const { Op } = require('sequelize');

// Helper to format ticket number for notifications
const getCleanTicketNumber = (ticket) => {
  if (!ticket) return '';
  if (!ticket.ticketNumber) {
    const shortId = ticket.id ? ticket.id.substring(0, 6) : '';
    return shortId ? `TKT-${shortId}` : '';
  }
  const parts = ticket.ticketNumber.split('-');
  const shortId = parts[2] ? parts[2].substring(0, 6) : (ticket.id ? ticket.id.substring(0, 6) : '');
  return shortId ? `TKT-${shortId}` : '';
};

// Prune notifications asynchronously in MySQL to keep only the latest 100 for a user
const pruneOldNotifications = async (userId) => {
  try {
    const count = await Notification.count({ where: { userId } });
    if (count > 100) {
      // Find the 100th notification (ordered DESC, offset 99)
      const oldestToKeep = await Notification.findOne({
        where: { userId },
        order: [['createdAt', 'DESC']],
        offset: 99,
      });

      if (oldestToKeep) {
        const deletedCount = await Notification.destroy({
          where: {
            userId,
            createdAt: {
              [Op.lt]: oldestToKeep.createdAt,
            },
          },
        });
        console.log(`[NOTIFICATION PRUNE] Deleted ${deletedCount} older notifications for user ${userId}`);
      }
    }
  } catch (error) {
    console.error(`[NOTIFICATION PRUNE ERROR] Pruning failed for user ${userId}:`, error);
  }
};

// Create a single notification and emit it to user:${userId}
const createNotification = async (io, { userId, ticketId, title, message, type }) => {
  try {
    if (!userId) {
      console.warn('[NOTIFICATION WARNING] Cannot create notification without userId');
      return null;
    }

    const notification = await Notification.create({
      userId,
      ticketId,
      title,
      message,
      type,
    });

    // Run database pruning asynchronously
    pruneOldNotifications(userId).catch((pruneErr) => {
      console.error('[NOTIFICATION ERROR] Async pruning error:', pruneErr);
    });

    // Emit live update to user room user:${userId} if Socket.io server is available
    if (io) {
      io.to(`user:${userId}`).emit('new_notification', notification);
      console.log(`[SOCKET] Sent new_notification event to room "user:${userId}"`);
    }

    return notification;
  } catch (error) {
    console.error('[NOTIFICATION ERROR] Failed to create or emit notification:', error);
    return null;
  }
};

// Check queue position changes and notify affected users
const handleQueuePositionChanges = async (io, departmentId, ticketsBefore, ticketsAfter) => {
  try {
    // Filter out remaining wait-listed tickets
    const remainingWaitingTickets = ticketsAfter.filter((t) => t.status === 'waiting');

    for (let indexAfter = 0; indexAfter < remainingWaitingTickets.length; indexAfter++) {
      const ticket = remainingWaitingTickets[indexAfter];
      const indexBefore = ticketsBefore.findIndex((t) => t.id === ticket.id);

      // If position has shifted (moved up in the FIFO queue)
      if (indexBefore !== -1 && indexBefore !== indexAfter) {
        if (indexAfter === 0) {
          // Next in queue
          createNotification(io, {
            userId: ticket.userId,
            ticketId: ticket.id,
            title: 'Queue Update',
            message: 'You are next in the queue.',
            type: 'queue_update',
          }).catch((err) => console.error('[NOTIFICATION ERROR] Async queue-next notification error:', err));
        } else {
          // Shifted position
          createNotification(io, {
            userId: ticket.userId,
            ticketId: ticket.id,
            title: 'Queue Update',
            message: 'Your queue position has changed.',
            type: 'queue_update',
          }).catch((err) => console.error('[NOTIFICATION ERROR] Async queue-position notification error:', err));
        }
      }
    }
  } catch (error) {
    console.error('[NOTIFICATION ERROR] Failed to handle queue position changes:', error);
  }
};

module.exports = {
  createNotification,
  handleQueuePositionChanges,
  getCleanTicketNumber,
};
