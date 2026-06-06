const express = require('express');
const router = express.Router();
const { getDepartments } = require('../controllers/department.controller');

// GET /api/departments
router.get('/', getDepartments);

module.exports = router;
