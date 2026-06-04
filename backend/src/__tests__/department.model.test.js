const { Sequelize, DataTypes } = require('sequelize');
const defineDepartment = require('../models/department');

describe('Department model definition', () => {
  let sequelize;
  let Department;

  beforeAll(() => {
    sequelize = new Sequelize('mysql://localhost', { logging: false });
    Department = defineDepartment(sequelize);
  });

  it('exports a factory function', () => {
    expect(typeof defineDepartment).toBe('function');
  });

  it('returns a Sequelize Model class', () => {
    expect(Department.prototype).toBeDefined();
    expect(typeof Department.init).toBe('function');
  });

  it('maps to the "departments" table', () => {
    expect(Department.getTableName()).toBe('departments');
  });

  it('has model name "Department"', () => {
    expect(Department.name).toBe('Department');
  });

  // ── Field definitions ────────────────────────────────────────────────

  describe('id field', () => {
    it('is UUID type', () => {
      const attr = Department.rawAttributes.id;
      expect(attr.type instanceof DataTypes.UUID).toBe(true);
    });

    it('is primary key', () => {
      expect(Department.rawAttributes.id.primaryKey).toBe(true);
    });

    it('has a default value', () => {
      const attr = Department.rawAttributes.id;
      expect(attr.defaultValue).toBeDefined();
    });

    it('does not allow null', () => {
      expect(Department.rawAttributes.id.allowNull).toBe(false);
    });
  });

  describe('name field', () => {
    it('is STRING type', () => {
      const attr = Department.rawAttributes.name;
      expect(attr.type instanceof DataTypes.STRING).toBe(true);
    });

    it('does not allow null', () => {
      expect(Department.rawAttributes.name.allowNull).toBe(false);
    });

    it('has notEmpty validator', () => {
      const validators = Department.rawAttributes.name.validate;
      expect(validators.notEmpty).toBeDefined();
    });
  });

  describe('description field', () => {
    it('is STRING type', () => {
      const attr = Department.rawAttributes.description;
      expect(attr.type instanceof DataTypes.STRING).toBe(true);
    });

    it('allows null', () => {
      expect(Department.rawAttributes.description.allowNull).toBe(true);
    });
  });

  describe('status field', () => {
    it('is ENUM type', () => {
      const attr = Department.rawAttributes.status;
      expect(attr.type instanceof DataTypes.ENUM).toBe(true);
    });

    it('allows only "active" and "inactive"', () => {
      const values = Department.rawAttributes.status.type.values;
      expect(values).toEqual(['active', 'inactive']);
    });

    it('defaults to "active"', () => {
      expect(Department.rawAttributes.status.defaultValue).toBe('active');
    });
  });

  describe('timestamps', () => {
    it('has createdAt and updatedAt', () => {
      expect(Department.rawAttributes.createdAt).toBeDefined();
      expect(Department.rawAttributes.updatedAt).toBeDefined();
    });
  });
});
