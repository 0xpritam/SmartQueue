const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { User } = require('../models');
const { exportAuditLogsCSV, exportAuditLogsPDF } = require('../controllers/auditLogExport.controller');

/**
 * Authorization middleware to check if user has admin role
 */
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admins only.'
      });
    }
    next();
  } catch (error) {
    console.error('isAdmin middleware error in audit log exports:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Protect all export routes: require authentication and admin role
router.use(authenticate, isAdmin);

// Routes
router.get('/csv', exportAuditLogsCSV);
router.get('/pdf', exportAuditLogsPDF);

module.exports = router;
