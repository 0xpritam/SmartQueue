const { generateTicket, getMyTickets, getTicketById, cancelTicket } = require('../controllers/ticket.controller');

jest.mock('../models', () => {
  const mockTicket = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
  };
  const mockDepartment = {
    findByPk: jest.fn(),
  };
  const mockUser = {
    findByPk: jest.fn(),
  };
  return { Ticket: mockTicket, Department: mockDepartment, User: mockUser };
});

jest.mock('uuid', () => ({
  v4: () => 'aaaa-bbbb-cccc-dddd',
}));

const { Ticket, Department, User } = require('../models');

function mockReqRes(body = {}, params = {}, user = { id: 'user-1' }) {
  const req = { body, params, user };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

// ── GENERATE TICKET ─────────────────────────────────────────────────────────

describe('generateTicket', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when departmentId is missing', async () => {
    const { req, res } = mockReqRes({});
    await generateTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'departmentId is required' })
    );
  });

  it('returns 404 when department does not exist', async () => {
    Department.findByPk.mockResolvedValue(null);
    const { req, res } = mockReqRes({ departmentId: 'dept-1' });
    await generateTicket(req, res);
    expect(Department.findByPk).toHaveBeenCalledWith('dept-1');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Department not found' })
    );
  });

  it('returns 201 with created ticket on success', async () => {
    Department.findByPk.mockResolvedValue({ id: 'dept-1', name: 'Support' });
    const fakeTicket = {
      id: 'ticket-1',
      ticketNumber: 'TKT-123-AAAA',
      status: 'waiting',
      userId: 'user-1',
      departmentId: 'dept-1',
    };
    Ticket.create.mockResolvedValue(fakeTicket);

    const { req, res } = mockReqRes({ departmentId: 'dept-1' });
    await generateTicket(req, res);

    expect(Ticket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'waiting',
        userId: 'user-1',
        departmentId: 'dept-1',
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, ticket: fakeTicket })
    );
  });

  it('generates a ticketNumber starting with TKT-', async () => {
    Department.findByPk.mockResolvedValue({ id: 'dept-1' });
    Ticket.create.mockResolvedValue({});

    const { req, res } = mockReqRes({ departmentId: 'dept-1' });
    await generateTicket(req, res);

    const createCall = Ticket.create.mock.calls[0][0];
    expect(createCall.ticketNumber).toMatch(/^TKT-/);
  });

  it('returns 500 on unexpected error', async () => {
    Department.findByPk.mockRejectedValue(new Error('DB down'));
    const { req, res } = mockReqRes({ departmentId: 'dept-1' });
    await generateTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Server error' })
    );
  });
});

// ── GET MY TICKETS ──────────────────────────────────────────────────────────

describe('getMyTickets', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with user tickets', async () => {
    const fakeTickets = [
      { id: 't1', ticketNumber: 'TKT-1', status: 'waiting' },
      { id: 't2', ticketNumber: 'TKT-2', status: 'completed' },
    ];
    Ticket.findAll.mockResolvedValue(fakeTickets);

    const { req, res } = mockReqRes();
    await getMyTickets(req, res);

    expect(Ticket.findAll).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      order: [['createdAt', 'DESC']],
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, tickets: fakeTickets })
    );
  });

  it('returns empty array when user has no tickets', async () => {
    Ticket.findAll.mockResolvedValue([]);
    const { req, res } = mockReqRes();
    await getMyTickets(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ tickets: [] })
    );
  });

  it('returns 500 on unexpected error', async () => {
    Ticket.findAll.mockRejectedValue(new Error('DB down'));
    const { req, res } = mockReqRes();
    await getMyTickets(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Server error' })
    );
  });
});

// ── GET TICKET BY ID ────────────────────────────────────────────────────────

describe('getTicketById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with ticket when found and owned by user', async () => {
    const fakeTicket = { id: 'ticket-1', ticketNumber: 'TKT-1', status: 'waiting', userId: 'user-1' };
    Ticket.findOne.mockResolvedValue(fakeTicket);

    const { req, res } = mockReqRes({}, { id: 'ticket-1' });
    await getTicketById(req, res);

    expect(Ticket.findOne).toHaveBeenCalledWith({
      where: { id: 'ticket-1', userId: 'user-1' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, ticket: fakeTicket })
    );
  });

  it('returns 404 when ticket does not exist', async () => {
    Ticket.findOne.mockResolvedValue(null);
    const { req, res } = mockReqRes({}, { id: 'nonexistent' });
    await getTicketById(req, res);
    expect(Ticket.findOne).toHaveBeenCalledWith({
      where: { id: 'nonexistent', userId: 'user-1' },
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Ticket not found' })
    );
  });

  it('returns 404 when ticket belongs to another user (ownership enforced)', async () => {
    // Ticket exists but belongs to user-2; req.user.id is 'other-user'
    // The scoped query returns null because userId doesn't match
    Ticket.findOne.mockResolvedValue(null);
    const { req, res } = mockReqRes({}, { id: 'ticket-owned-by-other' }, { id: 'other-user' });
    await getTicketById(req, res);
    expect(Ticket.findOne).toHaveBeenCalledWith({
      where: { id: 'ticket-owned-by-other', userId: 'other-user' },
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Ticket not found' })
    );
  });

  it('returns 500 on unexpected error', async () => {
    Ticket.findOne.mockRejectedValue(new Error('DB down'));
    const { req, res } = mockReqRes({}, { id: 'ticket-1' });
    await getTicketById(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Server error' })
    );
  });
});

