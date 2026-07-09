const { Op } = require('sequelize');
const { AuditLog, User } = require('../models');
const PDFDocument = require('pdfkit');

/**
 * Helper to build filter query matching getAuditLogs controller
 */
const buildFilterClause = (query) => {
  const whereClause = {};
  const { action, role, userId, entityType, from, to, search } = query;

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

  // Date range filtering
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

  // Search logic
  if (search && search.trim()) {
    const searchPattern = `%${search.trim()}%`;
    whereClause[Op.or] = [
      { description: { [Op.like]: searchPattern } },
      { action: { [Op.like]: searchPattern } },
      { entityType: { [Op.like]: searchPattern } }
    ];
  }

  return whereClause;
};

/**
 * Helper to build sorting options matching getAuditLogs controller
 */
const buildSortOrder = (query) => {
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
  const sortBy = query.sortBy;
  const sortOrder = query.sortOrder;

  const actualSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';
  let actualSortOrder = 'DESC';
  if (sortOrder) {
    const upperOrder = sortOrder.toUpperCase();
    if (upperOrder === 'ASC' || upperOrder === 'DESC') {
      actualSortOrder = upperOrder;
    }
  }

  return [[actualSortBy, actualSortOrder]];
};

/**
 * Export audit logs as CSV
 */
