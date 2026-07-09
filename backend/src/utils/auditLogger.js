const models = require('../models');

async function logAudit({
  userId,
  role,
  action,
  entityType,
  entityId,
  description,
  ipAddress,
  metadata
}) {
  try {
    const AuditLog = models ? models.AuditLog : null;
    if (!AuditLog || typeof AuditLog.create !== 'function') {
      return;
    }

    let resolvedRole = role;
    if (!resolvedRole && userId) {
      const User = models ? models.User : null;
      if (User && typeof User.findByPk === 'function') {
        const user = await User.findByPk(userId);
        if (user) {
          resolvedRole = user.role;
        }
      }
    }

    await AuditLog.create({
      userId,
      role: resolvedRole || null,
      action,
      entityType,
      entityId,
      description,
      ipAddress,
      metadata,
    });
  } catch (error) {
    console.error('[AUDIT LOGGER ERROR] Failed to create audit log:', error);
  }
}

module.exports = { logAudit };
