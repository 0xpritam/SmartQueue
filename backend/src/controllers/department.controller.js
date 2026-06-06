const { Department } = require('../models');

// GET /api/departments - Fetch all active departments from database
const getDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      where: { status: 'active' },
      order: [['name', 'ASC']],
    });

    return res.status(200).json({
      success: true,
      departments,
    });
  } catch (error) {
    console.error('Get departments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = {
  getDepartments,
};
