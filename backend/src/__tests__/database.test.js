describe('database config', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('creates a Sequelize instance with env variables', () => {
    process.env.DB_NAME = 'testdb';
    process.env.DB_USER = 'testuser';
    process.env.DB_PASSWORD = 'testpass';
    process.env.DB_HOST = '127.0.0.1';
    process.env.DB_PORT = '3306';

    const sequelize = require('../config/database');

    expect(sequelize).toBeDefined();
    expect(sequelize.config.database).toBe('testdb');
    expect(sequelize.config.username).toBe('testuser');
    expect(sequelize.config.password).toBe('testpass');
    expect(sequelize.config.host).toBe('127.0.0.1');
    expect(sequelize.config.port).toBe('3306');
    expect(sequelize.getDialect()).toBe('mysql');
  });

  it('has logging disabled', () => {
    process.env.DB_NAME = 'testdb';
    process.env.DB_USER = 'testuser';
    process.env.DB_PASSWORD = 'testpass';
    process.env.DB_HOST = '127.0.0.1';
    process.env.DB_PORT = '3306';

    const sequelize = require('../config/database');
    expect(sequelize.options.logging).toBe(false);
  });
});
