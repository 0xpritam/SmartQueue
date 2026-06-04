const { Ticket } = require('../models');

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

    ticket.status = 'serving';
    await ticket.save();

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
