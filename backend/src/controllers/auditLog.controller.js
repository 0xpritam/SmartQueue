const { Op } = require('sequelize');
const { AuditLog, User } = require('../models');

/**
 * Get all audit logs (Admin only)
 * Supports pagination, filtering, sorting, and searching.
 */
const getAuditLogs = async (req, res) => {
  try {
    // 1. Pagination validation & sanitization
    let page = parseInt(req.query.page, 10);
    if (isNaN(page) || page < 1) {
      page = 1;
    }

    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit < 1) {
      limit = 20;
    } else if (limit > 100) {
      limit = 100;
    }

    const offset = (page - 1) * limit;

    // 2. Build filter conditions
    const whereClause = {};
    const { action, role, userId, entityType, from, to, search } = req.query;

    if (action) {
      whereClause.action = action;
    }
    if (role) {
      whereClause.role = role;
    }
    if (userId) {
      whereClause.userId = userId;
    }
    if (entityType) {
      whereClause.entityType = entityType;
    }

    // Date range filtering on createdAt
    if (from || to) {
      whereClause.createdAt = {};
      if (from) {
        let fromDate = new Date(from);
        if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
          fromDate = new Date(`${from}T00:00:00.000Z`);
        }
        whereClause.createdAt[Op.gte] = fromDate;
      }
      if (to) {
        let toDate = new Date(to);
        if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
          toDate = new Date(`${to}T23:59:59.999Z`);
          if (isNaN(toDate.getTime())) {
            toDate = new Date(to);
          }
        }
        whereClause.createdAt[Op.lte] = toDate;
      }
    }

    // Search query matching description, action, or entityType
    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      whereClause[Op.or] = [
        { description: { [Op.like]: searchPattern } },
        { action: { [Op.like]: searchPattern } },
        { entityType: { [Op.like]: searchPattern } }
      ];
    }

    // 3. Sorting logic with whitelisted columns & graceful fallbacks
    const allowedSortColumns = [
      'id',
      'userId',
      'role',
      'action',
      'entityType',
      'entityId',
      'description',
      'ipAddress',
      'createdAt'
    ];
    const sortBy = req.query.sortBy;
    const sortOrder = req.query.sortOrder;

    const actualSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';
    let actualSortOrder = 'DESC';
    if (sortOrder) {
      const upperOrder = sortOrder.toUpperCase();
      if (upperOrder === 'ASC' || upperOrder === 'DESC') {
        actualSortOrder = upperOrder;
      }
    }

    // 4. Query Database
    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'] // Safe attributes only
        }
      ],
      limit,
      offset,
      order: [[actualSortBy, actualSortOrder]]
    });

    const totalPages = Math.ceil(count / limit) || 1;

    // Return the response matching the required Phase 2 layout
    return res.status(200).json({
      page,
      limit,
      total: count,
      pages: totalPages,
      logs
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get a single audit log by ID (Admin only)
 */
const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const auditLog = await AuditLog.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'] // Safe attributes only
        }
      ]
    });

    if (!auditLog) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
    }

    return res.status(200).json(auditLog);
  } catch (error) {
    console.error('Get audit log by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getAuditLogs,
  getAuditLogById
};