const exportAuditLogsCSV = async (req, res) => {
  try {
    const whereClause = buildFilterClause(req.query);
    const order = buildSortOrder(req.query);

    // Fetch all logs matching active filter criteria
    const logs = await AuditLog.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ],
      order
    });

    const headers = [
      'Timestamp',
      'User Name',
      'User Email',
      'Role',
      'Action',
      'Entity Type',
      'Entity ID',
      'Description',
      'IP Address',
      'Metadata'
    ];

    // Helper to safely format CSV values and handle quotes/escape characters
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      // Double quotes are doubled for escaping in CSV
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    };

    // Prepend UTF-8 BOM to ensure Excel opens file with correct encoding
    let csvContent = '\uFEFF';
    csvContent += headers.join(',') + '\n';

    logs.forEach((log) => {
      const row = [
        log.createdAt ? new Date(log.createdAt).toISOString() : '',
        log.user ? log.user.name : '',
        log.user ? log.user.email : '',
        log.role || '',
        log.action,
        log.entityType || '',
        log.entityId || '',
        log.description || '',
        log.ipAddress || '',
        log.metadata ? JSON.stringify(log.metadata) : ''
      ];
      csvContent += row.map(escapeCSV).join(',') + '\n';
    });

    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10) + '-' + now.toTimeString().slice(0, 5).replace(':', '');
    const filename = `audit-logs-${formattedDate}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export audit logs to CSV error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Export audit logs as PDF
 */
const exportAuditLogsPDF = async (req, res) => {
  try {
    const whereClause = buildFilterClause(req.query);
    const order = buildSortOrder(req.query);

    // 1. Fetch matching logs
    const logs = await AuditLog.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ],
      order
    });

    // 2. Fetch admin user context info for report footer/header details
    let requesterDetails = 'System / Admin';
    if (req.user && req.user.id) {
      const requester = await User.findByPk(req.user.id);
      if (requester) {
        requesterDetails = `${requester.name} (${requester.email})`;
      }
    }

    // Compile active filters summary
    const filterParts = [];
    const { action, role, entityType, from, to, search, sortBy, sortOrder } = req.query;
    if (search) filterParts.push(`Search: "${search}"`);
    if (action) filterParts.push(`Action: "${action}"`);
    if (role) filterParts.push(`Role: "${role}"`);
    if (entityType) filterParts.push(`Entity: "${entityType}"`);
    if (from) filterParts.push(`From: "${from}"`);
    if (to) filterParts.push(`To: "${to}"`);
    if (sortBy) filterParts.push(`Sorted By: ${sortBy} (${sortOrder || 'DESC'})`);
    const filtersSummary = filterParts.length > 0 ? filterParts.join(', ') : 'None';

    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10) + '-' + now.toTimeString().slice(0, 5).replace(':', '');
    const filename = `audit-logs-${formattedDate}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    // 3. Initialize PDF document
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(res);

    // Draw Report Title & Header
    doc.fillColor('#1e293b').fontSize(16).font('Helvetica-Bold').text('SmartQueue - Enterprise Audit Log Report');
    doc.moveDown(0.4);

    // Divider line
    doc.lineWidth(1).strokeColor('#cbd5e1').moveTo(30, doc.y).lineTo(565, doc.y).stroke();
    doc.moveDown(0.6);

    // Metadata details
    doc.fillColor('#475569').fontSize(8.5).font('Helvetica');
    doc.text(`Generated At: ${new Date().toLocaleString()}`);
    doc.text(`Generated By: ${requesterDetails}`);
    doc.text(`Applied Filters: ${filtersSummary}`);
    doc.moveDown(1.5);

    // Columns config (Widths sum to content width 535)
    const colWidths = {
      time: 90,
      user: 80,
      role: 45,
      action: 95,
      entity: 85,
      desc: 140
    };
    const startX = 30;
    let currentY = doc.y;

    // Draw Table Header
    doc.rect(startX, currentY, 535, 18).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
    
    doc.text('Time', startX + 5, currentY + 5, { width: colWidths.time - 10 });
    doc.text('User', startX + 95, currentY + 5, { width: colWidths.user - 10 });
    doc.text('Role', startX + 175, currentY + 5, { width: colWidths.role - 5 });
    doc.text('Action', startX + 225, currentY + 5, { width: colWidths.action - 10 });
    doc.text('Entity', startX + 325, currentY + 5, { width: colWidths.entity - 10 });
    doc.text('Description', startX + 415, currentY + 5, { width: colWidths.desc - 10 });

    currentY += 18;

    // Draw Table Rows
    for (const log of logs) {
      const timeText = log.createdAt ? new Date(log.createdAt).toLocaleString() : '';
      const userText = log.user ? `${log.user.name}\n${log.user.email}` : 'System';
      const roleText = log.role || 'n/a';
      const actionText = log.action || '';
      const entityText = log.entityType ? `${log.entityType}${log.entityId ? `\n[${log.entityId}]` : ''}` : 'n/a';
      const descText = log.description || '';

      // Determine heights of wrapping cells
      doc.font('Helvetica').fontSize(6.5);
      const timeHeight = doc.heightOfString(timeText, { width: colWidths.time - 10 });
      const userHeight = doc.heightOfString(userText, { width: colWidths.user - 10 });
      const roleHeight = doc.heightOfString(roleText, { width: colWidths.role - 5 });
      const actionHeight = doc.heightOfString(actionText, { width: colWidths.action - 10 });
      const entityHeight = doc.heightOfString(entityText, { width: colWidths.entity - 10 });
      const descHeight = doc.heightOfString(descText, { width: colWidths.desc - 10 });

      let baseRowHeight = Math.max(timeHeight, userHeight, roleHeight, actionHeight, entityHeight, descHeight, 15) + 8;

      // Handle metadata display height
      const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;
      let metadataString = '';
      let metadataHeight = 0;
      if (hasMetadata) {
        metadataString = JSON.stringify(log.metadata, null, 2);
        doc.font('Courier').fontSize(5.5);
        metadataHeight = doc.heightOfString(metadataString, { width: 505 }) + 8;
        baseRowHeight += metadataHeight;
      }

      // Check page break overflow (A4 height is 842. Margin bottom limit is 812)
      if (currentY + baseRowHeight > 812) {
        doc.addPage();
        currentY = 30; // Reset Y for new page

        // Redraw Table Header on new page
        doc.rect(startX, currentY, 535, 18).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
        doc.text('Time', startX + 5, currentY + 5, { width: colWidths.time - 10 });
        doc.text('User', startX + 95, currentY + 5, { width: colWidths.user - 10 });
        doc.text('Role', startX + 175, currentY + 5, { width: colWidths.role - 5 });
        doc.text('Action', startX + 225, currentY + 5, { width: colWidths.action - 10 });
        doc.text('Entity', startX + 325, currentY + 5, { width: colWidths.entity - 10 });
        doc.text('Description', startX + 415, currentY + 5, { width: colWidths.desc - 10 });
        
        currentY += 18;
      }

      // Draw horizontal line separator
      doc.lineWidth(0.5).strokeColor('#e2e8f0').moveTo(startX, currentY).lineTo(startX + 535, currentY).stroke();

      // Print Row Columns
      doc.fillColor('#334155').fontSize(6.5).font('Helvetica');
      doc.text(timeText, startX + 5, currentY + 4, { width: colWidths.time - 10 });
      doc.text(userText, startX + 95, currentY + 4, { width: colWidths.user - 10 });
      doc.text(roleText, startX + 175, currentY + 4, { width: colWidths.role - 5 });
      doc.text(actionText, startX + 225, currentY + 4, { width: colWidths.action - 10 });
      doc.text(entityText, startX + 325, currentY + 4, { width: colWidths.entity - 10 });
      doc.text(descText, startX + 415, currentY + 4, { width: colWidths.desc - 10 });

      // Draw Metadata Block
      if (hasMetadata) {
        const metadataY = currentY + baseRowHeight - metadataHeight + 3;
        doc.rect(startX + 10, metadataY, 515, metadataHeight - 6).fill('#f8fafc');
        doc.fillColor('#475569').fontSize(5.5).font('Courier');
        doc.text(metadataString, startX + 15, metadataY + 3, { width: 505 });
      }

      currentY += baseRowHeight;
    }

    doc.end();
  } catch (error) {
    console.error('Export audit logs to PDF error:', error);
    // Since doc may have started streaming, try to handle gracefully if headers not sent
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
};

module.exports = {
  exportAuditLogsCSV,
  exportAuditLogsPDF
};
