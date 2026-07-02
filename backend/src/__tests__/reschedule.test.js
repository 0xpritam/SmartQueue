const { rescheduleTicket } = require('../controllers/ticket.controller');

jest.mock('../models', () => {
  const mockTicket = {
    findByPk: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    count: jest.fn(),
    findOne: jest.fn(),
  };
  const mockDepartment = {
    findByPk: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
  };
  const mockUser = {
    findByPk: jest.fn(),
  };
  const mockSequelize = {
    fn: jest.fn((fnName, ...args) => ({ fnName, args })),
    col: jest.fn(colName => ({ colName })),
    literal: jest.fn(str => str),
    options: { dialect: 'sqlite' },
  };
  return {
    Ticket: mockTicket,
    Department: mockDepartment,
    User: mockUser,
    sequelize: mockSequelize,
  };
});

jest.mock('../utils/notification', () => ({
  handleQueuePositionChanges: jest.fn(),
  sendRescheduleNotification: jest.fn().mockResolvedValue(null),
}));

const { Ticket, Department } = require('../models');
const { handleQueuePositionChanges, sendRescheduleNotification } = require('../utils/notification');

function mockReqRes(body = {}, params = {}, user = { id: 'user-1' }) {
  const ioEmit = jest.fn();
  const ioTo = jest.fn(() => ({ emit: ioEmit }));
  const req = {
    body,
    params,
    user,
    app: {
      get: jest.fn(() => ({
        to: ioTo,
        emit: ioEmit,
      })),
    },
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res, ioTo, ioEmit };
}

describe('rescheduleTicket Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Department.findAll.mockResolvedValue([]);
    Ticket.findOne.mockResolvedValue(null);
    Ticket.count.mockResolvedValue(0);
  });

  it('returns 400 when destination departmentId is missing', async () => {
    const { req, res } = mockReqRes({}, { id: 'ticket-1' });
    await rescheduleTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Destination departmentId is required' })
    );
  });

  it('returns 404 when ticket does not exist', async () => {
    Ticket.findByPk.mockResolvedValue(null);
    const { req, res } = mockReqRes({ departmentId: 'dept-2' }, { id: 'ticket-1' });
    await rescheduleTicket(req, res);
    expect(Ticket.findByPk).toHaveBeenCalledWith('ticket-1');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Ticket not found' })
    );
  });

  it('returns 403 when user is not the ticket owner', async () => {
    Ticket.findByPk.mockResolvedValue({ id: 'ticket-1', userId: 'user-different', status: 'waiting' });
    const { req, res } = mockReqRes({ departmentId: 'dept-2' }, { id: 'ticket-1' }, { id: 'user-owner' });
    await rescheduleTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Unauthorized: You can only reschedule your own tickets' })
    );
  });

  it('returns 400 when ticket status is completed', async () => {
    Ticket.findByPk.mockResolvedValue({ id: 'ticket-1', userId: 'user-1', status: 'completed' });
    const { req, res } = mockReqRes({ departmentId: 'dept-2' }, { id: 'ticket-1' });
    await rescheduleTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Only tickets with status \'waiting\' can be rescheduled') })
    );
  });

  it('returns 400 when ticket status is cancelled', async () => {
    Ticket.findByPk.mockResolvedValue({ id: 'ticket-1', userId: 'user-1', status: 'cancelled' });
    const { req, res } = mockReqRes({ departmentId: 'dept-2' }, { id: 'ticket-1' });
    await rescheduleTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Only tickets with status \'waiting\' can be rescheduled') })
    );
  });

  it('returns 400 when ticket status is serving', async () => {
    Ticket.findByPk.mockResolvedValue({ id: 'ticket-1', userId: 'user-1', status: 'serving' });
    const { req, res } = mockReqRes({ departmentId: 'dept-2' }, { id: 'ticket-1' });
    await rescheduleTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Only tickets with status \'waiting\' can be rescheduled') })
    );
  });

  it('returns 404 when destination department does not exist', async () => {
    Ticket.findByPk.mockResolvedValue({ id: 'ticket-1', userId: 'user-1', status: 'waiting', departmentId: 'dept-1' });
    Department.findByPk.mockResolvedValue(null);
    const { req, res } = mockReqRes({ departmentId: 'dept-2' }, { id: 'ticket-1' });
    await rescheduleTicket(req, res);
    expect(Department.findByPk).toHaveBeenCalledWith('dept-2');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Destination department does not exist' })
    );
  });

  it('returns 400 when destination department is the same as current department', async () => {
    Ticket.findByPk.mockResolvedValue({ id: 'ticket-1', userId: 'user-1', status: 'waiting', departmentId: 'dept-1' });
    Department.findByPk.mockResolvedValue({ id: 'dept-1', name: 'Cardiology' });
    const { req, res } = mockReqRes({ departmentId: 'dept-1' }, { id: 'ticket-1' });
    await rescheduleTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Destination department cannot be the same as the current department' })
    );
  });

  it('successfully reschedules waiting ticket, updating database fields, triggering sockets, shifts, and notifications', async () => {
    const mockSave = jest.fn().mockResolvedValue(true);
    const mockTicketObj = {
      id: 'ticket-1',
      userId: 'user-1',
      departmentId: 'dept-1',
      status: 'waiting',
      save: mockSave,
    };
    Ticket.findByPk.mockResolvedValue(mockTicketObj);
    Department.findByPk.mockResolvedValue({ id: 'dept-2', name: 'Cardiology' });

    // Mock Ticket.findAll for old department before/after and new department before/after
    Ticket.findAll
      .mockResolvedValueOnce([mockTicketObj, { id: 'ticket-2', status: 'waiting' }]) // old dept before
      .mockResolvedValueOnce([{ id: 'ticket-3', status: 'waiting' }]) // new dept before
      .mockResolvedValueOnce([{ id: 'ticket-2', status: 'waiting' }]) // old dept after
      .mockResolvedValueOnce([{ id: 'ticket-3', status: 'waiting' }, mockTicketObj]); // new dept after

    const { req, res, ioTo, ioEmit } = mockReqRes({ departmentId: 'dept-2' }, { id: 'ticket-1' });

    await rescheduleTicket(req, res);

    expect(mockTicketObj.departmentId).toBe('dept-2');
    expect(mockTicketObj.rescheduledAt).toBeInstanceOf(Date);
    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Ticket rescheduled successfully',
      })
    );

    // Sockets emissions check
    expect(ioTo).toHaveBeenCalledWith('ticket_ticket-1');
    expect(ioTo).toHaveBeenCalledWith('department_dept-1');
    expect(ioTo).toHaveBeenCalledWith('department_dept-2');
    expect(ioEmit).toHaveBeenCalled();

    // Check queue shifts are called
    expect(handleQueuePositionChanges).toHaveBeenCalledTimes(2);

    // Check reschedule notification is triggered
    expect(sendRescheduleNotification).toHaveBeenCalledWith(expect.anything(), mockTicketObj, 'dept-1', 1);
  });
});
