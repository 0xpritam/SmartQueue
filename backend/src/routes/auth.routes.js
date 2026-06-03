const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { register, login } = require('../controllers/auth.controller');

// Rate-limit auth endpoints to mitigate brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

module.exports = router;