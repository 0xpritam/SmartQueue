const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
  getOverview,
  getDepartmentsAnalytics,
  getTrends,
} = require('../controllers/analytics.controller');

// All analytics routes require authentication
router.get('/overview', authenticate, getOverview);
router.get('/departments', authenticate, getDepartmentsAnalytics);
router.get('/trends', authenticate, getTrends);

module.exports = router;
