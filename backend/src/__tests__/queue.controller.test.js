const { getCurrentServing, callNext, getWaiting } = require('../controllers/queue.controller');

jest.mock('../models', () => {
  const mockTicket = {
    findOne: jest.fn(),
    findAll: jest.fn(),
  };
  const mockDepartment = {
    findByPk: jest.fn(),
  };
  const mockSequelize = {
    transaction: jest.fn((cb) => {
      const fakeTransaction = { LOCK: { UPDATE: 'UPDATE' } };
      return cb(fakeTransaction);
    }),
  };
  return { Ticket: mockTicket, Department: mockDepartment, sequelize: mockSequelize };
});

const { Ticket, Department, sequelize } = require('../models');

function mockReqRes(params = {}, user = { id: 'user-1', role: 'admin' }) {
  const req = { params, user };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

// ── GET CURRENT SERVING ─────────────────────────────────────────────────────

describe('getCurrentServing', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when department does not exist', async () => {
    Department.findByPk.mockResolvedValue(null);
    const { req, res } = mockReqRes({ departmentId: 'dept-1' });
    await getCurrentServing(req, res);
    expect(Department.findByPk).toHaveBeenCalledWith('dept-1');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Department not found' })
    );
  });

  it('returns 200 with serving ticket when one exists', async () => {
    Department.findByPk.mockResolvedValue({ id: 'dept-1' });
    const fakeTicket = { id: 't1', status: 'serving', departmentId: 'dept-1' };
    Ticket.findOne.mockResolvedValue(fakeTicket);

    const { req, res } = mockReqRes({ departmentId: 'dept-1' });
    await getCurrentServing(req, res);

    expect(Ticket.findOne).toHaveBeenCalledWith({
      where: { departmentId: 'dept-1', status: 'serving' },
      order: [['updatedAt', 'DESC']],
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, ticket: fakeTicket })
    );
  });

  it('returns 200 with null ticket when none serving', async () => {
    Department.findByPk.mockResolvedValue({ id: 'dept-1' });
    Ticket.findOne.mockResolvedValue(null);

    const { req, res } = mockReqRes({ departmentId: 'dept-1' });
    await getCurrentServing(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, ticket: null })
    );
  });

  it('returns 500 on unexpected error', async () => {
    Department.findByPk.mockRejectedValue(new Error('DB down'));
    const { req, res } = mockReqRes({ departmentId: 'dept-1' });
    await getCurrentServing(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Server error' })
    );
  });
});

// ── CALL NEXT ───────────────────────────────────────────────────────────────

describe('callNext', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when department does not exist', async () => {
    Department.findByPk.mockResolvedValue(null);
    const { req, res } = mockReqRes({ departmentId: 'dept-1' });
    await callNext(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Department not found' })
    );
  });

  it('returns 404 when no waiting tickets', async () => {
    Department.findByPk.mockResolvedValue({ id: 'dept-1' });
    // First call: no currently serving ticket; Second call: no waiting ticket
    Ticket.findOne.mockResolvedValue(null);

    const { req, res } = mockReqRes({ departmentId: 'dept-1' });
    await callNext(req, res);

    expect(sequelize.transaction).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'No waiting tickets' })
    );
  });

  it('returns 200 and moves next waiting ticket to serving', async () => {
    Department.findByPk.mockResolvedValue({ id: 'dept-1' });
    const fakeTicket = {
      id: 't1',
      status: 'waiting',
      departmentId: 'dept-1',
      save: jest.fn().mockResolvedValue(true),
    };
    // First findOne: no currently serving; Second findOne: next waiting ticket
    Ticket.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(fakeTicket);

    const { req, res } = mockReqRes({ departmentId: 'dept-1' });
    await callNext(req, res);

    expect(fakeTicket.status).toBe('serving');
    expect(fakeTicket.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Next ticket is now being served',
        ticket: fakeTicket,
      })
    );
  });

  it('completes the currently serving ticket before promoting next', async () => {
    Department.findByPk.mockResolvedValue({ id: 'dept-1' });
    const currentTicket = {
      id: 't0',
      status: 'serving',
      save: jest.fn().mockResolvedValue(true),
    };
    const nextTicket = {
      id: 't1',
      status: 'waiting',
      save: jest.fn().mockResolvedValue(true),
    };
    Ticket.findOne
      .mockResolvedValueOnce(currentTicket)
      .mockResolvedValueOnce(nextTicket);

    const { req, res } = mockReqRes({ departmentId: 'dept-1' });
    await callNext(req, res);

    expect(currentTicket.status).toBe('completed');
    expect(currentTicket.save).toHaveBeenCalled();
    expect(nextTicket.status).toBe('serving');
    expect(nextTicket.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 500 on unexpected error', async () => {
    Department.findByPk.mockRejectedValue(new Error('DB down'));
    const { req, res } = mockReqRes({ departmentId: 'dept-1' });
    await callNext(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Server error' })
    );
  });
});

// ── GET WAITING ─────────────────────────────────────────────────────────────

describe('getWaiting', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when department does not exist', async () => {
    Department.findByPk.mockResolvedValue(null);
    const { req, res } = mockReqRes({ departmentId: 'dept-1' });
    await getWaiting(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Department not found' })
    );
  });

  it('returns 200 with waiting tickets', async () => {
    Department.findByPk.mockResolvedValue({ id: 'dept-1' });
    const fakeTickets = [
      { id: 't1', status: 'waiting' },
      { id: 't2', status: 'waiting' },
    ];
    Ticket.findAll.mockResolvedValue(fakeTickets);

    const { req, res } = mockReqRes({ departmentId: 'dept-1' });
    await getWaiting(req, res);

    expect(Ticket.findAll).toHaveBeenCalledWith({
      where: { departmentId: 'dept-1', status: 'waiting' },
      order: [['createdAt', 'ASC']],
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, tickets: fakeTickets })
    );
  });

  it('returns empty array when no waiting tickets', async () => {
    Department.findByPk.mockResolvedValue({ id: 'dept-1' });
    Ticket.findAll.mockResolvedValue([]);

    const { req, res } = mockReqRes({ departmentId: 'dept-1' });
    await getWaiting(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, tickets: [] })
    );
  });

  it('returns 500 on unexpected error', async () => {
    Department.findByPk.mockRejectedValue(new Error('DB down'));
    const { req, res } = mockReqRes({ departmentId: 'dept-1' });
    await getWaiting(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Server error' })
    );
  });
});
