// 1. Load the environment variables FIRST
require('dotenv').config();

// 2. Validate required secrets before booting
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Aborting.');
  process.exit(1);
}

// 3. NOW load your app, database, and models
const app = require('./src/app');
const sequelize = require('./src/config/database');
require('./src/models');

const PORT = process.env.PORT || 5000;
const isDev = process.env.NODE_ENV !== 'production';

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');

    // Only auto-alter schema in development; use migrations in production
    if (isDev) {
      await sequelize.sync({ alter: true });
    } else {
      await sequelize.sync();
    }
    console.log('Models synchronized');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

startServer();