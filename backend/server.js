// 1. Load the environment variables FIRST
require('dotenv').config();
console.log("DEBUG -> JWT_SECRET VALUE IS:", process.env.JWT_SECRET);
// 2. NOW load your app, database, and models
const app = require('./src/app');
const sequelize = require('./src/config/database');
require('./src/models');

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`);

  socket.on('join_department', (departmentId) => {
    socket.join(`department_${departmentId}`);
    console.log(`[SOCKET] Client ${socket.id} joined department_${departmentId}`);
  });

  socket.on('join_ticket', (ticketId) => {
    socket.join(`ticket_${ticketId}`);
    console.log(`[SOCKET] Client ${socket.id} joined ticket_${ticketId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');

    await sequelize.sync({ alter: true });
    console.log('Models synchronized');

    // Auto-seed departments if empty
    const { Department } = require('./src/models');
    const count = await Department.count();
    if (count === 0) {
      await Department.bulkCreate([
        { name: 'Cardiology', description: 'Cardiology Clinic' },
        { name: 'Pediatrics', description: 'Pediatric Care' },
        { name: 'Orthopedics', description: 'Orthopedics Clinic' },
        { name: 'General Medicine', description: 'General Consultation' },
        { name: 'Radiology', description: 'Radiology Imaging' },
        { name: 'Emergency Triage', description: 'Emergency Room' },
        { name: 'Dermatology', description: 'Dermatology Clinic' },
        { name: 'Ophthalmology', description: 'Eye Clinic' },
        { name: 'Dental', description: 'Dental Clinic' }
      ]);
      console.log('Departments seeded successfully');
    }

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

startServer();