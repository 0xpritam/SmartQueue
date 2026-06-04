const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/auth.controller');
const { validateFields } = require('../middleware/validate');

// POST /api/auth/register
router.post('/register', validateFields(['name', 'email', 'password']), register);

// POST /api/auth/login
router.post('/login', validateFields(['email', 'password']), login);

module.exports = router;
