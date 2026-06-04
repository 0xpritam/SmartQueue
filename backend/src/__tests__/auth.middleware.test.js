const jwt = require('jsonwebtoken');
const authenticate = require('../middleware/auth');

jest.mock('jsonwebtoken');

function mockReqRes(headers = {}) {
  const req = { headers };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('authenticate middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('returns 401 when no authorization header', () => {
    const { req, res, next } = mockReqRes({});
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Access denied. No token provided.' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when authorization header does not start with Bearer', () => {
    const { req, res, next } = mockReqRes({ authorization: 'Basic abc123' });
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid token');
    });
    const { req, res, next } = mockReqRes({ authorization: 'Bearer bad-token' });
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid or expired token.' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and sets req.user on valid token', () => {
    const decoded = { id: 'user-1', email: 'a@b.com' };
    jwt.verify.mockReturnValue(decoded);
    const { req, res, next } = mockReqRes({ authorization: 'Bearer valid-token' });
    authenticate(req, res, next);
    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
    expect(req.user).toEqual(decoded);
    expect(next).toHaveBeenCalled();
  });
});
