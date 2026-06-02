const sequelize = require('../config/database');

const User = require('./User')(sequelize);

module.exports = {
  sequelize,
  User,
};  