// ── CANCEL TICKET ───────────────────────────────────────────────────────────

describe('cancelTicket', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when ticket ID is not a valid UUID', async () => {
    const { req, res } = mockReqRes({}, { id: 'invalid-uuid' });
    await cancelTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid ticket ID format' })
    );
  });

  it('returns 404 when ticket does not exist', async () => {
    const validUuid = '12345678-1234-4234-a234-1234567890ab';
    Ticket.findByPk.mockResolvedValue(null);
    const { req, res } = mockReqRes({}, { id: validUuid });
    await cancelTicket(req, res);
    expect(Ticket.findByPk).toHaveBeenCalledWith(validUuid);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Ticket not found' })
    );
  });

  it('returns 404 when requesting user does not exist in DB', async () => {
    const validUuid = '12345678-1234-4234-a234-1234567890ab';
    const fakeTicket = { id: validUuid, userId: 'user-1', status: 'waiting' };
    Ticket.findByPk.mockResolvedValue(fakeTicket);
    User.findByPk.mockResolvedValue(null);

    const { req, res } = mockReqRes({}, { id: validUuid }, { id: 'user-1' });
    await cancelTicket(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'User not found' })
    );
  });

  it('returns 403 when user is not the owner and not an admin', async () => {
    const validUuid = '12345678-1234-4234-a234-1234567890ab';
    const fakeTicket = { id: validUuid, userId: 'user-owner', status: 'waiting' };
    Ticket.findByPk.mockResolvedValue(fakeTicket);
    User.findByPk.mockResolvedValue({ id: 'user-other', role: 'user' });

    const { req, res } = mockReqRes({}, { id: validUuid }, { id: 'user-other' });
    await cancelTicket(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Unauthorized access to this ticket' })
    );
  });

  it('returns 400 when status is not waiting (already serving/completed/cancelled)', async () => {
    const validUuid = '12345678-1234-4234-a234-1234567890ab';
    const fakeTicket = { id: validUuid, userId: 'user-1', status: 'serving' };
    Ticket.findByPk.mockResolvedValue(fakeTicket);
    User.findByPk.mockResolvedValue({ id: 'user-1', role: 'user' });

    const { req, res } = mockReqRes({}, { id: validUuid }, { id: 'user-1' });
    await cancelTicket(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Only tickets with status 'waiting' can be cancelled") })
    );
  });

  it('successfully cancels ticket when requested by owner', async () => {
    const validUuid = '12345678-1234-4234-a234-1234567890ab';
    const fakeTicket = { 
      id: validUuid, 
      userId: 'user-1', 
      status: 'waiting',
      departmentId: 'dept-1',
      ticketNumber: 'TKT-123',
      save: jest.fn().mockResolvedValue(true)
    };
    Ticket.findByPk.mockResolvedValue(fakeTicket);
    User.findByPk.mockResolvedValue({ id: 'user-1', role: 'user' });
    Ticket.findAll.mockResolvedValue([]);

    const { req, res } = mockReqRes({}, { id: validUuid }, { id: 'user-1' });
    await cancelTicket(req, res);

    expect(fakeTicket.status).toBe('cancelled');
    expect(fakeTicket.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Ticket cancelled successfully' })
    );
  });

  it('successfully cancels ticket when requested by admin', async () => {
    const validUuid = '12345678-1234-4234-a234-1234567890ab';
    const fakeTicket = { 
      id: validUuid, 
      userId: 'user-owner', 
      status: 'waiting',
      departmentId: 'dept-1',
      ticketNumber: 'TKT-123',
      save: jest.fn().mockResolvedValue(true)
    };
    Ticket.findByPk.mockResolvedValue(fakeTicket);
    User.findByPk.mockResolvedValue({ id: 'admin-user', role: 'admin' });
    Ticket.findAll.mockResolvedValue([]);

    const { req, res } = mockReqRes({}, { id: validUuid }, { id: 'admin-user' });
    await cancelTicket(req, res);

    expect(fakeTicket.status).toBe('cancelled');
    expect(fakeTicket.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
