const sequelize = require('../config/database');

const User = require('./user')(sequelize);
const Department = require('./department')(sequelize);

module.exports = {
  sequelize,
  User,
  Department,
};