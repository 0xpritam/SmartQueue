const sequelize = require('../config/database');

const User = require('./user')(sequelize);
const Department = require('./department')(sequelize);
const Ticket = require('./ticket')(sequelize);
const Notification = require('./notification')(sequelize);
const AuditLog = require('./auditLog')(sequelize);

// Model Associations
Ticket.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
Department.hasMany(Ticket, { foreignKey: 'departmentId', as: 'tickets' });

Ticket.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Ticket, { foreignKey: 'userId', as: 'tickets' });

Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });

User.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
Department.hasMany(User, { foreignKey: 'departmentId', as: 'staff' });

AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });

module.exports = {
  sequelize,
  User,
  Department,
  Ticket,
  Notification,
  AuditLog,
};