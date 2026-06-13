const request = require('supertest');
const app = require('../app');

// Mock auth middleware to bypass token verification in route test
jest.mock('../middleware/auth', () => jest.fn((req, res, next) => {
  req.user = { id: 'uuid-1' };
  next();
}));

// Mock the user controller
jest.mock('../controllers/user.controller', () => ({
  updateProfile: jest.fn((req, res) =>
    res.status(200).json({ success: true, message: 'profile updated' })
  ),
  getProfile: jest.fn((req, res) =>
    res.status(200).json({ success: true, user: { id: 'uuid-1', name: 'Test' } })
  ),
}));

const { updateProfile, getProfile } = require('../controllers/user.controller');

describe('User routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/users/profile', () => {
    it('routes to getProfile controller', async () => {
      const res = await request(app).get('/api/users/profile');
      expect(res.status).toBe(200);
      expect(getProfile).toHaveBeenCalled();
    });
  });

  describe('PUT /api/users/profile', () => {
    it('routes to updateProfile controller', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .send({ name: 'New Name', email: 'new@b.com' });
      expect(res.status).toBe(200);
      expect(updateProfile).toHaveBeenCalled();
    });
  });

  describe('unsupported methods', () => {
    it('rejects POST on /api/users/profile', async () => {
      const res = await request(app).post('/api/users/profile');
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
