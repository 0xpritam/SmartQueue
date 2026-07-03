const { getPrediction } = require('../controllers/prediction.controller');
const { Ticket, Department } = require('../models');

// Mock Models
jest.mock('../models', () => {
  return {
    Ticket: {
      findByPk: jest.fn(),
      findAll: jest.fn(),
    },
    Department: {
      findByPk: jest.fn(),
    }
  };
});

function mockReqRes(params = {}) {
  const req = {
    params,
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

describe('AI Queue Prediction Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 for invalid ticket', async () => {
    Ticket.findByPk.mockResolvedValue(null);

    const { req, res } = mockReqRes({ ticketId: 'invalid-id' });
    await getPrediction(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Ticket not found'
      })
    );
  });

  it('uses default fallback consultation time of 8 minutes if history is empty', async () => {
    const mockTicket = {
      id: 'tkt-1',
      departmentId: 'dept-1',
      status: 'waiting',
      createdAt: new Date()
    };

    Ticket.findByPk.mockResolvedValue(mockTicket);
    Ticket.findAll
      .mockResolvedValueOnce([]) // history is empty
      .mockResolvedValueOnce([mockTicket]); // waiting list

    const { req, res } = mockReqRes({ ticketId: 'tkt-1' });
    await getPrediction(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        averageConsultationTime: 8, // Fallback value
        queuePosition: 1,
        patientsAhead: 0,
        estimatedWaitMinutes: 0,
        confidence: 'Low'
      })
    );
  });

  it('calculates average consultation time correctly with department isolation', async () => {
    const mockTicket = {
      id: 'tkt-1',
      departmentId: 'dept-1',
      status: 'waiting',
      createdAt: new Date()
    };

    // 10 completed tickets with 10 minutes consultation duration each
    const completedHistory = [];
    const now = new Date();
    for (let i = 0; i < 10; i++) {
      completedHistory.push({
        id: `tkt-hist-${i}`,
        departmentId: 'dept-1',
        status: 'completed',
        servingStartTime: new Date(now.getTime() - 15 * 60000), // 15 mins ago
        completedAt: new Date(now.getTime() - 5 * 60000) // 5 mins ago (consultation time = 10 mins)
      });
    }

    // Set up queue with 2 tickets ahead of our ticket
    const ticketAhead1 = { id: 'tkt-ahead-1', departmentId: 'dept-1', status: 'waiting', createdAt: new Date(now.getTime() - 20000) };
    const ticketAhead2 = { id: 'tkt-ahead-2', departmentId: 'dept-1', status: 'waiting', createdAt: new Date(now.getTime() - 10000) };
    const waitingQueue = [ticketAhead1, ticketAhead2, mockTicket];

    Ticket.findByPk.mockResolvedValue(mockTicket);
    Ticket.findAll
      .mockResolvedValueOnce(completedHistory) // history query
      .mockResolvedValueOnce(waitingQueue); // waiting list query

    const { req, res } = mockReqRes({ ticketId: 'tkt-1' });
    await getPrediction(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        averageConsultationTime: 10, // calculated from history
        queuePosition: 3,
        patientsAhead: 2,
        estimatedWaitMinutes: 20, // 2 patients ahead * 10 mins = 20 mins
        confidence: 'Medium' // historyCount = 10 -> Medium
      })
    );
  });

  it('sets confidence to High if history has 30 or more completed tickets', async () => {
    const mockTicket = {
      id: 'tkt-1',
      departmentId: 'dept-1',
      status: 'waiting',
      createdAt: new Date()
    };

    const completedHistory = [];
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      completedHistory.push({
        id: `tkt-hist-${i}`,
        departmentId: 'dept-1',
        status: 'completed',
        servingStartTime: new Date(now.getTime() - 10 * 60000),
        completedAt: now
      });
    }

    Ticket.findByPk.mockResolvedValue(mockTicket);
    Ticket.findAll
      .mockResolvedValueOnce(completedHistory)
      .mockResolvedValueOnce([mockTicket]);

    const { req, res } = mockReqRes({ ticketId: 'tkt-1' });
    await getPrediction(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        confidence: 'High'
      })
    );
  });
});
