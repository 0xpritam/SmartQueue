const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { updateProfile } = require('../controllers/user.controller');

// PUT /api/users/profile - Protected route to update profile details
router.put('/profile', authenticate, updateProfile);

module.exports = router;
