const request = require('supertest');

// Mock models to avoid DB / case-sensitivity issues on Linux
jest.mock('../models', () => ({
  User: { findOne: jest.fn(), create: jest.fn() },
}));

const app = require('../app');

describe('Express app', () => {
  describe('GET /api/health', () => {
    it('returns 200 with success message', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: 'SmartQueue API is running',
      });
    });
  });

  describe('middleware', () => {
    it('parses JSON request bodies', async () => {
      // POST to a known route with JSON body to verify express.json() works
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test' })
        .set('Content-Type', 'application/json');
      // We don't need a 201; a 400 (validation) proves the body was parsed
      expect(res.status).toBeLessThan(500);
    });

    it('sets CORS headers', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['access-control-allow-origin']).toBe('*');
    });
  });

  describe('unknown routes', () => {
    it('returns 404 for non-existent route', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
