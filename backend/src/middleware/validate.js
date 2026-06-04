const { sendError } = require('../utils/response');

const validateFields = (requiredFields) => (req, res, next) => {
  const body = req.body || {};
  const missing = requiredFields.filter((field) => !body[field]);
  if (missing.length > 0) {
    return sendError(res, 400, `Missing required fields: ${missing.join(', ')}`);
  }
  next();
};

module.exports = { validateFields };
