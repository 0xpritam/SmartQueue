const express = require('express');
const router = express.Router();
const { getHospitals } = require('../controllers/hospital.controller');

// GET /api/hospitals
router.get('/', getHospitals);

module.exports = router;
