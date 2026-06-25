const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { register, login, adminLogin } = require('../controllers/auth.controller');

// Mock dependencies
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../models', () => {
  const mockUser = {
    findOne: jest.fn(),
    create: jest.fn(),
  };
  return { User: mockUser };
});

const { User } = require('../models');

// Helper to build Express-like req/res
function mockReqRes(body = {}) {
  const req = { body };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

// ── REGISTER ────────────────────────────────────────────────────────────────

describe('register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when name is missing', async () => {
    const { req, res } = mockReqRes({ email: 'a@b.com', password: '123456' });
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'All fields are required' })
    );
  });

  it('returns 400 when email is missing', async () => {
    const { req, res } = mockReqRes({ name: 'Test', password: '123456' });
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when password is missing', async () => {
    const { req, res } = mockReqRes({ name: 'Test', email: 'a@b.com' });
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 if email already registered', async () => {
    User.findOne.mockResolvedValue({ id: '1', email: 'a@b.com' });
    const { req, res } = mockReqRes({ name: 'Test', email: 'a@b.com', password: '123456' });
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Email already registered' })
    );
  });

  it('returns 201 on successful registration', async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashed_pw');
    User.create.mockResolvedValue({ id: 'uuid-1', name: 'Test', email: 'a@b.com' });

    const { req, res } = mockReqRes({ name: 'Test', email: 'a@b.com', password: '123456' });
    await register(req, res);

    expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
    expect(User.create).toHaveBeenCalledWith({
      name: 'Test',
      email: 'a@b.com',
      password: 'hashed_pw',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'User registered successfully',
        user: { id: 'uuid-1', name: 'Test', email: 'a@b.com' },
      })
    );
  });

  it('returns 500 on unexpected error', async () => {
    User.findOne.mockRejectedValue(new Error('DB down'));
    const { req, res } = mockReqRes({ name: 'Test', email: 'a@b.com', password: '123456' });
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Server error' })
    );
  });
});

// ── LOGIN ───────────────────────────────────────────────────────────────────

describe('login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '1h';
  });

  it('returns 400 when email is missing', async () => {
    const { req, res } = mockReqRes({ password: '123456' });
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Email and password are required.' })
    );
  });

  it('returns 400 when password is missing', async () => {
    const { req, res } = mockReqRes({ email: 'a@b.com' });
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 401 when user is not found', async () => {
    User.findOne.mockResolvedValue(null);
    const { req, res } = mockReqRes({ email: 'a@b.com', password: '123456' });
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid email or password.' })
    );
  });

  it('returns 401 when password is wrong', async () => {
    User.findOne.mockResolvedValue({ id: '1', email: 'a@b.com', password: 'hashed' });
    bcrypt.compare.mockResolvedValue(false);

    const { req, res } = mockReqRes({ email: 'a@b.com', password: 'wrong' });
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 200 with token on successful login', async () => {
    const fakeUser = { id: '1', name: 'Test', email: 'a@b.com', password: 'hashed', role: 'user' };
    User.findOne.mockResolvedValue(fakeUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('jwt-token-123');

    const { req, res } = mockReqRes({ email: 'a@b.com', password: '123456' });
    await login(req, res);

    expect(jwt.sign).toHaveBeenCalledWith(
      { id: '1', email: 'a@b.com' },
      'test-secret',
      { expiresIn: '1h' }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        token: 'jwt-token-123',
        user: { id: '1', name: 'Test', email: 'a@b.com', role: 'user' },
      })
    );
  });

  it('uses default 24h expiry when JWT_EXPIRES_IN is unset', async () => {
    delete process.env.JWT_EXPIRES_IN;
    const fakeUser = { id: '1', name: 'Test', email: 'a@b.com', password: 'hashed', role: 'user' };
    User.findOne.mockResolvedValue(fakeUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('token');

    const { req, res } = mockReqRes({ email: 'a@b.com', password: '123456' });
    await login(req, res);

    expect(jwt.sign).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: '24h' }
    );
  });

  it('returns 403 when user is an admin', async () => {
    User.findOne.mockResolvedValue({ id: '1', name: 'Test', email: 'a@b.com', password: 'hashed', role: 'admin' });
    bcrypt.compare.mockResolvedValue(true);

    const { req, res } = mockReqRes({ email: 'a@b.com', password: '123456' });
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Patient access only.' })
    );
  });

  it('returns 500 on unexpected error', async () => {
    User.findOne.mockRejectedValue(new Error('DB down'));
    const { req, res } = mockReqRes({ email: 'a@b.com', password: '123456' });
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'An error occurred during login.' })
    );
  });
});

// ── ADMIN LOGIN ─────────────────────────────────────────────────────────────

describe('adminLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '1h';
  });

  it('returns 400 when email is missing', async () => {
    const { req, res } = mockReqRes({ password: '123456' });
    await adminLogin(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Email and password are required.' })
    );
  });

  it('returns 400 when password is missing', async () => {
    const { req, res } = mockReqRes({ email: 'a@b.com' });
    await adminLogin(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 401 when user is not found', async () => {
    User.findOne.mockResolvedValue(null);
    const { req, res } = mockReqRes({ email: 'a@b.com', password: '123456' });
    await adminLogin(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid email or password.' })
    );
  });

  it('returns 401 when password is wrong', async () => {
    User.findOne.mockResolvedValue({ id: '1', email: 'a@b.com', password: 'hashed' });
    bcrypt.compare.mockResolvedValue(false);

    const { req, res } = mockReqRes({ email: 'a@b.com', password: 'wrong' });
    await adminLogin(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 when user is not an admin', async () => {
    User.findOne.mockResolvedValue({ id: '1', email: 'a@b.com', password: 'hashed', role: 'patient' });
    bcrypt.compare.mockResolvedValue(true);

    const { req, res } = mockReqRes({ email: 'a@b.com', password: '123456' });
    await adminLogin(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Staff access only.' })
    );
  });

  it('returns 200 with token on successful admin login', async () => {
    const fakeUser = { id: '1', name: 'Admin', email: 'admin@b.com', password: 'hashed', role: 'admin', age: 35, phone: '555-0199' };
    User.findOne.mockResolvedValue(fakeUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('jwt-token-admin');

    const { req, res } = mockReqRes({ email: 'admin@b.com', password: '123456' });
    await adminLogin(req, res);

    expect(jwt.sign).toHaveBeenCalledWith(
      { id: '1', email: 'admin@b.com' },
      'test-secret',
      { expiresIn: '1h' }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        token: 'jwt-token-admin',
        user: { id: '1', name: 'Admin', email: 'admin@b.com', role: 'admin', age: 35, phone: '555-0199' },
      })
    );
  });

  it('returns 500 on unexpected error', async () => {
    User.findOne.mockRejectedValue(new Error('DB down'));
    const { req, res } = mockReqRes({ email: 'a@b.com', password: '123456' });
    await adminLogin(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'An error occurred during login.' })
    );
  });
});

