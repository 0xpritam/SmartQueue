const { Sequelize, DataTypes } = require('sequelize');
const defineTicket = require('../models/ticket');

describe('Ticket model definition', () => {
  let sequelize;
  let Ticket;

  beforeAll(() => {
    sequelize = new Sequelize('mysql://localhost', { logging: false });
    Ticket = defineTicket(sequelize);
  });

  it('exports a factory function', () => {
    expect(typeof defineTicket).toBe('function');
  });

  it('returns a Sequelize Model class', () => {
    expect(Ticket.prototype).toBeDefined();
    expect(typeof Ticket.init).toBe('function');
  });

  it('maps to the "tickets" table', () => {
    expect(Ticket.getTableName()).toBe('tickets');
  });

  it('has model name "Ticket"', () => {
    expect(Ticket.name).toBe('Ticket');
  });

  // ── Field definitions ────────────────────────────────────────────────

  describe('id field', () => {
    it('is UUID type', () => {
      const attr = Ticket.rawAttributes.id;
      expect(attr.type instanceof DataTypes.UUID).toBe(true);
    });

    it('is primary key', () => {
      expect(Ticket.rawAttributes.id.primaryKey).toBe(true);
    });

    it('has a default value', () => {
      const attr = Ticket.rawAttributes.id;
      expect(attr.defaultValue).toBeDefined();
    });

    it('does not allow null', () => {
      expect(Ticket.rawAttributes.id.allowNull).toBe(false);
    });
  });

  describe('ticketNumber field', () => {
    it('is STRING type', () => {
      const attr = Ticket.rawAttributes.ticketNumber;
      expect(attr.type instanceof DataTypes.STRING).toBe(true);
    });

    it('does not allow null', () => {
      expect(Ticket.rawAttributes.ticketNumber.allowNull).toBe(false);
    });

    it('has notEmpty validator', () => {
      const validators = Ticket.rawAttributes.ticketNumber.validate;
      expect(validators.notEmpty).toBeDefined();
    });
  });

  describe('status field', () => {
    it('is ENUM type', () => {
      const attr = Ticket.rawAttributes.status;
      expect(attr.type instanceof DataTypes.ENUM).toBe(true);
    });

    it('allows only "waiting", "serving", "completed", and "cancelled"', () => {
      const values = Ticket.rawAttributes.status.type.values;
      expect(values).toEqual(['waiting', 'serving', 'completed', 'cancelled']);
    });

    it('defaults to "waiting"', () => {
      expect(Ticket.rawAttributes.status.defaultValue).toBe('waiting');
    });
  });

  describe('userId field', () => {
    it('is UUID type', () => {
      const attr = Ticket.rawAttributes.userId;
      expect(attr.type instanceof DataTypes.UUID).toBe(true);
    });

    it('allows null', () => {
      expect(Ticket.rawAttributes.userId.allowNull).toBe(true);
    });
  });

  describe('departmentId field', () => {
    it('is UUID type', () => {
      const attr = Ticket.rawAttributes.departmentId;
      expect(attr.type instanceof DataTypes.UUID).toBe(true);
    });

    it('allows null', () => {
      expect(Ticket.rawAttributes.departmentId.allowNull).toBe(true);
    });
  });

  describe('timestamps', () => {
    it('has createdAt and updatedAt', () => {
      expect(Ticket.rawAttributes.createdAt).toBeDefined();
      expect(Ticket.rawAttributes.updatedAt).toBeDefined();
    });
  });
});
