const {
  startServingTicket,
  completeTicket,
  cancelTicketStaff
} = require('../controllers/ticket.controller');
const { User, Ticket } = require('../models');
const {
  handleQueuePositionChanges,
  sendServingNotification,
  sendCompletionNotification,
  sendCancellationNotification
} = require('../utils/notification');

// Mock models
jest.mock('../models', () => {
  return {
    User: {
      findByPk: jest.fn()
    },
    Ticket: {
      findByPk: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn()
    }
  };
});

// Mock notification orchestration layer
jest.mock('../utils/notification', () => ({
  handleQueuePositionChanges: jest.fn(),
  sendServingNotification: jest.fn().mockResolvedValue({}),
  sendCompletionNotification: jest.fn().mockResolvedValue({}),
  sendCancellationNotification: jest.fn().mockResolvedValue({})
}));

// Mock analytics controller updates
jest.mock('../controllers/analytics.controller', () => ({
  emitAnalyticsUpdate: jest.fn()
}));

function mockReqRes(user = { id: 'staff-1', role: 'staff', departmentId: 'dept-1' }, params = {}, body = {}) {
  const req = {
    user,
    params,
    body,
    app: {
      get: jest.fn().mockReturnValue({
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
      })
    }
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return { req, res };
}

describe('Ticket Operations Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startServingTicket', () => {
    it('allows staff to start serving their department ticket successfully', async () => {
      const mockStaff = { id: 'staff-1', role: 'staff', departmentId: 'dept-1' };
      const mockTicket = {
        id: 'tkt-1',
        departmentId: 'dept-1',
        status: 'waiting',
        save: jest.fn()
      };

      User.findByPk.mockResolvedValue(mockStaff);
      Ticket.findByPk.mockResolvedValue(mockTicket);
      Ticket.findOne.mockResolvedValue(null); // No other ticket serving in dept-1
      Ticket.findAll.mockResolvedValue([mockTicket]); // waiting queue

      const { req, res } = mockReqRes(mockStaff, { id: 'tkt-1' });
      await startServingTicket(req, res);

      expect(mockTicket.status).toBe('serving');
      expect(mockTicket.save).toHaveBeenCalled();
      expect(sendServingNotification).toHaveBeenCalledWith(expect.any(Object), mockTicket);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('rejects serving if another patient is already serving in the same department', async () => {
      const mockStaff = { id: 'staff-1', role: 'staff', departmentId: 'dept-1' };
      const mockTicket = {
        id: 'tkt-1',
        departmentId: 'dept-1',
        status: 'waiting',
        save: jest.fn()
      };

      User.findByPk.mockResolvedValue(mockStaff);
      Ticket.findByPk.mockResolvedValue(mockTicket);
      Ticket.findOne.mockResolvedValue({ id: 'tkt-other', status: 'serving' }); // Another ticket serving

      const { req, res } = mockReqRes(mockStaff, { id: 'tkt-1' });
      await startServingTicket(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Another patient is currently being served in this department.'
        })
      );
    });

    it('rejects if staff tries to manage another department ticket', async () => {
      const mockStaff = { id: 'staff-1', role: 'staff', departmentId: 'dept-1' };
      const mockTicket = { id: 'tkt-1', departmentId: 'dept-2', status: 'waiting' }; // different dept

      User.findByPk.mockResolvedValue(mockStaff);
      Ticket.findByPk.mockResolvedValue(mockTicket);

      const { req, res } = mockReqRes(mockStaff, { id: 'tkt-1' });
      await startServingTicket(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Access denied. You can only manage tickets for your assigned department.'
        })
      );
    });

    it('allows admin to manage tickets in any department', async () => {
      const mockAdmin = { id: 'admin-1', role: 'admin', departmentId: null };
      const mockTicket = {
        id: 'tkt-1',
        departmentId: 'dept-2', // Admin department is null, ticket is dept-2
        status: 'waiting',
        save: jest.fn()
      };

      User.findByPk.mockResolvedValue(mockAdmin);
      Ticket.findByPk.mockResolvedValue(mockTicket);
      Ticket.findOne.mockResolvedValue(null);
      Ticket.findAll.mockResolvedValue([mockTicket]);

      const { req, res } = mockReqRes(mockAdmin, { id: 'tkt-1' });
      await startServingTicket(req, res);

      expect(mockTicket.status).toBe('serving');
      expect(mockTicket.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('rejects non-staff/admin roles', async () => {
      const mockPatient = { id: 'user-1', role: 'user' };
      User.findByPk.mockResolvedValue(mockPatient);

      const { req, res } = mockReqRes(mockPatient, { id: 'tkt-1' });
      await startServingTicket(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('completeTicket', () => {
    it('successfully completes a serving ticket', async () => {
      const mockStaff = { id: 'staff-1', role: 'staff', departmentId: 'dept-1' };
      const mockTicket = {
        id: 'tkt-1',
        departmentId: 'dept-1',
        status: 'serving',
        save: jest.fn()
      };

      User.findByPk.mockResolvedValue(mockStaff);
      Ticket.findByPk.mockResolvedValue(mockTicket);

      const { req, res } = mockReqRes(mockStaff, { id: 'tkt-1' });
      await completeTicket(req, res);

      expect(mockTicket.status).toBe('completed');
      expect(mockTicket.completedAt).toBeDefined();
      expect(mockTicket.save).toHaveBeenCalled();
      expect(sendCompletionNotification).toHaveBeenCalledWith(expect.any(Object), mockTicket);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('rejects completion if ticket is not serving', async () => {
      const mockStaff = { id: 'staff-1', role: 'staff', departmentId: 'dept-1' };
      const mockTicket = { id: 'tkt-1', departmentId: 'dept-1', status: 'waiting' };

      User.findByPk.mockResolvedValue(mockStaff);
      Ticket.findByPk.mockResolvedValue(mockTicket);

      const { req, res } = mockReqRes(mockStaff, { id: 'tkt-1' });
      await completeTicket(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('cancelTicketStaff', () => {
    it('cancels serving ticket and frees slot', async () => {
      const mockStaff = { id: 'staff-1', role: 'staff', departmentId: 'dept-1' };
      const mockTicket = {
        id: 'tkt-1',
        departmentId: 'dept-1',
        status: 'serving',
        save: jest.fn()
      };

      User.findByPk.mockResolvedValue(mockStaff);
      Ticket.findByPk.mockResolvedValue(mockTicket);

      const { req, res } = mockReqRes(mockStaff, { id: 'tkt-1' });
      await cancelTicketStaff(req, res);

      expect(mockTicket.status).toBe('cancelled');
      expect(mockTicket.save).toHaveBeenCalled();
      expect(sendCancellationNotification).toHaveBeenCalledWith(expect.any(Object), mockTicket);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('cancels waiting ticket and reorders queue', async () => {
      const mockStaff = { id: 'staff-1', role: 'staff', departmentId: 'dept-1' };
      const mockTicket = {
        id: 'tkt-1',
        departmentId: 'dept-1',
        status: 'waiting',
        save: jest.fn()
      };

      User.findByPk.mockResolvedValue(mockStaff);
      Ticket.findByPk.mockResolvedValue(mockTicket);
      Ticket.findAll.mockResolvedValue([mockTicket]); // waiting list

      const { req, res } = mockReqRes(mockStaff, { id: 'tkt-1' });
      await cancelTicketStaff(req, res);

      expect(mockTicket.status).toBe('cancelled');
      expect(mockTicket.save).toHaveBeenCalled();
      expect(handleQueuePositionChanges).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
