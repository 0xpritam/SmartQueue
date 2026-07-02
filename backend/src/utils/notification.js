// src/utils/notification.js

const { Notification, Ticket, sequelize } = require('../models');
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

// Orchestration Layer Functions

const sendBookingNotification = async (io, ticket, userId) => {
  const notificationPromise = createNotification(io, {
    userId,
    ticketId: ticket.id,
    title: 'Ticket Booked',
    message: `Your ticket ${getCleanTicketNumber(ticket)} has been booked successfully.`,
    type: 'queue_update',
  });

  const { User, Department } = require('../models');
  Promise.all([
    User.findByPk(userId),
    Department.findByPk(ticket.departmentId),
  ]).then(([user, department]) => {
    if (user && department) {
      const { sendBookingEmail } = require('../services/email.service');
      sendBookingEmail(user, department, ticket).catch((err) => {
        console.error('[EMAIL ERROR] Failed to send booking email:', err);
      });
    }
  }).catch((err) => {
    console.error('[EMAIL ERROR] Pre-fetch for booking email failed:', err);
  });

  return notificationPromise;
};

const sendCancellationNotification = async (io, ticket) => {
  const notificationPromise = createNotification(io, {
    userId: ticket.userId,
    ticketId: ticket.id,
    title: 'Ticket Cancelled',
    message: `Your ticket ${getCleanTicketNumber(ticket)} has been cancelled.`,
    type: 'queue_update',
  });

  const { User, Department } = require('../models');
  Promise.all([
    User.findByPk(ticket.userId),
    Department.findByPk(ticket.departmentId),
  ]).then(([user, department]) => {
    if (user && department) {
      const { sendCancellationEmail } = require('../services/email.service');
      sendCancellationEmail(user, department, ticket).catch((err) => {
        console.error('[EMAIL ERROR] Failed to send cancellation email:', err);
      });
    }
  }).catch((err) => {
    console.error('[EMAIL ERROR] Pre-fetch for cancellation email failed:', err);
  });

  return notificationPromise;
};

const sendCompletionNotification = async (io, ticket) => {
  const notificationPromise = createNotification(io, {
    userId: ticket.userId,
    ticketId: ticket.id,
    title: 'Visit Completed',
    message: 'Your visit has been completed.',
    type: 'completed',
  });

  const { User, Department } = require('../models');
  Promise.all([
    User.findByPk(ticket.userId),
    Department.findByPk(ticket.departmentId),
  ]).then(([user, department]) => {
    if (user && department) {
      const { sendCompletionEmail } = require('../services/email.service');
      sendCompletionEmail(user, department, ticket).catch((err) => {
        console.error('[EMAIL ERROR] Failed to send completion email:', err);
      });
    }
  }).catch((err) => {
    console.error('[EMAIL ERROR] Pre-fetch for completion email failed:', err);
  });

  return notificationPromise;
};

const sendServingNotification = async (io, ticket) => {
  return createNotification(io, {
    userId: ticket.userId,
    ticketId: ticket.id,
    title: 'Now Serving',
    message: 'You are now being served.',
    type: 'serving',
  });
};

const sendQueueReminderNotification = async (io, ticket, currentPosition) => {
  const notificationPromise = createNotification(io, {
    userId: ticket.userId,
    ticketId: ticket.id,
    title: 'Queue Reminder',
    message: 'Your turn is approaching. Please arrive at the hospital.',
    type: 'queue_update',
  });

  const { User, Department } = require('../models');
  Promise.all([
    User.findByPk(ticket.userId),
    Department.findByPk(ticket.departmentId),
  ]).then(([user, department]) => {
    if (user && department) {
      const { sendQueueReminderEmail } = require('../services/email.service');
      sendQueueReminderEmail(user, department, ticket, currentPosition).catch((err) => {
        console.error('[EMAIL ERROR] Failed to send queue reminder email:', err);
      });
    }
  }).catch((err) => {
    console.error('[EMAIL ERROR] Pre-fetch for queue reminder email failed:', err);
  });

  return notificationPromise;
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
        } else if (indexAfter === 3) {
          // Queue Reminder (3 patients ahead, i.e. 4th in queue)
          sendQueueReminderNotification(io, ticket, 4).catch((err) => {
            console.error('[NOTIFICATION ERROR] Async queue-reminder notification error:', err);
          });
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
  sendBookingNotification,
  sendCancellationNotification,
  sendCompletionNotification,
  sendServingNotification,
  sendQueueReminderNotification,
};

const sendRescheduleNotification = async (io, ticket, oldDepartmentId, oldPosition) => {
  try {
    const { User, Department } = require('../models');

    const [oldDept, newDept] = await Promise.all([
      Department.findByPk(oldDepartmentId),
      Department.findByPk(ticket.departmentId),
    ]);

    const oldDeptName = oldDept ? oldDept.name : 'Unknown Department';
    const newDeptName = newDept ? newDept.name : 'Unknown Department';
    const cleanTicket = getCleanTicketNumber(ticket);

    const message = `Your appointment (${cleanTicket}) has been rescheduled from ${oldDeptName} to ${newDeptName}.`;

    const notification = await createNotification(io, {
      userId: ticket.userId,
      ticketId: ticket.id,
      title: 'Appointment Rescheduled',
      message,
      type: 'queue_update',
    });

    if (io) {
      if (notification) {
        io.to(`user:${ticket.userId}`).emit('notification_created', notification);
      }
      io.to(`ticket_${ticket.id}`).emit('ticket_updated', ticket);
    }

    // Trigger async email sending (fire-and-forget)
    Promise.all([
      User.findByPk(ticket.userId),
      Ticket.findAll({
        where: { departmentId: ticket.departmentId, status: 'waiting' },
        order: [[sequelize.fn('COALESCE', sequelize.col('rescheduledAt'), sequelize.col('createdAt')), 'ASC']],
      })
    ]).then(([user, waitingTickets]) => {
      if (user) {
        const newPosition = waitingTickets.findIndex(t => t.id === ticket.id) + 1;
        const { sendRescheduleEmail } = require('../services/email.service');
        sendRescheduleEmail(user, oldDeptName, newDeptName, ticket, oldPosition, newPosition).catch((err) => {
          console.error('[EMAIL ERROR] Failed to send reschedule email:', err);
        });
      }
    }).catch((err) => {
      console.error('[EMAIL ERROR] Failed to load info for reschedule email:', err);
    });

    return notification;
  } catch (error) {
    console.error('[NOTIFICATION ERROR] Failed to send reschedule notification:', error);
    return null;
  }
};

module.exports = {
  createNotification,
  handleQueuePositionChanges,
  getCleanTicketNumber,
  sendBookingNotification,
  sendCancellationNotification,
  sendCompletionNotification,
  sendServingNotification,
  sendQueueReminderNotification,
  sendRescheduleNotification,
};
