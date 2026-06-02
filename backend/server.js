// 1. Load the environment variables FIRST
require('dotenv').config();
console.log("DEBUG -> JWT_SECRET VALUE IS:", process.env.JWT_SECRET);
// 2. NOW load your app, database, and models
const app = require('./src/app');
const sequelize = require('./src/config/database');
require('./src/models');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');

    await sequelize.sync({ alter: true });
    console.log('Models synchronized');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

startServer();