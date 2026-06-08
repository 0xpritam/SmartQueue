const {
  getCurrentTicket,
  getWaitingTickets,
  callNextPatient,
  completeCurrentPatient,
} = require('../controllers/queue.controller');

jest.mock('../models', () => ({
  Ticket: {
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
}));

const { Ticket } = require('../models');

const mockReqRes = (params = {}) => {
  const req = { params };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
};

describe('Queue controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentTicket', () => {
    it('returns 200 with the current serving ticket', async () => {
      const ticket = { id: 'ticket-1', status: 'serving', departmentId: 'dept-1' };
      Ticket.findOne.mockResolvedValue(ticket);

      const { req, res } = mockReqRes({ departmentId: 'dept-1' });
      await getCurrentTicket(req, res);

      expect(Ticket.findOne).toHaveBeenCalledWith({
        where: { departmentId: 'dept-1', status: 'serving' },
        order: [['createdAt', 'ASC']],
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, ticket })
      );
    });

    it('returns 404 when no serving ticket exists', async () => {
      Ticket.findOne.mockResolvedValue(null);

      const { req, res } = mockReqRes({ departmentId: 'dept-1' });
      await getCurrentTicket(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'No current ticket is being served',
        })
      );
    });

    it('returns 500 on unexpected error', async () => {
      Ticket.findOne.mockRejectedValue(new Error('DB error'));

      const { req, res } = mockReqRes({ departmentId: 'dept-1' });
      await getCurrentTicket(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Server error' })
      );
    });
  });

  describe('getWaitingTickets', () => {
    it('returns 200 with waiting tickets', async () => {
      const tickets = [
        { id: 't1', status: 'waiting', departmentId: 'dept-1' },
        { id: 't2', status: 'waiting', departmentId: 'dept-1' },
      ];
      Ticket.findAll.mockResolvedValue(tickets);

      const { req, res } = mockReqRes({ departmentId: 'dept-1' });
      await getWaitingTickets(req, res);

      expect(Ticket.findAll).toHaveBeenCalledWith({
        where: { departmentId: 'dept-1', status: 'waiting' },
        order: [['createdAt', 'ASC']],
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, tickets })
      );
    });

    it('returns empty array when no waiting tickets exist', async () => {
      Ticket.findAll.mockResolvedValue([]);

      const { req, res } = mockReqRes({ departmentId: 'dept-1' });
      await getWaitingTickets(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, tickets: [] })
      );
    });

    it('returns 500 on unexpected error', async () => {
      Ticket.findAll.mockRejectedValue(new Error('DB error'));

      const { req, res } = mockReqRes({ departmentId: 'dept-1' });
      await getWaitingTickets(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Server error' })
      );
    });
  });

  describe('callNextPatient', () => {
    it('promotes the oldest waiting ticket to serving', async () => {
      const ticket = {
        id: 'ticket-1',
        status: 'waiting',
        departmentId: 'dept-1',
        save: jest.fn().mockResolvedValue(true),
      };
      Ticket.findOne.mockResolvedValue(ticket);
      Ticket.findAll.mockResolvedValue([ticket]);

      const { req, res } = mockReqRes({ departmentId: 'dept-1' });
      await callNextPatient(req, res);

      expect(Ticket.findOne).toHaveBeenCalledWith({
        where: { departmentId: 'dept-1', status: 'waiting' },
        order: [['createdAt', 'ASC']],
      });
      expect(ticket.status).toBe('serving');
      expect(ticket.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, ticket })
      );
    });

    it('returns 404 when no waiting tickets exist', async () => {
      Ticket.findOne.mockResolvedValue(null);

      const { req, res } = mockReqRes({ departmentId: 'dept-1' });
      await callNextPatient(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'No waiting tickets found for this department',
        })
      );
    });

    it('returns 500 on unexpected error', async () => {
      Ticket.findOne.mockRejectedValue(new Error('DB error'));

      const { req, res } = mockReqRes({ departmentId: 'dept-1' });
      await callNextPatient(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Server error' })
      );
    });
  });

  describe('completeCurrentPatient', () => {
    it('marks the current serving ticket as completed', async () => {
      const ticket = {
        id: 'ticket-1',
        status: 'serving',
        departmentId: 'dept-1',
        save: jest.fn().mockResolvedValue(true),
      };
      Ticket.findOne.mockResolvedValue(ticket);

      const { req, res } = mockReqRes({ departmentId: 'dept-1' });
      await completeCurrentPatient(req, res);

      expect(Ticket.findOne).toHaveBeenCalledWith({
        where: { departmentId: 'dept-1', status: 'serving' },
        order: [['createdAt', 'ASC']],
      });
      expect(ticket.status).toBe('completed');
      expect(ticket.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Current patient completed successfully',
          ticket,
        })
      );
    });

    it('returns 404 when no serving ticket exists', async () => {
      Ticket.findOne.mockResolvedValue(null);

      const { req, res } = mockReqRes({ departmentId: 'dept-1' });
      await completeCurrentPatient(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'No currently serving ticket found for this department',
        })
      );
    });

    it('returns 500 on unexpected error', async () => {
      Ticket.findOne.mockRejectedValue(new Error('DB error'));

      const { req, res } = mockReqRes({ departmentId: 'dept-1' });
      await completeCurrentPatient(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Server error' })
      );
    });
  });
});
