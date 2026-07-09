const request = require('supertest');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

// Mock Sequelize models
jest.mock('../models', () => {
  const mockUser = {
    findByPk: jest.fn()
  };
  const mockAuditLog = {
    findAll: jest.fn()
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

describe('Audit Log Export API Tests', () => {
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
        return { id: 'admin-1', role: 'admin', name: 'Admin Tester', email: 'admin@test.com' };
      }
      if (id === 'staff-1') {
        return { id: 'staff-1', role: 'staff', name: 'Staff Tester', email: 'staff@test.com' };
      }
      if (id === 'patient-1') {
        return { id: 'patient-1', role: 'user', name: 'Patient Tester', email: 'patient@test.com' };
      }
      return null;
    });
  });

  describe('Authorization checks for exports', () => {
    it('allows Admin to export CSV', async () => {
      AuditLog.findAll.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/admin/audit-logs/export/csv')
        .set('Authorization', adminToken);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
    });

    it('allows Admin to export PDF', async () => {
      AuditLog.findAll.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/admin/audit-logs/export/pdf')
        .set('Authorization', adminToken);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

    it('denies CSV export to Staff with 403', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs/export/csv')
        .set('Authorization', staffToken);

      expect(res.status).toBe(403);
    });

    it('denies PDF export to Patients with 403', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs/export/pdf')
        .set('Authorization', patientToken);

      expect(res.status).toBe(403);
    });
  });

  describe('CSV Export formatting and escaping', () => {
    it('returns CSV content with correct headers and escaped quote characters', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: 'LOGIN_SUCCESS',
          entityType: 'User',
          entityId: 'user-1',
          description: 'User "Admin" logged in successfully',
          role: 'admin',
          ipAddress: '127.0.0.1',
          metadata: { browser: 'Chrome' },
          createdAt: new Date('2026-07-10T00:00:00.000Z'),
          user: { name: 'Admin Tester', email: 'admin@test.com' }
        }
      ];
      AuditLog.findAll.mockResolvedValue(mockLogs);

      const res = await request(app)
        .get('/api/admin/audit-logs/export/csv')
        .set('Authorization', adminToken);

      expect(res.status).toBe(200);
      const csvText = res.text;

      // Verify UTF-8 BOM is present
      expect(csvText.startsWith('\uFEFF')).toBe(true);

      // Verify Header columns exist
      expect(csvText).toContain('Timestamp,User Name,User Email,Role,Action,Entity Type,Entity ID,Description,IP Address,Metadata');

      // Verify double-quote escaping
      expect(csvText).toContain('"User ""Admin"" logged in successfully"');
      expect(csvText).toContain('"{""browser"":""Chrome""}"');
    });
  });

  describe('Filtering and parameters', () => {
    it('applies filters and sort orders correctly on Sequelize query', async () => {
      AuditLog.findAll.mockResolvedValue([]);

      await request(app)
        .get('/api/admin/audit-logs/export/csv?action=BOOK_TICKET&role=admin&search=ticket&from=2026-07-01&to=2026-07-31&sortBy=action&sortOrder=ASC')
        .set('Authorization', adminToken);

      expect(AuditLog.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'BOOK_TICKET',
            role: 'admin',
            [Op.or]: [
              { description: { [Op.like]: '%ticket%' } },
              { action: { [Op.like]: '%ticket%' } },
              { entityType: { [Op.like]: '%ticket%' } }
            ],
            createdAt: {
              [Op.gte]: new Date('2026-07-01T00:00:00.000Z'),
              [Op.lte]: new Date('2026-07-31T23:59:59.999Z')
            }
          }),
          order: [['action', 'ASC']]
        })
      );
    });

    it('exports empty results successfully', async () => {
      AuditLog.findAll.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/admin/audit-logs/export/csv')
        .set('Authorization', adminToken);

      expect(res.status).toBe(200);
      expect(res.text).toContain('Timestamp,User Name,User Email,Role,Action,Entity Type,Entity ID,Description,IP Address,Metadata\n');
    });
  });
});
