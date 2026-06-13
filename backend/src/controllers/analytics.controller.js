const { User, Ticket, Department, Notification } = require('../models');
const { Op } = require('sequelize');

// Helper to check if user has admin/staff role
const checkStaffRole = async (userId) => {
  const user = await User.findByPk(userId);
  return user && user.role === 'admin';
};

// ==========================================
// GET OVERVIEW METRICS
// ==========================================
const getOverview = async (req, res) => {
  try {
    const isStaff = await checkStaffRole(req.user.id);
    if (!isStaff) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Staff only.',
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Total patients today (tickets created today)
    const totalPatientsToday = await Ticket.count({
      where: {
        createdAt: {
          [Op.gte]: todayStart,
        },
      },
    });

    // 2. Active queues (unique departments with waiting/serving tickets)
    const activeQueues = await Ticket.count({
      distinct: true,
      col: 'departmentId',
      where: {
        status: {
          [Op.in]: ['waiting', 'serving'],
        },
      },
    });

    // 3. Completed visits today (tickets completed today)
    const completedVisitsToday = await Ticket.count({
      where: {
        status: 'completed',
        updatedAt: {
          [Op.gte]: todayStart,
        },
      },
    });

    // 4. Average wait time today (in minutes)
    const ticketsServedToday = await Ticket.findAll({
      where: {
        status: {
          [Op.in]: ['serving', 'completed'],
        },
        updatedAt: {
          [Op.gte]: todayStart,
        },
      },
    });

    const ticketIds = ticketsServedToday.map((t) => t.id);
    const notifications = await Notification.findAll({
      where: {
        ticketId: {
          [Op.in]: ticketIds,
        },
        type: 'serving',
      },
    });

    const notifMap = new Map(notifications.map((n) => [n.ticketId, n.createdAt]));

    let totalWaitMs = 0;
    let validWaitCount = 0;

    ticketsServedToday.forEach((t) => {
      const servedAt = notifMap.get(t.id);
      let waitMs = null;

      if (servedAt) {
        waitMs = new Date(servedAt) - new Date(t.createdAt);
      } else if (t.status === 'serving') {
        // If it's serving and notification is missing, updatedAt is the transition time
        waitMs = new Date(t.updatedAt) - new Date(t.createdAt);
      }
      // If completed and serving notification is missing, exclude it from wait time calculation

      if (waitMs !== null && waitMs >= 0) {
        totalWaitMs += waitMs;
        validWaitCount++;
      }
    });

    const avgWaitTime = validWaitCount > 0 ? Math.round(totalWaitMs / validWaitCount / 60000) : 0;

    // 5. Ticket status distribution (all-time counts for pie chart)
    const statusDistribution = {
      waiting: await Ticket.count({ where: { status: 'waiting' } }),
      serving: await Ticket.count({ where: { status: 'serving' } }),
      completed: await Ticket.count({ where: { status: 'completed' } }),
      cancelled: await Ticket.count({ where: { status: 'cancelled' } }),
    };

    return res.status(200).json({
      success: true,
      data: {
        totalPatientsToday,
        activeQueues,
        completedVisitsToday,
        avgWaitTime,
        statusDistribution,
      },
    });
  } catch (error) {
    console.error('Get overview metrics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ==========================================
// GET DEPARTMENT ANALYTICS
// ==========================================
const getDepartmentsAnalytics = async (req, res) => {
  try {
    const isStaff = await checkStaffRole(req.user.id);
    if (!isStaff) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Staff only.',
      });
    }

    const departments = await Department.findAll();
    const tickets = await Ticket.findAll({
      where: {
        status: {
          [Op.in]: ['serving', 'completed'],
        },
      },
    });

    const ticketIds = tickets.map((t) => t.id);
    const notifications = await Notification.findAll({
      where: {
        ticketId: {
          [Op.in]: ticketIds,
        },
        type: 'serving',
      },
    });

    const notifMap = new Map(notifications.map((n) => [n.ticketId, n.createdAt]));

    const deptData = departments.map((dept) => {
      const deptTickets = tickets.filter((t) => t.departmentId === dept.id);
      const patientsServed = deptTickets.filter((t) => t.status === 'completed').length;

      let totalWaitMs = 0;
      let validWaitCount = 0;

      deptTickets.forEach((t) => {
        const servedAt = notifMap.get(t.id);
        let waitMs = null;

        if (servedAt) {
          waitMs = new Date(servedAt) - new Date(t.createdAt);
        } else if (t.status === 'serving') {
          waitMs = new Date(t.updatedAt) - new Date(t.createdAt);
        }

        if (waitMs !== null && waitMs >= 0) {
          totalWaitMs += waitMs;
          validWaitCount++;
        }
      });

      const avgWaitTime = validWaitCount > 0 ? Math.round(totalWaitMs / validWaitCount / 60000) : 0;

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        patientsServed,
        avgWaitTime,
      };
    });

    return res.status(200).json({
      success: true,
      data: deptData,
    });
  } catch (error) {
    console.error('Get department analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ==========================================
// GET TRENDS (LAST 7 DAYS)
// ==========================================
const getTrends = async (req, res) => {
  try {
    const isStaff = await checkStaffRole(req.user.id);
    if (!isStaff) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Staff only.',
      });
    }

    const trends = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const ticketsLast7Days = await Ticket.findAll({
      where: {
        createdAt: {
          [Op.gte]: sevenDaysAgo,
        },
      },
    });

    const completedTicketsLast7Days = await Ticket.findAll({
      where: {
        status: 'completed',
        updatedAt: {
          [Op.gte]: sevenDaysAgo,
        },
      },
    });

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const startOfDay = new Date(d);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);

      const registered = ticketsLast7Days.filter((t) => {
        const created = new Date(t.createdAt);
        return created >= startOfDay && created <= endOfDay;
      }).length;

      const completed = completedTicketsLast7Days.filter((t) => {
        const updated = new Date(t.updatedAt);
        return updated >= startOfDay && updated <= endOfDay;
      }).length;

      trends.push({
        date: dateStr,
        registered,
        completed,
      });
    }

    return res.status(200).json({
      success: true,
      data: trends,
    });
  } catch (error) {
    console.error('Get trends error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = {
  getOverview,
  getDepartmentsAnalytics,
  getTrends,
};
