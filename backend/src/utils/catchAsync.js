const { sendError } = require('./response');

const catchAsync = (fn, errorMessage = 'Server error') => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error(`${fn.name || 'Handler'} error:`, error);
    sendError(res, 500, errorMessage);
  });
};

module.exports = catchAsync;
