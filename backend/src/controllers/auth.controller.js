const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const catchAsync = require('../utils/catchAsync');

// ==========================================
// REGISTER CONTROLLER
// ==========================================
const register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return sendError(res, 400, 'All fields are required');
  }

  // 1. Check if user already exists
  const existingUser = await User.findOne({
    where: { email },
  });

  if (existingUser) {
    return sendError(res, 400, 'Email already registered');
  }

  // 2. Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. Create user
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  // 4. Return response
  return sendSuccess(res, 201, 'User registered successfully', {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
});

// ==========================================
// LOGIN CONTROLLER
// ==========================================
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 400, 'Email and password are required.');
  }

  // 1. Find user by email
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return sendError(res, 401, 'Invalid email or password.');
  }

  // 2. Compare password with bcrypt
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return sendError(res, 401, 'Invalid email or password.');
  }

  // 3. Generate JWT token
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  // 4. Return token and user info
  return sendSuccess(res, 200, 'Login successful.', {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
}, 'An error occurred during login.');

// ==========================================
// EXPORTS
// ==========================================
module.exports = {
  register,
  login,
};
