const {
  createNotification,
  handleQueuePositionChanges,
  getCleanTicketNumber,
  sendBookingNotification,
  sendCancellationNotification,
  sendCompletionNotification,
  sendServingNotification,
  sendQueueReminderNotification,
} = require('../utils/notification');

jest.mock('../models', () => {
  const mockNotification = {
    create: jest.fn(),
    count: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn(),
  };
  const mockTicket = {
    findAll: jest.fn(),
  };
  const mockUser = {
    findByPk: jest.fn(),
  };
  const mockDepartment = {
    findByPk: jest.fn(),
  };
  return { Notification: mockNotification, Ticket: mockTicket, User: mockUser, Department: mockDepartment };
});

jest.mock('../services/email.service', () => ({
  sendBookingEmail: jest.fn().mockResolvedValue({}),
  sendCancellationEmail: jest.fn().mockResolvedValue({}),
  sendCompletionEmail: jest.fn().mockResolvedValue({}),
  sendQueueReminderEmail: jest.fn().mockResolvedValue({}),
}));

const { Notification, Ticket, User, Department } = require('../models');
const emailService = require('../services/email.service');

describe('Notification Helper Utilities', () => {
  const mockIo = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCleanTicketNumber', () => {
    it('formats a full UUID ticket number correctly', () => {
      const fakeTicket = { ticketNumber: 'TKT-1717892300000-ABCDEF123456', id: 'uuid-1' };
      expect(getCleanTicketNumber(fakeTicket)).toBe('TKT-ABCDEF');
    });

    it('falls back to ticket id if ticketNumber has no parts', () => {
      const fakeTicket = { ticketNumber: '', id: 'abcdef-uuid' };
      expect(getCleanTicketNumber(fakeTicket)).toBe('TKT-abcdef');
    });

    it('returns empty string if ticket is missing', () => {
      expect(getCleanTicketNumber(null)).toBe('');
    });
  });

  describe('createNotification', () => {
    it('creates notification in database, prunes, and emits socket event', async () => {
      const fakeNotif = {
        id: 'notif-1',
        userId: 'user-1',
        title: 'Alert',
        message: 'Hello',
        type: 'system',
      };
      Notification.create.mockResolvedValue(fakeNotif);
      Notification.count.mockResolvedValue(50); // under 100 limit, so no prune

      const res = await createNotification(mockIo, {
        userId: 'user-1',
        ticketId: 'ticket-1',
        title: 'Alert',
        message: 'Hello',
        type: 'system',
      });

      expect(Notification.create).toHaveBeenCalledWith({
        userId: 'user-1',
        ticketId: 'ticket-1',
        title: 'Alert',
        message: 'Hello',
        type: 'system',
      });
      expect(mockIo.to).toHaveBeenCalledWith('user:user-1');
      expect(mockIo.emit).toHaveBeenCalledWith('new_notification', fakeNotif);
      expect(res).toBe(fakeNotif);
    });

    it('prunes notifications if count exceeds 100 limit', async () => {
      const fakeNotif = { id: 'notif-1', userId: 'user-1' };
      Notification.create.mockResolvedValue(fakeNotif);
      Notification.count.mockResolvedValue(105);
      Notification.findOne.mockResolvedValue({ createdAt: new Date('2026-06-01') });
      Notification.destroy.mockResolvedValue(5);

      await createNotification(mockIo, {
        userId: 'user-1',
        title: 'Pruning Test',
        message: 'Prune me',
        type: 'system',
      });

      // Wait a tiny bit for the async prune promise chain to resolve
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(Notification.count).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(Notification.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: [['createdAt', 'DESC']],
        offset: 99,
      });
      expect(Notification.destroy).toHaveBeenCalled();
    });

    it('recovers gracefully and returns null on database error (non-blocking test)', async () => {
      Notification.create.mockRejectedValue(new Error('Connection timeout'));

      const res = await createNotification(mockIo, {
        userId: 'user-1',
        title: 'Alert',
        message: 'Hello',
        type: 'system',
      });

      expect(res).toBeNull(); // handled and didn't crash execution
    });
  });

  describe('handleQueuePositionChanges', () => {
    it('notifies affected waiting tickets when queue shifts', async () => {
      const ticketsBefore = [
        { id: 'tkt-1', userId: 'user-1', status: 'waiting' },
        { id: 'tkt-2', userId: 'user-2', status: 'waiting' },
        { id: 'tkt-3', userId: 'user-3', status: 'waiting' },
      ];

      // tkt-1 is promoted, so tkt-2 becomes next (index 0) and tkt-3 shifts to index 1
      const ticketsAfter = [
        { id: 'tkt-2', userId: 'user-2', status: 'waiting' },
        { id: 'tkt-3', userId: 'user-3', status: 'waiting' },
      ];

      Notification.create.mockResolvedValue({});
      Notification.count.mockResolvedValue(0);

      await handleQueuePositionChanges(mockIo, 'dept-1', ticketsBefore, ticketsAfter);

      // We expect 2 notifications created:
      // tkt-2 becomes next: "You are next in the queue."
      // tkt-3 shifts: "Your queue position has changed."
      expect(Notification.create).toHaveBeenCalledTimes(2);

      // First call check: user-2
      expect(Notification.create).toHaveBeenNettedCallWith(
        expect.objectContaining({
          userId: 'user-2',
          title: 'Queue Update',
          message: 'You are next in the queue.',
        })
      );

      // Second call check: user-3
      expect(Notification.create).toHaveBeenNettedCallWith(
        expect.objectContaining({
          userId: 'user-3',
          title: 'Queue Update',
          message: 'Your queue position has changed.',
        })
      );
    });
  });

  describe('Orchestration Layer Functions', () => {
    it('sendBookingNotification creates in-app notification and sends email', async () => {
      const fakeTicket = { id: 't1', departmentId: 'd1' };
      const fakeUser = { id: 'u1', name: 'Bob', email: 'bob@example.com' };
      const fakeDept = { id: 'd1', name: 'Pediatrics' };

      Notification.create.mockResolvedValue({});
      Notification.count.mockResolvedValue(0);
      User.findByPk.mockResolvedValue(fakeUser);
      Department.findByPk.mockResolvedValue(fakeDept);

      await sendBookingNotification(mockIo, fakeTicket, 'u1');

      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          title: 'Ticket Booked',
        })
      );

      // wait for microtasks to resolve for async email call
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(emailService.sendBookingEmail).toHaveBeenCalledWith(
        fakeUser,
        fakeDept,
        fakeTicket
      );
    });

    it('sendCancellationNotification creates in-app notification and sends email', async () => {
      const fakeTicket = { id: 't1', userId: 'u1', departmentId: 'd1' };
      const fakeUser = { id: 'u1', name: 'Bob', email: 'bob@example.com' };
      const fakeDept = { id: 'd1', name: 'Pediatrics' };

      Notification.create.mockResolvedValue({});
      Notification.count.mockResolvedValue(0);
      User.findByPk.mockResolvedValue(fakeUser);
      Department.findByPk.mockResolvedValue(fakeDept);

      await sendCancellationNotification(mockIo, fakeTicket);

      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          title: 'Ticket Cancelled',
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(emailService.sendCancellationEmail).toHaveBeenCalledWith(
        fakeUser,
        fakeDept,
        fakeTicket
      );
    });

    it('sendCompletionNotification creates in-app notification and sends email', async () => {
      const fakeTicket = { id: 't1', userId: 'u1', departmentId: 'd1' };
      const fakeUser = { id: 'u1', name: 'Bob', email: 'bob@example.com' };
      const fakeDept = { id: 'd1', name: 'Pediatrics' };

      Notification.create.mockResolvedValue({});
      Notification.count.mockResolvedValue(0);
      User.findByPk.mockResolvedValue(fakeUser);
      Department.findByPk.mockResolvedValue(fakeDept);

      await sendCompletionNotification(mockIo, fakeTicket);

      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          title: 'Visit Completed',
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(emailService.sendCompletionEmail).toHaveBeenCalledWith(
        fakeUser,
        fakeDept,
        fakeTicket
      );
    });

    it('handleQueuePositionChanges triggers queue reminder notification when indexAfter is 3', async () => {
      const ticketsBefore = [
        { id: 'tkt-1', userId: 'user-1', status: 'waiting' },
        { id: 'tkt-2', userId: 'user-2', status: 'waiting' },
        { id: 'tkt-3', userId: 'user-3', status: 'waiting' },
        { id: 'tkt-4', userId: 'user-4', status: 'waiting' },
        { id: 'tkt-5', userId: 'user-5', status: 'waiting' },
      ];

      // tkt-1 is called/serving, so queue shifts up.
      // tkt-5 shifts from index 4 to index 3!
      const ticketsAfter = [
        { id: 'tkt-2', userId: 'user-2', status: 'waiting' },
        { id: 'tkt-3', userId: 'user-3', status: 'waiting' },
        { id: 'tkt-4', userId: 'user-4', status: 'waiting' },
        { id: 'tkt-5', userId: 'user-5', status: 'waiting' },
      ];

      Notification.create.mockResolvedValue({});
      Notification.count.mockResolvedValue(0);
      User.findByPk.mockResolvedValue({ id: 'user-5', email: 'u5@example.com' });
      Department.findByPk.mockResolvedValue({ id: 'd1', name: 'Dental' });

      await handleQueuePositionChanges(mockIo, 'dept-1', ticketsBefore, ticketsAfter);

      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-5',
          title: 'Queue Reminder',
          message: 'Your turn is approaching. Please arrive at the hospital.',
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(emailService.sendQueueReminderEmail).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        4
      );
    });
  });
});

// Jest custom helper helper
beforeAll(() => {
  expect.extend({
    toHaveBeenNettedCallWith(receivedMock, expectedArg) {
      const pass = receivedMock.mock.calls.some((call) => {
        try {
          expect(call[0]).toEqual(expectedArg);
          return true;
        } catch {
          return false;
        }
      });

      return {
        pass,
        message: () => `Expected mock to be called with ${JSON.stringify(expectedArg)}`,
      };
    },
  });
});
