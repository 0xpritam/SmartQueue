const { Ticket, Department } = require('../models');
const { Op } = require('sequelize');

// GET /api/predictions/:ticketId
const getPrediction = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    const departmentId = ticket.departmentId;

    // Fetch all completed tickets in the department to compute historical average consultation time
    const completedTickets = await Ticket.findAll({
      where: {
        departmentId,
        status: 'completed',
        completedAt: {
          [Op.ne]: null
        },
        [Op.or]: [
          { servingStartTime: { [Op.ne]: null } },
          { calledAt: { [Op.ne]: null } }
        ]
      }
    });

    let averageConsultationTime = 8; // fallback
    const historyCount = completedTickets.length;

    if (historyCount >= 10) {
      let totalDurationMs = 0;
      completedTickets.forEach((t) => {
        const start = t.servingStartTime || t.calledAt;
        const end = t.completedAt;
        const diff = new Date(end).getTime() - new Date(start).getTime();
        if (diff > 0) {
          totalDurationMs += diff;
        }
      });
      const avgMs = totalDurationMs / historyCount;
      averageConsultationTime = Math.max(1, Math.round(avgMs / 60000));
    }

    // Calculate queuePosition and patientsAhead if ticket is waiting
    let queuePosition = 0;
    let patientsAhead = 0;

    if (ticket.status === 'waiting') {
      const waitingTickets = await Ticket.findAll({
        where: { departmentId, status: 'waiting' },
        order: [['createdAt', 'ASC']]
      });

      waitingTickets.sort((a, b) => {
        const timeA = a.rescheduledAt || a.createdAt;
        const timeB = b.rescheduledAt || b.createdAt;
        return new Date(timeA) - new Date(timeB);
      });

      const idx = waitingTickets.findIndex((t) => t.id === ticket.id);
      if (idx !== -1) {
        queuePosition = idx + 1;
        patientsAhead = idx;
      }
    } else if (ticket.status === 'serving') {
      queuePosition = 0;
      patientsAhead = 0;
    }

    const estimatedWaitMinutes = patientsAhead * averageConsultationTime;

    let confidence = 'Low';
    if (historyCount >= 30) {
      confidence = 'High';
    } else if (historyCount >= 10) {
      confidence = 'Medium';
    }

    return res.status(200).json({
      success: true,
      ticketId,
      queuePosition,
      patientsAhead,
      averageConsultationTime,
      estimatedWaitMinutes,
      confidence,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get queue prediction error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = {
  getPrediction
};
