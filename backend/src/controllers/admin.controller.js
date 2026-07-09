const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { sequelize, User, Department, Ticket, Notification } = require('../models');
const { emitAnalyticsUpdate } = require('./analytics.controller');
const { logAudit } = require('../utils/auditLogger');

// ==========================================
// ADMIN DASHBOARD API
// ==========================================
const getDashboardStats = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Core aggregations
    const totalPatients = await User.count({ where: { role: 'user' } });
    const totalStaff = await User.count({ where: { role: 'staff' } });
    const totalDepartments = await Department.count();

    const activeQueues = await Ticket.count({
      distinct: true,
      col: 'departmentId',
      where: {
        status: { [Op.in]: ['waiting', 'serving'] }
      }
    });

    const waitingTickets = await Ticket.count({ where: { status: 'waiting' } });
    const servingTickets = await Ticket.count({ where: { status: 'serving' } });

    const completedToday = await Ticket.count({
      where: {
        status: 'completed',
        updatedAt: { [Op.gte]: todayStart }
      }
    });

    const cancelledToday = await Ticket.count({
      where: {
        status: 'cancelled',
        updatedAt: { [Op.gte]: todayStart }
      }
    });

    // 2. Average wait time today (in minutes)
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
    const averageWaitTime = Math.round(avgWaitSeconds / 60);

    return res.status(200).json({
      success: true,
      data: {
        totalPatients,
        totalStaff,
        totalDepartments,
        activeQueues,
        waitingTickets,
        servingTickets,
        completedToday,
        cancelledToday,
        averageWaitTime
      }
    });
  } catch (error) {
    console.error('Get admin dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ==========================================
// DEPARTMENT MANAGEMENT
// ==========================================
const getDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      order: [['name', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      departments
    });
  } catch (error) {
    console.error('Admin get departments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required'
      });
    }

    const normalizedName = name.trim();
    const existingDept = await Department.findOne({
      where: { name: normalizedName }
    });

    if (existingDept) {
      return res.status(400).json({
        success: false,
        message: 'Department name must be unique'
      });
    }

    const department = await Department.create({
      name: normalizedName,
      description: description ? description.trim() : null
    });

    // Socket.IO updates
    const io = req.app.get('io');
    if (io) {
      io.emit('department_created', department);
      emitAnalyticsUpdate(io);
    }

    logAudit({
      userId: req.user.id,
      role: 'admin',
      action: 'CREATE_DEPARTMENT',
      entityType: 'Department',
      entityId: department.id,
      description: `Department "${department.name}" created`,
      ipAddress: req.ip,
      metadata: {
        name: department.name,
        description: department.description
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Department created successfully',
      department
    });
  } catch (error) {
    console.error('Create department error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required'
      });
    }

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const normalizedName = name.trim();
    const existingDept = await Department.findOne({
      where: {
        name: normalizedName,
        id: { [Op.ne]: id }
      }
    });

    if (existingDept) {
      return res.status(400).json({
        success: false,
        message: 'Department name must be unique'
      });
    }

    // Check validation if deactivating
    if (status === 'inactive' && department.status === 'active') {
      const waitingCount = await Ticket.count({ where: { departmentId: id, status: 'waiting' } });
      if (waitingCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate department with waiting tickets.'
        });
      }

      const servingCount = await Ticket.count({ where: { departmentId: id, status: 'serving' } });
      if (servingCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate department with serving/in-progress tickets.'
        });
      }

      const activeStaffCount = await User.count({
        where: { departmentId: id, role: 'staff', status: 'active' }
      });
      if (activeStaffCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate department with active staff members currently assigned.'
        });
      }
    }

    department.name = normalizedName;
    department.description = description ? description.trim() : null;
    if (status) department.status = status;

    await department.save();

    // Socket.IO updates
    const io = req.app.get('io');
    if (io) {
      io.emit('department_updated', department);
      if (status === 'inactive') {
        io.emit('department_disabled', department);
      }
      emitAnalyticsUpdate(io);
    }

    logAudit({
      userId: req.user.id,
      role: 'admin',
      action: 'UPDATE_DEPARTMENT',
      entityType: 'Department',
      entityId: department.id,
      description: `Department "${department.name}" updated`,
      ipAddress: req.ip,
      metadata: {
        name: department.name,
        description: department.description,
        status: department.status
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      department
    });
  } catch (error) {
    console.error('Update department error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Check validation for deactivation
    const waitingCount = await Ticket.count({ where: { departmentId: id, status: 'waiting' } });
    if (waitingCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate department with waiting tickets.'
      });
    }

    const servingCount = await Ticket.count({ where: { departmentId: id, status: 'serving' } });
    if (servingCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate department with serving/in-progress tickets.'
      });
    }

    const activeStaffCount = await User.count({
      where: { departmentId: id, role: 'staff', status: 'active' }
    });
    if (activeStaffCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate department with active staff members currently assigned.'
      });
    }

    department.status = 'inactive';
    await department.save();

    // Socket.IO updates
    const io = req.app.get('io');
    if (io) {
      io.emit('department_updated', department);
      io.emit('department_disabled', department);
      emitAnalyticsUpdate(io);
    }

    logAudit({
      userId: req.user.id,
      role: 'admin',
      action: 'DELETE_DEPARTMENT',
      entityType: 'Department',
      entityId: department.id,
      description: `Department "${department.name}" deactivated`,
      ipAddress: req.ip,
      metadata: {
        name: department.name,
        status: department.status
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Department deactivated successfully',
      department
    });
  } catch (error) {
    console.error('Delete department error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ==========================================
// STAFF MANAGEMENT
// ==========================================
const getStaff = async (req, res) => {
  try {
    const staff = await User.findAll({
      where: { role: 'staff' },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ],
      order: [['name', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      staff
    });
  } catch (error) {
    console.error('Admin get staff error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const createStaff = async (req, res) => {
  try {
    const { name, email, password, phone, age, departmentId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingEmailUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingEmailUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    let normalizedPhone = null;
    if (phone && phone.trim()) {
      normalizedPhone = phone.trim();
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(normalizedPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be exactly 10 digits and contain only numbers.'
        });
      }

      const existingPhoneUser = await User.findOne({ where: { phone: normalizedPhone } });
      if (existingPhoneUser) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already registered'
        });
      }
    }

    if (departmentId) {
      const dept = await Department.findByPk(departmentId);
      if (!dept) {
        return res.status(400).json({
          success: false,
          message: 'Selected department does not exist'
        });
      }
      if (dept.status === 'inactive') {
        return res.status(400).json({
          success: false,
          message: 'Cannot assign to an inactive department'
        });
      }
    }

    if (age !== undefined && age !== null && age !== '') {
      const parsedAge = parseInt(age, 10);
      if (isNaN(parsedAge) || parsedAge <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Age must be greater than 0'
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const staffUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: normalizedPhone,
      age: (age !== undefined && age !== null && age !== '') ? parseInt(age, 10) : null,
      role: 'staff',
      status: 'active',
      departmentId: departmentId || null
    });

    const userObj = staffUser.toJSON();
    delete userObj.password;

    // Fetch department association details for response
    if (departmentId) {
      userObj.department = await Department.findByPk(departmentId, { attributes: ['id', 'name'], raw: true });
    }

    // Socket.IO updates
    const io = req.app.get('io');
    if (io) {
      io.emit('staff_created', userObj);
      emitAnalyticsUpdate(io);
    }

    logAudit({
      userId: req.user.id,
      role: 'admin',
      action: 'CREATE_STAFF',
      entityType: 'User',
      entityId: staffUser.id,
      description: `Staff account for "${staffUser.name}" (${staffUser.email}) created`,
      ipAddress: req.ip,
      metadata: {
        name: staffUser.name,
        email: staffUser.email,
        departmentId: staffUser.departmentId
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Staff account created successfully',
      staff: userObj
    });
  } catch (error) {
    console.error('Create staff error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, age, departmentId, status, password } = req.body;

    const staffUser = await User.findOne({ where: { id, role: 'staff' } });
    if (!staffUser) {
      return res.status(404).json({
        success: false,
        message: 'Staff user not found'
      });
    }

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== staffUser.email) {
        const existingEmailUser = await User.findOne({
          where: { email: normalizedEmail, id: { [Op.ne]: id } }
        });
        if (existingEmailUser) {
          return res.status(400).json({
            success: false,
            message: 'Email already registered'
          });
        }
        staffUser.email = normalizedEmail;
      }
    }

    if (phone !== undefined) {
      const normalizedPhone = (phone && phone.trim()) ? phone.trim() : null;
      if (normalizedPhone && normalizedPhone !== staffUser.phone) {
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(normalizedPhone)) {
          return res.status(400).json({
            success: false,
            message: 'Phone number must be exactly 10 digits and contain only numbers.'
          });
        }

        const existingPhoneUser = await User.findOne({
          where: { phone: normalizedPhone, id: { [Op.ne]: id } }
        });
        if (existingPhoneUser) {
          return res.status(400).json({
            success: false,
            message: 'Phone number already registered'
          });
        }
      }
      staffUser.phone = normalizedPhone;
    }

    if (departmentId !== undefined) {
      if (departmentId) {
        const dept = await Department.findByPk(departmentId);
        if (!dept) {
          return res.status(400).json({
            success: false,
            message: 'Selected department does not exist'
          });
        }
        if (dept.status === 'inactive') {
          return res.status(400).json({
            success: false,
            message: 'Cannot assign to an inactive department'
          });
        }
      }
      staffUser.departmentId = departmentId || null;
    }

    if (age !== undefined) {
      if (age !== null && age !== '') {
        const parsedAge = parseInt(age, 10);
        if (isNaN(parsedAge) || parsedAge <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Age must be greater than 0'
          });
        }
        staffUser.age = parsedAge;
      } else {
        staffUser.age = null;
      }
    }

    if (name) staffUser.name = name.trim();
    if (status) staffUser.status = status;

    // Reset password placeholder support
    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters'
        });
      }
      staffUser.password = await bcrypt.hash(password, 10);
    }

    await staffUser.save();

    // Fetch complete staff profile including Department
    const updatedStaff = await User.findOne({
      where: { id },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ]
    });

    // Socket.IO updates
    const io = req.app.get('io');
    if (io) {
      io.emit('staff_updated', updatedStaff);
      emitAnalyticsUpdate(io);
    }

    logAudit({
      userId: req.user.id,
      role: 'admin',
      action: 'UPDATE_STAFF',
      entityType: 'User',
      entityId: staffUser.id,
      description: `Staff account for "${staffUser.name}" (${staffUser.email}) updated`,
      ipAddress: req.ip,
      metadata: {
        name: staffUser.name,
        email: staffUser.email,
        departmentId: staffUser.departmentId,
        status: staffUser.status
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Staff account updated successfully',
      staff: updatedStaff
    });
  } catch (error) {
    console.error('Update staff error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const staffUser = await User.findOne({ where: { id, role: 'staff' } });
    if (!staffUser) {
      return res.status(404).json({
        success: false,
        message: 'Staff user not found'
      });
    }

    // Soft delete: status = 'inactive'
    staffUser.status = 'inactive';
    await staffUser.save();

    const updatedStaff = await User.findOne({
      where: { id },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ]
    });

    // Socket.IO updates
    const io = req.app.get('io');
    if (io) {
      io.emit('staff_updated', updatedStaff);
      emitAnalyticsUpdate(io);
    }

    logAudit({
      userId: req.user.id,
      role: 'admin',
      action: 'DEACTIVATE_STAFF',
      entityType: 'User',
      entityId: staffUser.id,
      description: `Staff account for "${staffUser.name}" (${staffUser.email}) deactivated`,
      ipAddress: req.ip,
      metadata: {
        name: staffUser.name,
        email: staffUser.email,
        status: staffUser.status
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Staff account deactivated successfully',
      staff: updatedStaff
    });
  } catch (error) {
    console.error('Delete staff error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ==========================================
// PATIENT MANAGEMENT
// ==========================================
const getPatients = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const whereClause = { role: 'user' };

    if (search.trim()) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: patients } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      limit,
      offset,
      order: [['name', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      patients,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error('Admin get patients error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getPatientDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await User.findOne({
      where: { id, role: 'user' },
      attributes: { exclude: ['password'] }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Active tickets (waiting or serving)
    const activeTickets = await Ticket.findAll({
      where: {
        userId: id,
        status: { [Op.in]: ['waiting', 'serving'] }
      },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Completed visits
    const completedVisits = await Ticket.findAll({
      where: {
        userId: id,
        status: 'completed'
      },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] }
      ],
      order: [['updatedAt', 'DESC']]
    });

    // Cancelled appointments
    const cancelledAppointments = await Ticket.findAll({
      where: {
        userId: id,
        status: 'cancelled'
      },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] }
      ],
      order: [['updatedAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      patient,
      history: {
        activeTickets,
        completedVisits,
        cancelledAppointments
      }
    });
  } catch (error) {
    console.error('Admin get patient details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ==========================================
// SYSTEM STATISTICS
// ==========================================
const getSystemStatistics = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - 1);
    monthStart.setHours(0, 0, 0, 0);

    // 1. Appointment Counts
    const appointmentsToday = await Ticket.count({
      where: { createdAt: { [Op.gte]: todayStart } }
    });

    const appointmentsThisWeek = await Ticket.count({
      where: { createdAt: { [Op.gte]: weekStart } }
    });

    const appointmentsThisMonth = await Ticket.count({
      where: { createdAt: { [Op.gte]: monthStart } }
    });

    // 2. Department Distribution & Most Active Department
    const departmentCounts = await Ticket.findAll({
      attributes: [
        'departmentId',
        [sequelize.fn('COUNT', sequelize.col('Ticket.id')), 'count']
      ],
      group: ['departmentId'],
      include: [
        { model: Department, as: 'department', attributes: ['name'] }
      ],
      raw: true
    });

    let mostActiveDepartmentName = 'N/A';
    let maxCount = -1;
    const departmentDistribution = [];

    departmentCounts.forEach(item => {
      const deptName = item['department.name'] || 'Unknown';
      const count = parseInt(item.count || 0, 10);
      departmentDistribution.push({
        departmentName: deptName,
        count
      });

      if (count > maxCount) {
        maxCount = count;
        mostActiveDepartmentName = deptName;
      }
    });

    // 3. Average Wait Time (all-time)
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
        calledAt: { [Op.ne]: null }
      },
      raw: true
    });
    const avgWaitSeconds = avgWaitResult ? parseFloat(avgWaitResult.avgWait || 0) : 0;
    const averageWaitingTime = Math.round(avgWaitSeconds / 60);

    // 4. Average Service Time (all-time)
    const avgServiceResult = await Ticket.findOne({
      attributes: [
        [
          sequelize.fn(
            'AVG',
            sequelize.literal(
              sequelize.options.dialect === 'sqlite'
                ? "strftime('%s', Ticket.updatedAt) - strftime('%s', Ticket.calledAt)"
                : "TIMESTAMPDIFF(SECOND, Ticket.calledAt, Ticket.updatedAt)"
            )
          ),
          'avgService'
        ]
      ],
      where: {
        status: 'completed',
        calledAt: { [Op.ne]: null }
      },
      raw: true
    });
    const avgServiceSeconds = avgServiceResult ? parseFloat(avgServiceResult.avgService || 0) : 0;
    const averageServiceTime = Math.round(avgServiceSeconds / 60);

    // 5. Peak Hours (Creation hour distribution)
    let peakHours = [];
    if (sequelize.options.dialect === 'sqlite') {
      peakHours = await Ticket.findAll({
        attributes: [
          [sequelize.literal("strftime('%H', createdAt)"), 'hour'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: [sequelize.literal("strftime('%H', createdAt)")],
        order: [[sequelize.literal("strftime('%H', createdAt)"), 'ASC']],
        raw: true
      });
    } else {
      peakHours = await Ticket.findAll({
        attributes: [
          [sequelize.literal("HOUR(createdAt)"), 'hour'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: [sequelize.literal("HOUR(createdAt)")],
        order: [[sequelize.literal("HOUR(createdAt)"), 'ASC']],
        raw: true
      });
    }

    const processedPeakHours = peakHours.map(item => ({
      hour: parseInt(item.hour || 0, 10),
      count: parseInt(item.count || 0, 10)
    }));

    return res.status(200).json({
      success: true,
      data: {
        appointmentsToday,
        appointmentsThisWeek,
        appointmentsThisMonth,
        mostActiveDepartment: mostActiveDepartmentName,
        averageWaitingTime,
        averageServiceTime,
        peakHours: processedPeakHours,
        departmentDistribution
      }
    });
  } catch (error) {
    console.error('Get system statistics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getDashboardStats,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  getPatients,
  getPatientDetails,
  getSystemStatistics
};
