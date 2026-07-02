const { getDashboard, emitAnalyticsUpdate } = require('../controllers/analytics.controller');
const { User, Ticket, Department } = require('../models');

// Mock index models
jest.mock('../models', () => {
  const mockSequelize = {
    options: { dialect: 'sqlite' },
    fn: jest.fn((fnName, col) => `${fnName}(${col})`),
    col: jest.fn((colName) => colName),
    literal: jest.fn((expr) => expr),
  };
  return {
    sequelize: mockSequelize,
    User: {
      findByPk: jest.fn(),
    },
    Ticket: {
      count: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
    },
    Department: {
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

describe('Analytics Dashboard Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authorization', () => {
    it('returns 403 if user is not admin', async () => {
      User.findByPk.mockResolvedValue({ id: 'user-1', role: 'user' });

      const { req, res } = mockReqRes({ id: 'user-1' });
      await getDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Access denied. Staff only.',
        })
      );
    });
  });

  describe('getDashboard', () => {
    it('returns aggregate metrics directly from Ticket table', async () => {
      User.findByPk.mockResolvedValue({ id: 'staff-1', role: 'admin' });

      // Mock Ticket counts
      Ticket.count.mockImplementation(async (options) => {
        if (options && options.where) {
          if (options.where.status === 'waiting') return 5;
          if (options.where.status === 'serving') return 2;
          if (options.where.status === 'completed') return 12;
          if (options.where.status === 'cancelled') return 3;
        }
        return 22; // totalTicketsToday fallback
      });

      // Mock Ticket findOne for average wait time
      Ticket.findOne.mockResolvedValue({
        avgWait: 900, // 900 seconds = 15 minutes
      });

      // Mock Department findAll
      Department.findAll.mockResolvedValue([
        { id: 'dept-1', name: 'Cardiology' },
        { id: 'dept-2', name: 'Pediatrics' },
      ]);

      // Mock Ticket.findAll for waiting and completed counts grouped by department
      Ticket.findAll.mockImplementation(async (options) => {
        if (options && options.where && options.where.status === 'waiting') {
          return [
            { departmentId: 'dept-1', count: 3 },
            { departmentId: 'dept-2', count: 2 },
          ];
        }
        if (options && options.where && options.where.status === 'completed') {
          return [
            { departmentId: 'dept-1', count: 10 },
            { departmentId: 'dept-2', count: 2 },
          ];
        }
        return [];
      });

      const { req, res } = mockReqRes({ id: 'staff-1' });
      await getDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(true);

      const data = payload.data;
      expect(data.totalTicketsToday).toBe(22);
      expect(data.waiting).toBe(5);
      expect(data.inProgress).toBe(2);
      expect(data.completed).toBe(12);
      expect(data.cancelled).toBe(3);
      expect(data.averageWaitingTime).toBe(15); // 900s / 60

      expect(data.departments.length).toBe(2);
      const cardiology = data.departments.find(d => d.departmentId === 'dept-1');
      expect(cardiology.departmentName).toBe('Cardiology');
      expect(cardiology.waiting).toBe(3);
      expect(cardiology.completedToday).toBe(10);
    });
  });

  describe('emitAnalyticsUpdate', () => {
    it('broadcasts the calculated dashboard analytics over socket.io', async () => {
      // Mock Ticket counts
      Ticket.count.mockResolvedValue(5);
      Ticket.findOne.mockResolvedValue({ avgWait: 300 });
      Department.findAll.mockResolvedValue([{ id: 'dept-1', name: 'Cardiology' }]);
      Ticket.findAll.mockResolvedValue([]);

      const mockIo = {
        emit: jest.fn(),
      };

      await emitAnalyticsUpdate(mockIo);

      expect(mockIo.emit).toHaveBeenCalledWith(
        'analytics_updated',
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalTicketsToday: 5,
            waiting: 5,
            inProgress: 5,
            completed: 5,
            cancelled: 5,
            averageWaitingTime: 5,
          }),
        })
      );
    });
  });
});
