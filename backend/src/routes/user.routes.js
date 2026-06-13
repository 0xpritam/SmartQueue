const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { updateProfile, getProfile } = require('../controllers/user.controller');

// GET /api/users/profile - Protected route to retrieve profile details
router.get('/profile', authenticate, getProfile);

// PUT /api/users/profile - Protected route to update profile details
router.put('/profile', authenticate, updateProfile);

module.exports = router;

