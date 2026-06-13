const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { updateProfile, getProfile } = require('../controllers/user.controller');

// GET /api/users/me - Protected route to retrieve user details (including role)
router.get('/me', authenticate, getProfile);

// PUT /api/users/profile - Protected route to update profile details
router.put('/profile', authenticate, updateProfile);

module.exports = router;
