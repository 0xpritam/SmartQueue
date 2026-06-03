const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const app = express();

const authRoutes = require('./routes/auth.routes');

// Security headers
app.use(helmet());

// CORS — restrict to known frontend origin
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : [];

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server requests (no origin) and allowed origins
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Body parser with size limit to prevent large-payload DoS
app.use(express.json({ limit: '10kb' }));

// Request logging — verbose in dev, minimal in production
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api/auth', authRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'SmartQueue API is running'
    });
});

module.exports = app;