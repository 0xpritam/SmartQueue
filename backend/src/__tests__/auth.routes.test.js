const request = require('supertest');
const app = require('../app');

// Mock the controller functions so route tests only verify routing
jest.mock('../controllers/auth.controller', () => ({
  register: jest.fn((req, res) =>
    res.status(201).json({ success: true, message: 'registered' })
  ),
  login: jest.fn((req, res) =>
    res.status(200).json({ success: true, message: 'logged in' })
  ),
  adminLogin: jest.fn((req, res) =>
    res.status(200).json({ success: true, message: 'logged in' })
  ),
}));

const { register, login, adminLogin } = require('../controllers/auth.controller');

describe('Auth routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/auth/register', () => {
    it('routes to register controller', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'A', email: 'a@b.com', password: '123456' });
      expect(res.status).toBe(201);
      expect(register).toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/login', () => {
    it('routes to login controller', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'a@b.com', password: '123456' });
      expect(res.status).toBe(200);
      expect(login).toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/admin-login', () => {
    it('routes to adminLogin controller', async () => {
      const res = await request(app)
        .post('/api/auth/admin-login')
        .send({ email: 'a@b.com', password: '123456' });
      expect(res.status).toBe(200);
      expect(adminLogin).toHaveBeenCalled();
    });
  });

  describe('unsupported methods', () => {
    it('rejects GET on /api/auth/register', async () => {
      const res = await request(app).get('/api/auth/register');
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects GET on /api/auth/login', async () => {
      const res = await request(app).get('/api/auth/login');
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects GET on /api/auth/admin-login', async () => {
      const res = await request(app).get('/api/auth/admin-login');
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
