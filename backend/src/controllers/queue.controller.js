const { Ticket } = require('../models');
const { createNotification, handleQueuePositionChanges } = require('../utils/notification');

const getCurrentTicket = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const ticket = await Ticket.findOne({
      where: { departmentId, status: 'serving' },
      order: [['createdAt', 'ASC']],
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'No current ticket is being served',
      });
    }

    return res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Get current ticket error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

const getWaitingTickets = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const tickets = await Ticket.findAll({
      where: { departmentId, status: 'waiting' },
      order: [['createdAt', 'ASC']],
    });

    return res.status(200).json({
      success: true,
      tickets,
    });
  } catch (error) {
    console.error('Get waiting tickets error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

const callNextPatient = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const ticket = await Ticket.findOne({
      where: { departmentId, status: 'waiting' },
      order: [['createdAt', 'ASC']],
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'No waiting tickets found for this department',
      });
    }

    // Fetch wait-listed tickets before the change to compute queue updates
    const ticketsBefore = await Ticket.findAll({
      where: { departmentId, status: 'waiting' },
      order: [['createdAt', 'ASC']],
    });

    ticket.status = 'serving';
    ticket.calledAt = new Date();
    await ticket.save();

    // Emit socket updates
    const io = req.app?.get?.('io');
    if (io) {
      io.to(`ticket_${ticket.id}`).emit('ticket_updated', ticket);
      io.to(`department_${departmentId}`).emit('queue_updated', { departmentId });

      // Trigger socket analytics update
      const { emitAnalyticsUpdate } = require('./analytics.controller');
      emitAnalyticsUpdate(io);

      // Run queue shift calculation asynchronously
      Ticket.findAll({
        where: { departmentId, status: 'waiting' },
        order: [['createdAt', 'ASC']],
      }).then((ticketsAfter) => {
        handleQueuePositionChanges(io, departmentId, ticketsBefore, ticketsAfter);
      }).catch((err) => console.error('[NOTIFICATION ERROR] Fetching ticketsAfter failed:', err));

      // Asynchronously send status change notification to this user
      createNotification(io, {
        userId: ticket.userId,
        ticketId: ticket.id,
        title: 'Now Serving',
        message: 'You are now being served.',
        type: 'serving',
      }).catch((err) => console.error('[NOTIFICATION ERROR] Status update notification failed:', err));
    }

    return res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Call next patient error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

const completeCurrentPatient = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const ticket = await Ticket.findOne({
      where: { departmentId, status: 'serving' },
      order: [['createdAt', 'ASC']],
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'No currently serving ticket found for this department',
      });
    }

    ticket.status = 'completed';
    await ticket.save();

    // Emit socket updates
    const io = req.app?.get?.('io');
    if (io) {
      io.to(`ticket_${ticket.id}`).emit('ticket_updated', ticket);
      io.to(`department_${departmentId}`).emit('queue_updated', { departmentId });

      // Trigger socket analytics update
      const { emitAnalyticsUpdate } = require('./analytics.controller');
      emitAnalyticsUpdate(io);

      // Asynchronously send status change notification to this user
      createNotification(io, {
        userId: ticket.userId,
        ticketId: ticket.id,
        title: 'Visit Completed',
        message: 'Your visit has been completed.',
        type: 'completed',
      }).catch((err) => console.error('[NOTIFICATION ERROR] Status update notification failed:', err));
    }

    return res.status(200).json({
      success: true,
      message: 'Current patient completed successfully',
      ticket,
    });
  } catch (error) {
    console.error('Complete current patient error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = {
  getCurrentTicket,
  getWaitingTickets,
  callNextPatient,
  completeCurrentPatient,
};
