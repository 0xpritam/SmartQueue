const { Sequelize, DataTypes } = require('sequelize');
const defineAuditLog = require('../models/auditLog');
const defineUser = require('../models/user');

describe('Audit Logger and Model', () => {
  let sequelize;
  let AuditLog;
  let User;
  let logAudit;

  beforeAll(async () => {
    // Set up in-memory sqlite database for testing
    sequelize = new Sequelize('sqlite::memory:', { logging: false });

    // Define the models using their factory functions
    User = defineUser(sequelize);
    AuditLog = defineAuditLog(sequelize);

    // Set up associations
    AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });

    // Sync database schema
    await sequelize.sync({ force: true });
    await sequelize.query('PRAGMA foreign_keys = OFF;');

    // Mock '../models' module for auditLogger import
    jest.doMock('../models', () => ({
      sequelize,
      AuditLog,
      User,
    }));

    // Import the utility after mocking
    const auditLogger = require('../utils/auditLogger');
    logAudit = auditLogger.logAudit;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await AuditLog.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  it('successfully creates an audit record', async () => {
    const user = await User.create({
      name: 'John Staff',
      email: 'john.staff@example.com',
      password: 'password123',
      role: 'staff',
    });

    await logAudit({
      userId: user.id,
      role: 'staff',
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      description: 'Staff member logged in',
      ipAddress: '192.168.1.1',
      metadata: { departmentId: 'dept-1' },
    });

    const logs = await AuditLog.findAll();
    expect(logs).toHaveLength(1);
    expect(logs[0].userId).toBe(user.id);
    expect(logs[0].role).toBe('staff');
    expect(logs[0].action).toBe('LOGIN');
    expect(logs[0].entityType).toBe('User');
    expect(logs[0].entityId).toBe(user.id);
    expect(logs[0].description).toBe('Staff member logged in');
    expect(logs[0].ipAddress).toBe('192.168.1.1');
  });

  it('persists metadata as JSON', async () => {
    const user = await User.create({
      name: 'Patient User',
      email: 'patient@example.com',
      password: 'password123',
      role: 'user',
    });

    const testMetadata = {
      ticketNumber: 'TKT-1234',
      queuePosition: 3,
      nested: { key: 'value' }
    };

    await logAudit({
      userId: user.id,
      role: 'user',
      action: 'BOOK_TICKET',
      entityType: 'Ticket',
      entityId: 'ticket-1',
      description: 'Booked ticket TKT-1234',
      ipAddress: '127.0.0.1',
      metadata: testMetadata,
    });

    const logs = await AuditLog.findAll();
    expect(logs).toHaveLength(1);
    // Parse metadata if sqlite returns it as a string
    const metadata = typeof logs[0].metadata === 'string' ? JSON.parse(logs[0].metadata) : logs[0].metadata;
    expect(metadata).toEqual(testMetadata);
  });

  it('falls back to resolving user role from database if not explicitly provided', async () => {
    const user = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });

    await logAudit({
      userId: user.id,
      action: 'CREATE_DEPARTMENT',
      entityType: 'Department',
      entityId: 'dept-2',
      description: 'Created department',
      ipAddress: '127.0.0.1',
    });

    const logs = await AuditLog.findAll();
    expect(logs).toHaveLength(1);
    expect(logs[0].role).toBe('admin');
  });

  it('gracefully handles missing or unavailable AuditLog model without throwing error', async () => {
    // Temporarily mock '../models' to not return AuditLog
    jest.resetModules();
    jest.doMock('../models', () => ({
      sequelize,
      User,
    }));
    const { logAudit: logAuditLocal } = require('../utils/auditLogger');

    await expect(
      logAuditLocal({
        userId: 'some-id',
        action: 'TEST_ACTION',
      })
    ).resolves.not.toThrow();
  });

  it('gracefully handles database failure during creation and does not interrupt execution', async () => {
    // Mock AuditLog.create to throw a database connection error
    const originalCreate = AuditLog.create;
    AuditLog.create = jest.fn().mockRejectedValue(new Error('Database connection lost'));

    await expect(
      logAudit({
        userId: 'some-id',
        action: 'TEST_ACTION',
      })
    ).resolves.not.toThrow();

    // Restore original create
    AuditLog.create = originalCreate;
  });
});
