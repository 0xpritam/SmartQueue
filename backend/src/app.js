const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { sendSuccess } = require('./utils/response');
const app = express();

const authRoutes = require('./routes/auth.routes');
const ticketRoutes = require('./routes/ticket.routes');

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    sendSuccess(res, 200, 'SmartQueue API is running');
});

module.exports = app;
