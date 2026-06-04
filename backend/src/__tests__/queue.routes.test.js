const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');

jest.mock('../controllers/queue.controller', () => ({
  getCurrentTicket: jest.fn((req, res) => res.status(200).json({ success: true })),
  getWaitingTickets: jest.fn((req, res) => res.status(200).json({ success: true })),
  callNextPatient: jest.fn((req, res) => res.status(200).json({ success: true })),
  completeCurrentPatient: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

const {
  getCurrentTicket,
  getWaitingTickets,
  callNextPatient,
  completeCurrentPatient,
} = require('../controllers/queue.controller');

describe('Queue routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  const token = jwt.sign({ id: 'user-1' }, 'test-secret');

  it('routes GET /api/queues/:departmentId/current to getCurrentTicket', async () => {
    const res = await request(app)
      .get('/api/queues/dept-1/current')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(getCurrentTicket).toHaveBeenCalled();
  });

  it('routes GET /api/queues/:departmentId/waiting to getWaitingTickets', async () => {
    const res = await request(app)
      .get('/api/queues/dept-1/waiting')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(getWaitingTickets).toHaveBeenCalled();
  });

  it('routes POST /api/queues/:departmentId/call-next to callNextPatient', async () => {
    const res = await request(app)
      .post('/api/queues/dept-1/call-next')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(callNextPatient).toHaveBeenCalled();
  });

  it('routes POST /api/queues/:departmentId/complete-current to completeCurrentPatient', async () => {
    const res = await request(app)
      .post('/api/queues/dept-1/complete-current')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(completeCurrentPatient).toHaveBeenCalled();
  });

  it('returns 401 when no authorization header is provided', async () => {
    const res = await request(app).get('/api/queues/dept-1/current');

    expect(res.status).toBe(401);
    expect(getCurrentTicket).not.toHaveBeenCalled();
  });

  it('rejects unsupported methods with a client error', async () => {
    const res = await request(app)
      .get('/api/queues/dept-1/call-next')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(callNextPatient).not.toHaveBeenCalled();
  });
});
