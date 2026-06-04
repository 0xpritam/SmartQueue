const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';

const app = require('../app');

jest.mock('../controllers/queue.controller', () => ({
  getCurrentServing: jest.fn((req, res) =>
    res.status(200).json({ success: true, ticket: null })
  ),
  callNext: jest.fn((req, res) =>
    res.status(200).json({ success: true, message: 'Next ticket is now being served' })
  ),
  getWaiting: jest.fn((req, res) =>
    res.status(200).json({ success: true, tickets: [] })
  ),
}));

const { getCurrentServing, callNext, getWaiting } = require('../controllers/queue.controller');

const adminToken = jwt.sign({ id: 'admin-1', role: 'admin' }, process.env.JWT_SECRET || 'test-secret');
const userToken = jwt.sign({ id: 'user-1', role: 'user' }, process.env.JWT_SECRET || 'test-secret');

describe('Queue routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/queues/:departmentId/current', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/queues/dept-1/current');
      expect(res.status).toBe(401);
    });

    it('routes to getCurrentServing with valid token', async () => {
      const res = await request(app)
        .get('/api/queues/dept-1/current')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(getCurrentServing).toHaveBeenCalled();
    });
  });

  describe('POST /api/queues/:departmentId/next', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).post('/api/queues/dept-1/next');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin user', async () => {
      const res = await request(app)
        .post('/api/queues/dept-1/next')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
      expect(callNext).not.toHaveBeenCalled();
    });

    it('routes to callNext for admin user', async () => {
      const res = await request(app)
        .post('/api/queues/dept-1/next')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(callNext).toHaveBeenCalled();
    });
  });

  describe('GET /api/queues/:departmentId/waiting', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/queues/dept-1/waiting');
      expect(res.status).toBe(401);
    });

    it('routes to getWaiting with valid token', async () => {
      const res = await request(app)
        .get('/api/queues/dept-1/waiting')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(getWaiting).toHaveBeenCalled();
    });
  });
});
