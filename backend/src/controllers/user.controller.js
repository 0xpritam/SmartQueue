const { User } = require('../models');
const { Op } = require('sequelize');

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 1. Sanitize request inputs (only permit name, email, phone, age)
    const { name, email, phone, age } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required',
      });
    }

    // Normalize email (lowercase + trim whitespace)
    const normalizedEmail = email.trim().toLowerCase();

    // 2. Validate age
    if (age !== undefined && age !== null && age !== '') {
      const parsedAge = parseInt(age, 10);
      if (isNaN(parsedAge) || parsedAge <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Age must be greater than 0',
        });
      }
    }

    // 3. Verify email uniqueness excluding current user
    const existingEmailUser = await User.findOne({
      where: {
        email: normalizedEmail,
        id: { [Op.ne]: userId }
      }
    });

    if (existingEmailUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // 4. Verify phone format and uniqueness excluding current user
    const normalizedPhone = (phone && phone.trim()) ? phone.trim() : null;
    if (normalizedPhone) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(normalizedPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be exactly 10 digits and contain only numbers.',
        });
      }

      const existingPhoneUser = await User.findOne({
        where: {
          phone: normalizedPhone,
          id: { [Op.ne]: userId }
        }
      });

      if (existingPhoneUser) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already registered',
        });
      }
    }

    // 5. Fetch and update the record
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Explicitly set mutable properties only to prevent modifying role, id, password, permissions, etc.
    user.name = name.trim();
    user.email = normalizedEmail;
    user.phone = normalizedPhone;
    user.age = (age !== undefined && age !== null && age !== '') ? parseInt(age, 10) : null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        age: user.age,
        role: user.role,
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: error.errors.map(e => e.message).join(', ')
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        age: user.age,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = {
  updateProfile,
  getProfile,
};

