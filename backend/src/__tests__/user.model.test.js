const { Sequelize, DataTypes } = require('sequelize');
const defineUser = require('../models/user');

describe('User model definition', () => {
  let sequelize;
  let User;

  beforeAll(() => {
    // Use a Sequelize instance without connecting (dialect only for schema parsing)
    sequelize = new Sequelize('mysql://localhost', { logging: false });
    User = defineUser(sequelize);
  });

  it('exports a factory function', () => {
    expect(typeof defineUser).toBe('function');
  });

  it('returns a Sequelize Model class', () => {
    expect(User.prototype).toBeDefined();
    expect(typeof User.init).toBe('function');
  });

  it('maps to the "users" table', () => {
    expect(User.getTableName()).toBe('users');
  });

  it('has model name "User"', () => {
    expect(User.name).toBe('User');
  });

  // ── Field definitions ────────────────────────────────────────────────

  describe('id field', () => {
    it('is UUID type', () => {
      const attr = User.rawAttributes.id;
      expect(attr.type instanceof DataTypes.UUID).toBe(true);
    });

    it('is primary key', () => {
      expect(User.rawAttributes.id.primaryKey).toBe(true);
    });

    it('has a default value', () => {
      const attr = User.rawAttributes.id;
      expect(attr.defaultValue).toBeDefined();
    });

    it('does not allow null', () => {
      expect(User.rawAttributes.id.allowNull).toBe(false);
    });
  });

  describe('name field', () => {
    it('is STRING type', () => {
      const attr = User.rawAttributes.name;
      expect(attr.type instanceof DataTypes.STRING).toBe(true);
    });

    it('does not allow null', () => {
      expect(User.rawAttributes.name.allowNull).toBe(false);
    });

    it('has notEmpty validator', () => {
      const validators = User.rawAttributes.name.validate;
      expect(validators.notEmpty).toBeDefined();
    });
  });

  describe('email field', () => {
    it('is STRING type', () => {
      const attr = User.rawAttributes.email;
      expect(attr.type instanceof DataTypes.STRING).toBe(true);
    });

    it('does not allow null', () => {
      expect(User.rawAttributes.email.allowNull).toBe(false);
    });

    it('is unique', () => {
      const emailIndex = User.options.indexes.find(idx => idx.fields.includes('email'));
      expect(emailIndex).toBeDefined();
      expect(emailIndex.unique).toBe(true);
    });

    it('has isEmail validator', () => {
      const validators = User.rawAttributes.email.validate;
      expect(validators.isEmail).toBeDefined();
    });
  });

  describe('password field', () => {
    it('is STRING type', () => {
      const attr = User.rawAttributes.password;
      expect(attr.type instanceof DataTypes.STRING).toBe(true);
    });

    it('does not allow null', () => {
      expect(User.rawAttributes.password.allowNull).toBe(false);
    });

    it('has length validator with min 6', () => {
      const validators = User.rawAttributes.password.validate;
      expect(validators.len).toBeDefined();
      expect(validators.len.args).toEqual([6, 100]);
    });
  });

  describe('role field', () => {
    it('is ENUM type', () => {
      const attr = User.rawAttributes.role;
      expect(attr.type instanceof DataTypes.ENUM).toBe(true);
    });

    it('allows only "user" and "admin"', () => {
      const values = User.rawAttributes.role.type.values;
      expect(values).toEqual(['user', 'admin']);
    });

    it('defaults to "user"', () => {
      expect(User.rawAttributes.role.defaultValue).toBe('user');
    });
  });

  describe('phone field', () => {
    it('is STRING type', () => {
      const attr = User.rawAttributes.phone;
      expect(attr.type instanceof DataTypes.STRING).toBe(true);
    });

    it('allows null', () => {
      expect(User.rawAttributes.phone.allowNull).not.toBe(false);
    });

    it('is unique', () => {
      const phoneIndex = User.options.indexes.find(idx => idx.fields.includes('phone'));
      expect(phoneIndex).toBeDefined();
      expect(phoneIndex.unique).toBe(true);
    });
  });

  describe('age field', () => {
    it('is INTEGER type', () => {
      const attr = User.rawAttributes.age;
      expect(attr.type instanceof DataTypes.INTEGER).toBe(true);
    });

    it('allows null', () => {
      expect(User.rawAttributes.age.allowNull).not.toBe(false);
    });

    it('has min validator with value 1', () => {
      const validators = User.rawAttributes.age.validate;
      expect(validators.min).toBeDefined();
      expect(validators.min.args).toEqual([1]);
    });
  });

  describe('timestamps', () => {
    it('has createdAt and updatedAt', () => {
      expect(User.rawAttributes.createdAt).toBeDefined();
      expect(User.rawAttributes.updatedAt).toBeDefined();
    });
  });
});
