const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const app = express();

const authRoutes = require('./routes/auth.routes');
const ticketRoutes = require('./routes/ticket.routes');
const queueRoutes = require('./routes/queue.routes');
const hospitalRoutes = require('./routes/hospital.routes');
const departmentRoutes = require('./routes/department.routes');
const userRoutes = require('./routes/user.routes');
const notificationRoutes = require('./routes/notification.routes');

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'SmartQueue API is running'
    });
});

module.exports = app;