const { Ticket, Department, sequelize } = require('../models');

// ==========================================
// GET CURRENT SERVING TICKET
// ==========================================
const getCurrentServing = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    const ticket = await Ticket.findOne({
      where: { departmentId, status: 'serving' },
      order: [['updatedAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      ticket: ticket || null,
    });
  } catch (error) {
    console.error('Get current serving error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ==========================================
// MOVE NEXT WAITING TICKET TO SERVING
// ==========================================
const callNext = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    const nextTicket = await sequelize.transaction(async (t) => {
      // Complete the currently serving ticket
      const currentServing = await Ticket.findOne({
        where: { departmentId, status: 'serving' },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (currentServing) {
        currentServing.status = 'completed';
        await currentServing.save({ transaction: t });
      }

      // Promote next waiting ticket with row lock
      const ticket = await Ticket.findOne({
        where: { departmentId, status: 'waiting' },
        order: [['createdAt', 'ASC']],
        transaction: t,
        lock: t.LOCK.UPDATE,
        skipLocked: true,
      });
      if (!ticket) return null;

      ticket.status = 'serving';
      await ticket.save({ transaction: t });
      return ticket;
    });

    if (!nextTicket) {
      return res.status(404).json({
        success: false,
        message: 'No waiting tickets',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Next ticket is now being served',
      ticket: nextTicket,
    });
  } catch (error) {
    console.error('Call next error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ==========================================
// GET WAITING TICKETS
// ==========================================
const getWaiting = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    const tickets = await Ticket.findAll({
      where: { departmentId, status: 'waiting' },
      order: [['createdAt', 'ASC']],
    });

    return res.status(200).json({
      success: true,
      tickets,
    });
  } catch (error) {
    console.error('Get waiting error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = {
  getCurrentServing,
  callNext,
  getWaiting,
};
