const { Ticket, Department } = require('../models');

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

    const nextTicket = await Ticket.findOne({
      where: { departmentId, status: 'waiting' },
      order: [['createdAt', 'ASC']],
    });

    if (!nextTicket) {
      return res.status(404).json({
        success: false,
        message: 'No waiting tickets',
      });
    }

    nextTicket.status = 'serving';
    await nextTicket.save();

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
