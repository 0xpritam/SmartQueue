const { getOverview, getDepartmentsAnalytics, getTrends } = require('../controllers/analytics.controller');
const { User, Ticket, Department, Notification } = require('../models');

// Mock models
jest.mock('../models', () => {
  return {
    User: {
      findByPk: jest.fn(),
    },
    Ticket: {
      count: jest.fn(),
      findAll: jest.fn(),
    },
    Department: {
      findAll: jest.fn(),
    },
    Notification: {
      findAll: jest.fn(),
    },
  };
});

function mockReqRes(user = { id: 'staff-1' }, params = {}, query = {}) {
  const req = { user, params, query };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe('Analytics Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Department.findAll.mockResolvedValue([]);
  });

  describe('Authorization', () => {
    it('returns 403 Forbidden if user is not admin (staff)', async () => {
      User.findByPk.mockResolvedValue({ id: 'user-1', role: 'user' });

      const { req, res } = mockReqRes({ id: 'user-1' });
      await getOverview(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Access denied. Staff only.',
        })
      );
    });
  });

  describe('getOverview', () => {
    it('returns overview analytics metrics for admin', async () => {
      User.findByPk.mockResolvedValue({ id: 'staff-1', role: 'admin' });
      Ticket.count.mockImplementation(async (options) => {
        if (options && options.where && options.where.status) {
          if (options.where.status === 'waiting') return 3;
          if (options.where.status === 'serving') return 2;
          if (options.where.status === 'completed') return 10;
          if (options.where.status === 'cancelled') return 1;
        }
        return 15; // default fallback
      });

      // Mock 2 tickets served today
      const ticket1 = {
        id: 't-1',
        status: 'serving',
        createdAt: new Date(Date.now() - 30 * 60000), // 30 mins ago
        updatedAt: new Date(),
      };
      const ticket2 = {
        id: 't-2',
        status: 'completed',
        createdAt: new Date(Date.now() - 60 * 60000), // 60 mins ago
        updatedAt: new Date(Date.now() - 30 * 60000), // completed 30 mins ago
      };
      Ticket.findAll.mockResolvedValue([ticket1, ticket2]);

      // Mock notification for ticket2 only (serving started 45 mins ago)
      Notification.findAll.mockResolvedValue([
        {
          ticketId: 't-2',
          type: 'serving',
          createdAt: new Date(Date.now() - 45 * 60000),
        },
      ]);

      const { req, res } = mockReqRes({ id: 'staff-1' });
      await getOverview(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = res.json.mock.calls[0][0].data;

      // check status counts
      expect(data.statusDistribution.waiting).toBe(3);
      expect(data.statusDistribution.serving).toBe(2);
      expect(data.statusDistribution.completed).toBe(10);
      expect(data.statusDistribution.cancelled).toBe(1);

      // check wait times:
      // ticket1: status 'serving', no serving notification -> fallback to t1.updatedAt - t1.createdAt = 30 mins
      // ticket2: status 'completed', serving notification at 45 mins ago -> t2.servingNotif.createdAt - t2.createdAt = 15 mins
      // Average wait = (30 + 15) / 2 = 22.5 mins (rounded to 23 mins)
      expect(data.avgWaitTime).toBe(23);
    });
  });

  describe('getDepartmentsAnalytics', () => {
    it('returns patients served and wait time grouped by department', async () => {
      User.findByPk.mockResolvedValue({ id: 'staff-1', role: 'admin' });
      Department.findAll.mockResolvedValue([
        { id: 'dept-1', name: 'Cardiology' },
        { id: 'dept-2', name: 'Pediatrics' },
      ]);

      const t1 = {
        id: 't-1',
        departmentId: 'dept-1',
        status: 'completed',
        createdAt: new Date(Date.now() - 20 * 60000),
        updatedAt: new Date(),
      };
      const t2 = {
        id: 't-2',
        departmentId: 'dept-2',
        status: 'serving',
        createdAt: new Date(Date.now() - 10 * 60000),
        updatedAt: new Date(),
      };
      Ticket.findAll.mockResolvedValue([t1, t2]);
      Notification.findAll.mockResolvedValue([]); // No notification -> t1 (completed) excluded, t2 (serving) fallback wait time = 10 mins

      const { req, res } = mockReqRes({ id: 'staff-1' });
      await getDepartmentsAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = res.json.mock.calls[0][0].data;

      expect(data.length).toBe(2);
      const cardiology = data.find((d) => d.departmentId === 'dept-1');
      const pediatrics = data.find((d) => d.departmentId === 'dept-2');

      expect(cardiology.patientsServed).toBe(1); // status completed
      expect(cardiology.avgWaitTime).toBe(0); // t1 was excluded because serving notification was missing and it is status completed

      expect(pediatrics.patientsServed).toBe(0); // status serving
      expect(pediatrics.avgWaitTime).toBe(10); // t2 fallback to serving time (10 mins)
    });
  });

  describe('getTrends', () => {
    it('returns 7-day registered and completed count trends', async () => {
      User.findByPk.mockResolvedValue({ id: 'staff-1', role: 'admin' });
      Ticket.findAll.mockResolvedValue([
        { createdAt: new Date() }, // today
        { createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // yesterday
      ]);

      const { req, res } = mockReqRes({ id: 'staff-1' });
      await getTrends(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = res.json.mock.calls[0][0].data;
      expect(data.length).toBe(7);
      expect(data[6].registered).toBe(1); // today
      expect(data[5].registered).toBe(1); // yesterday
    });
  });
});
