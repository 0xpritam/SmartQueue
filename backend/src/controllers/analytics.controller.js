const { sequelize, User, Ticket, Department, Notification } = require('../models');
const { Op } = require('sequelize');

// Helper to check if user has admin/staff role
const checkStaffRole = async (userId) => {
  const user = await User.findByPk(userId);
  return user && (user.role === 'admin' || user.role === 'staff');
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

    // 5. Extended analytics dashboard metrics
    const completedTickets = await Ticket.findAll({
      where: {
        status: 'completed',
        completedAt: { [Op.ne]: null },
        [Op.or]: [
          { servingStartTime: { [Op.ne]: null } },
          { calledAt: { [Op.ne]: null } }
        ]
      }
    });

    let avgConsultationTime = 0;
    if (completedTickets.length > 0) {
      let totalMs = 0;
      completedTickets.forEach(t => {
        const start = t.servingStartTime || t.calledAt;
        const end = t.completedAt;
        totalMs += (new Date(end) - new Date(start));
      });
      avgConsultationTime = Math.round(totalMs / completedTickets.length / 60000);
    }

    const depts = await Department.findAll();
    const deptConsultationTimes = [];
    for (const dept of depts) {
      const deptCompleted = completedTickets.filter(t => t.departmentId === dept.id);
      if (deptCompleted.length > 0) {
        let totalMs = 0;
        deptCompleted.forEach(t => {
          const start = t.servingStartTime || t.calledAt;
          const end = t.completedAt;
          totalMs += (new Date(end) - new Date(start));
        });
        const avg = Math.round(totalMs / deptCompleted.length / 60000);
        deptConsultationTimes.push({ name: dept.name, avgTime: avg });
      }
    }

    let fastestDepartment = 'N/A';
    let slowestDepartment = 'N/A';
    if (deptConsultationTimes.length > 0) {
      deptConsultationTimes.sort((a, b) => a.avgTime - b.avgTime);
      fastestDepartment = `${deptConsultationTimes[0].name} (${deptConsultationTimes[0].avgTime}m)`;
      slowestDepartment = `${deptConsultationTimes[deptConsultationTimes.length - 1].name} (${deptConsultationTimes[deptConsultationTimes.length - 1].avgTime}m)`;
    }

    const allServedTickets = await Ticket.findAll({
      where: {
        status: ['serving', 'completed'],
      }
    });
    const allNotifications = await Notification.findAll({
      where: {
        type: 'serving',
      }
    });
    const allNotifMap = new Map(allNotifications.map(n => [n.ticketId, n.createdAt]));
    let totalAllWaitMs = 0;
    let validAllWaitCount = 0;
    allServedTickets.forEach(t => {
      const servedAt = allNotifMap.get(t.id);
      let waitMs = null;
      if (servedAt) {
        waitMs = new Date(servedAt) - new Date(t.createdAt);
      } else {
        waitMs = new Date(t.updatedAt) - new Date(t.createdAt);
      }
      if (waitMs !== null && waitMs >= 0) {
        totalAllWaitMs += waitMs;
        validAllWaitCount++;
      }
    });
    const avgDailyWaitTime = validAllWaitCount > 0 ? Math.round(totalAllWaitMs / validAllWaitCount / 60000) : 0;

    // 6. Ticket status distribution (all-time counts for pie chart)
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
        avgConsultationTime,
        fastestDepartment,
        slowestDepartment,
        avgDailyWaitTime
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

const calculateDashboardData = async () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 1. Core aggregate counts
  const totalTicketsToday = await Ticket.count({
    where: {
      createdAt: { [Op.gte]: todayStart }
    }
  });

  const waiting = await Ticket.count({
    where: { status: 'waiting' }
  });

  const inProgress = await Ticket.count({
    where: { status: 'serving' }
  });

  const completed = await Ticket.count({
    where: {
      status: 'completed',
      updatedAt: { [Op.gte]: todayStart }
    }
  });

  const cancelled = await Ticket.count({
    where: {
      status: 'cancelled',
      updatedAt: { [Op.gte]: todayStart }
    }
  });

  // 2. Average waiting time today (in minutes) using SQL aggregates on Ticket model
  // Wait time = calledAt - createdAt (for tickets that were called to be served, and called today)
  const avgWaitResult = await Ticket.findOne({
    attributes: [
      [
        sequelize.fn(
          'AVG',
          sequelize.literal(
            sequelize.options.dialect === 'sqlite'
              ? "strftime('%s', Ticket.calledAt) - strftime('%s', Ticket.createdAt)"
              : "TIMESTAMPDIFF(SECOND, Ticket.createdAt, Ticket.calledAt)"
          )
        ),
        'avgWait'
      ]
    ],
    where: {
      calledAt: { [Op.gte]: todayStart }
    },
    raw: true
  });

  const avgWaitSeconds = avgWaitResult ? parseFloat(avgWaitResult.avgWait || 0) : 0;
  const averageWaitingTime = Math.round(avgWaitSeconds / 60);

  // 3. Departments summary
  const depts = await Department.findAll({
    attributes: ['id', 'name'],
    raw: true
  });

  // Count waiting tickets per department
  const waitingCounts = await Ticket.findAll({
    attributes: [
      'departmentId',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    where: { status: 'waiting' },
    group: ['departmentId'],
    raw: true
  });

  // Count completed tickets today per department
  const completedTodayCounts = await Ticket.findAll({
    attributes: [
      'departmentId',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    where: {
      status: 'completed',
      updatedAt: { [Op.gte]: todayStart }
    },
    group: ['departmentId'],
    raw: true
  });

  const waitingMap = new Map(waitingCounts.map(item => [item.departmentId, parseInt(item.count || 0, 10)]));
  const completedTodayMap = new Map(completedTodayCounts.map(item => [item.departmentId, parseInt(item.count || 0, 10)]));

  const departments = depts.map(d => ({
    departmentId: d.id,
    departmentName: d.name,
    waiting: waitingMap.get(d.id) || 0,
    completedToday: completedTodayMap.get(d.id) || 0
  }));

  // 4. Extended dashboard metrics
  let avgConsultationTime = 0;
  let fastestDepartment = 'N/A';
  let slowestDepartment = 'N/A';
  let avgDailyWaitTime = 0;

  try {
    const completedTickets = await Ticket.findAll({
      where: {
        status: 'completed',
        completedAt: { [Op.ne]: null },
        [Op.or]: [
          { servingStartTime: { [Op.ne]: null } },
          { calledAt: { [Op.ne]: null } }
        ]
      }
    });

    if (completedTickets.length > 0) {
      let totalMs = 0;
      completedTickets.forEach(t => {
        const start = t.servingStartTime || t.calledAt;
        const end = t.completedAt;
        if (start && end) {
          totalMs += (new Date(end) - new Date(start));
        }
      });
      avgConsultationTime = Math.round(totalMs / completedTickets.length / 60000);
    }

    const deptConsultationTimes = [];
    for (const dept of depts) {
      const deptCompleted = completedTickets.filter(t => t.departmentId === dept.id);
      if (deptCompleted.length > 0) {
        let totalMs = 0;
        deptCompleted.forEach(t => {
          const start = t.servingStartTime || t.calledAt;
          const end = t.completedAt;
          if (start && end) {
            totalMs += (new Date(end) - new Date(start));
          }
        });
        const avg = Math.round(totalMs / deptCompleted.length / 60000);
        deptConsultationTimes.push({ name: dept.name, avgTime: avg });
      }
    }

    if (deptConsultationTimes.length > 0) {
      deptConsultationTimes.sort((a, b) => a.avgTime - b.avgTime);
      fastestDepartment = `${deptConsultationTimes[0].name} (${deptConsultationTimes[0].avgTime}m)`;
      slowestDepartment = `${deptConsultationTimes[deptConsultationTimes.length - 1].name} (${deptConsultationTimes[deptConsultationTimes.length - 1].avgTime}m)`;
    }

    const allServedTickets = await Ticket.findAll({
      where: {
        status: ['serving', 'completed'],
      }
    });

    if (typeof Notification !== 'undefined' && Notification) {
      const allNotifications = await Notification.findAll({
        where: {
          type: 'serving',
        }
      });
      const allNotifMap = new Map(allNotifications.map(n => [n.ticketId, n.createdAt]));
      let totalAllWaitMs = 0;
      let validAllWaitCount = 0;
      allServedTickets.forEach(t => {
        const servedAt = allNotifMap.get(t.id);
        let waitMs = null;
        if (servedAt) {
          waitMs = new Date(servedAt) - new Date(t.createdAt);
        } else {
          waitMs = new Date(t.updatedAt) - new Date(t.createdAt);
        }
        if (waitMs !== null && waitMs >= 0) {
          totalAllWaitMs += waitMs;
          validAllWaitCount++;
        }
      });
      avgDailyWaitTime = validAllWaitCount > 0 ? Math.round(totalAllWaitMs / validAllWaitCount / 60000) : 0;
    }
  } catch (err) {
    console.error('Extended metrics calculation error:', err);
  }

  return {
    totalTicketsToday,
    waiting,
    inProgress,
    completed,
    cancelled,
    averageWaitingTime,
    departments,
    avgConsultationTime,
    fastestDepartment,
    slowestDepartment,
    avgDailyWaitTime
  };
};

const getDashboard = async (req, res) => {
  try {
    const isStaff = await checkStaffRole(req.user.id);
    if (!isStaff) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Staff only.',
      });
    }

    const data = await calculateDashboardData();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

const emitAnalyticsUpdate = async (io) => {
  if (!io) return;
  try {
    const data = await calculateDashboardData();
    io.emit('analytics_updated', { success: true, data });
  } catch (error) {
    console.error('Emit analytics update error:', error);
  }
};

module.exports = {
  getOverview,
  getDepartmentsAnalytics,
  getTrends,
  getDashboard,
  emitAnalyticsUpdate,
};
