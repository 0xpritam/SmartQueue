const express = require('express');
const router = express.Router();

// 1. Add 'login' to the destructured import
const { register, login, adminLogin } = require('../controllers/auth.controller');

// POST /api/auth/register
router.post('/register', register);

// 2. Add the login route definition
// This maps to: POST /api/auth/login
router.post('/login', login);

// POST /api/auth/admin-login
router.post('/admin-login', adminLogin);

module.exports = router;