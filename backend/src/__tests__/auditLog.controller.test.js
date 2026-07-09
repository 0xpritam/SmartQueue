const request = require('supertest');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

// Mock Sequelize models
jest.mock('../models', () => {
  const mockUser = {
    findByPk: jest.fn()
  };
  const mockAuditLog = {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn()
  };
  return {
    User: mockUser,
    AuditLog: mockAuditLog
  };
});

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));

const app = require('../app');
const { User, AuditLog } = require('../models');

describe('Audit Log Management API Tests', () => {
  const adminToken = 'Bearer admin-token';
  const staffToken = 'Bearer staff-token';
  const patientToken = 'Bearer patient-token';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';

    // Mock jwt.verify implementation to return user payloads matching tokens
    jwt.verify.mockImplementation((token, secret) => {
      if (token === 'admin-token') {
        return { id: 'admin-1', role: 'admin' };
      }
      if (token === 'staff-token') {
        return { id: 'staff-1', role: 'staff' };
      }
      if (token === 'patient-token') {
        return { id: 'patient-1', role: 'user' };
      }
      throw new Error('invalid token');
    });

    // Mock User.findByPk for the isAdmin middleware role validation
    User.findByPk.mockImplementation(async (id) => {
      if (id === 'admin-1') {
        return { id: 'admin-1', role: 'admin' };
      }
      if (id === 'staff-1') {
        return { id: 'staff-1', role: 'staff' };
      }
      if (id === 'patient-1') {
        return { id: 'patient-1', role: 'user' };
      }
      return null;
    });
  });

  describe('Authorization checks', () => {
    it('allows Admin to access audit logs', async () => {
      AuditLog.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', adminToken);

      expect(res.status).toBe(200);
      expect(res.body.logs).toEqual([]);
    });

    it('denies access to Staff with 403', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', staffToken);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    it('denies access to Patients with 403', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', patientToken);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    it('returns 403 when user is not found in database', async () => {
      User.findByPk.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', adminToken);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    it('returns 500 when isAdmin middleware encounters a database error', async () => {
      User.findByPk.mockRejectedValue(new Error('DB connection failed'));

      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', adminToken);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Server error');
    });
  });

  describe('Pagination, Filtering, Sorting and Search', () => {
    it('returns logs with correct pagination properties', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: 'BOOK_TICKET',
          entityType: 'Ticket',
          entityId: 'tkt-1',
          description: 'Booked ticket TKT-1',
          role: 'user',
          createdAt: '2026-07-10T00:00:00.000Z',
          user: { id: 'patient-1', name: 'Patient Test', email: 'patient@test.com' }
        }
      ];
      AuditLog.findAndCountAll.mockResolvedValue({ count: 15, rows: mockLogs });

      const res = await request(app)
        .get('/api/admin/audit-logs?page=2&limit=5')
        .set('Authorization', adminToken);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        page: 2,
        limit: 5,
        total: 15,
        pages: 3,
        logs: mockLogs
      });

      expect(AuditLog.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 5,
          offset: 5
        })
      );
    });

    it('caps limit at 100 if a higher limit is requested', async () => {
      AuditLog.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await request(app)
        .get('/api/admin/audit-logs?limit=200')
        .set('Authorization', adminToken);

      expect(AuditLog.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100
        })
      );
    });

    it('filters by action, role, userId, and entityType', async () => {
      AuditLog.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await request(app)
        .get('/api/admin/audit-logs?action=BOOK_TICKET&role=staff&userId=user-123&entityType=Ticket')
        .set('Authorization', adminToken);

      expect(AuditLog.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'BOOK_TICKET',
            role: 'staff',
            userId: 'user-123',
            entityType: 'Ticket'
          })
        })
      );
    });

    it('supports date range filtering with from and to parameters', async () => {
      AuditLog.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await request(app)
        .get('/api/admin/audit-logs?from=2026-07-01&to=2026-07-31')
        .set('Authorization', adminToken);

      expect(AuditLog.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              [Op.gte]: new Date('2026-07-01T00:00:00.000Z'),
              [Op.lte]: new Date('2026-07-31T23:59:59.999Z')
            }
          })
        })
      );
    });

    it('falls back to standard parser if date format is invalid YYYY-MM-DD', async () => {
      AuditLog.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await request(app)
        .get('/api/admin/audit-logs?to=2026-99-99')
        .set('Authorization', adminToken);

      expect(AuditLog.findAndCountAll).toHaveBeenCalled();
    });

    it('filters correctly by search query', async () => {
      AuditLog.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await request(app)
        .get('/api/admin/audit-logs?search=cancel')
        .set('Authorization', adminToken);

      expect(AuditLog.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [Op.or]: [
              { description: { [Op.like]: '%cancel%' } },
              { action: { [Op.like]: '%cancel%' } },
              { entityType: { [Op.like]: '%cancel%' } }
            ]
          })
        })
      );
    });

    it('applies custom sorting parameters when valid', async () => {
      AuditLog.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await request(app)
        .get('/api/admin/audit-logs?sortBy=action&sortOrder=ASC')
        .set('Authorization', adminToken);

      expect(AuditLog.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [['action', 'ASC']]
        })
      );
    });

    it('gracefully falls back to default sorting when invalid parameters are supplied', async () => {
      AuditLog.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await request(app)
        .get('/api/admin/audit-logs?sortBy=invalid_column&sortOrder=invalid_order')
        .set('Authorization', adminToken);

      expect(AuditLog.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [['createdAt', 'DESC']]
        })
      );
    });

    it('returns 500 when getAuditLogs controller encounters a database error', async () => {
      AuditLog.findAndCountAll.mockRejectedValue(new Error('Query failed'));

      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', adminToken);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Server error');
    });
  });

  describe('Get single log by ID', () => {
    it('returns the audit log details if found', async () => {
      const mockLog = {
        id: 'log-1',
        action: 'BOOK_TICKET',
        entityType: 'Ticket',
        entityId: 'tkt-1',
        description: 'Booked ticket TKT-1',
        role: 'user',
        createdAt: '2026-07-10T00:00:00.000Z',
        metadata: { ip: '127.0.0.1' },
        user: { id: 'patient-1', name: 'Patient Test', email: 'patient@test.com' }
      };
      AuditLog.findByPk.mockResolvedValue(mockLog);

      const res = await request(app)
        .get('/api/admin/audit-logs/log-1')
        .set('Authorization', adminToken);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockLog);
      expect(AuditLog.findByPk).toHaveBeenCalledWith(
        'log-1',
        expect.objectContaining({
          include: [
            expect.objectContaining({
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email']
            })
          ]
        })
      );
    });

    it('returns 404 when log is not found', async () => {
      AuditLog.findByPk.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/admin/audit-logs/non-existent')
        .set('Authorization', adminToken);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });

    it('denies single log access to Staff with 403', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs/log-1')
        .set('Authorization', staffToken);

      expect(res.status).toBe(403);
    });

    it('denies single log access to Patients with 403', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs/log-1')
        .set('Authorization', patientToken);

      expect(res.status).toBe(403);
    });

    it('returns 500 when getAuditLogById controller encounters a database error', async () => {
      AuditLog.findByPk.mockRejectedValue(new Error('Query failed'));

      const res = await request(app)
        .get('/api/admin/audit-logs/log-1')
        .set('Authorization', adminToken);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Server error');
    });
  });
});
