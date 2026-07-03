const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { getPrediction } = require('../controllers/prediction.controller');

// GET /api/predictions/:ticketId - Get wait time prediction (authenticated)
router.get('/:ticketId', authenticate, getPrediction);

module.exports = router;
