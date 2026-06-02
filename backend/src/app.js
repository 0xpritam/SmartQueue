const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const app = express();

const authRoutes = require('./routes/auth.routes');

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/auth', authRoutes); // Handles both /api/auth/register and /api/auth/login

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'SmartQueue API is running'
    });
});

module.exports = app;