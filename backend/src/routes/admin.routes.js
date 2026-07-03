const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { User } = require('../models');
const {
  getDashboardStats,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  getPatients,
  getPatientDetails,
  getSystemStatistics
} = require('../controllers/admin.controller');

// Authorization middleware for super admin
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
    console.error('isAdmin middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// All admin routes require authentication and admin role verification
router.use(authenticate, isAdmin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Department CRUD
router.get('/departments', getDepartments);
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

// Staff CRUD
router.get('/staff', getStaff);
router.post('/staff', createStaff);
router.put('/staff/:id', updateStaff);
router.delete('/staff/:id', deleteStaff);

// Patient Management
router.get('/patients', getPatients);
router.get('/patients/:id', getPatientDetails);

// Extended Statistics
router.get('/statistics', getSystemStatistics);

module.exports = router;
