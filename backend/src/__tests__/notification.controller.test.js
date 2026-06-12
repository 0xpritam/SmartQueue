// src/__tests__/notification.controller.test.js

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notification.controller');

jest.mock('../models', () => {
  const mockNotification = {
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };
  return { Notification: mockNotification };
});

const { Notification } = require('../models');

function mockReqRes(query = {}, params = {}, user = { id: 'user-1' }) {
  const mockIo = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };
  const req = {
    query,
    params,
    user,
    app: {
      get: jest.fn().mockReturnValue(mockIo),
    },
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res, mockIo };
}

describe('Notification Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('returns 200 with paginated notifications list and metadata', async () => {
      const mockRows = [
        { id: 'notif-1', title: 'Test Notif 1', isRead: false },
        { id: 'notif-2', title: 'Test Notif 2', isRead: true },
      ];
      Notification.findAndCountAll.mockResolvedValue({
        count: 15,
        rows: mockRows,
      });

      const { req, res } = mockReqRes({ page: '2', limit: '5' });
      await getNotifications(req, res);

      expect(Notification.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          limit: 5,
          offset: 5,
          order: [['createdAt', 'DESC']],
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        notifications: mockRows,
        pagination: {
          totalCount: 15,
          totalPages: 3,
          currentPage: 2,
          limit: 5,
        },
      });
    });

    it('falls back to default page 1 and limit 20 when missing params', async () => {
      Notification.findAndCountAll.mockResolvedValue({
        count: 5,
        rows: [],
      });

      const { req, res } = mockReqRes({});
      await getNotifications(req, res);

      expect(Notification.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          limit: 20,
          offset: 0,
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 500 when database throws an error', async () => {
      Notification.findAndCountAll.mockRejectedValue(new Error('Database error'));
      const { req, res } = mockReqRes({});
      await getNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Server error',
        })
      );
    });
  });

  describe('markAsRead', () => {
    it('marks a single notification as read, emits socket event, and returns 200', async () => {
      const mockSave = jest.fn();
      const mockNotificationInstance = {
        id: 'notif-1',
        userId: 'user-1',
        isRead: false,
        save: mockSave,
      };
      Notification.findOne.mockResolvedValue(mockNotificationInstance);

      const { req, res, mockIo } = mockReqRes({}, { id: 'notif-1' });
      await markAsRead(req, res);

      expect(Notification.findOne).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
      });
      expect(mockNotificationInstance.isRead).toBe(true);
      expect(mockSave).toHaveBeenCalled();
      expect(mockIo.to).toHaveBeenCalledWith('user:user-1');
      expect(mockIo.emit).toHaveBeenCalledWith('notification_read', { id: 'notif-1' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        notification: mockNotificationInstance,
      });
    });

    it('returns 404 when notification is not found', async () => {
      Notification.findOne.mockResolvedValue(null);

      const { req, res } = mockReqRes({}, { id: 'notif-invalid' });
      await markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Notification not found',
        })
      );
    });

    it('returns 500 when database throws error', async () => {
      Notification.findOne.mockRejectedValue(new Error('Database error'));

      const { req, res } = mockReqRes({}, { id: 'notif-1' });
      await markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('markAllAsRead', () => {
    it('updates all unread notifications to read, emits socket event, and returns 200', async () => {
      Notification.update.mockResolvedValue([5]); // updates 5 rows

      const { req, res, mockIo } = mockReqRes();
      await markAllAsRead(req, res);

      expect(Notification.update).toHaveBeenCalledWith(
        { isRead: true },
        { where: { userId: 'user-1', isRead: false } }
      );
      expect(mockIo.to).toHaveBeenCalledWith('user:user-1');
      expect(mockIo.emit).toHaveBeenCalledWith('all_notifications_read');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'All notifications marked as read',
      });
    });

    it('returns 500 when database throws error', async () => {
      Notification.update.mockRejectedValue(new Error('Database error'));

      const { req, res } = mockReqRes();
      await markAllAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
