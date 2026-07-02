// src/__tests__/email.service.test.js

const nodemailer = require('nodemailer');

// Mock nodemailer
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'mock-id-123' });
const mockCreateTransport = jest.fn().mockReturnValue({
  sendMail: mockSendMail,
});
nodemailer.createTransport = mockCreateTransport;

// Mock models to avoid SQLite / database queries
jest.mock('../models', () => {
  const mockTicket = {
    count: jest.fn(),
  };
  const mockUser = {
    findByPk: jest.fn(),
  };
  const mockDepartment = {
    findByPk: jest.fn(),
  };
  return { Ticket: mockTicket, User: mockUser, Department: mockDepartment };
});

const { Ticket } = require('../models');
const {
  sendBookingEmail,
  sendCancellationEmail,
  sendCompletionEmail,
  sendQueueReminderEmail,
} = require('../services/email.service');

describe('Email Service', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...OLD_ENV,
      MAIL_HOST: 'smtp.mailtrap.io',
      MAIL_PORT: '2525',
      MAIL_USER: 'test-user',
      MAIL_PASSWORD: 'test-password',
      MAIL_FROM: 'no-reply@smartqueue.com',
      FRONTEND_URL: 'http://localhost:3000',
    };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('sends booking confirmation email successfully', async () => {
    Ticket.count.mockResolvedValue(4);

    const user = { name: 'Alice Smith', email: 'alice@example.com' };
    const department = { name: 'Cardiology' };
    const ticket = {
      id: 'ticket-uuid-123',
      ticketNumber: 'TKT-1717892300000-ABCDEF123456',
      userId: 'user-uuid-999',
      departmentId: 'dept-uuid-456',
      createdAt: new Date('2026-07-03T10:00:00Z'),
    };

    await sendBookingEmail(user, department, ticket);

    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: 'smtp.mailtrap.io',
      port: 2525,
      secure: false,
      auth: {
        user: 'test-user',
        pass: 'test-password',
      },
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'no-reply@smartqueue.com',
        to: 'alice@example.com',
        subject: expect.stringContaining('Booking Confirmation'),
        html: expect.stringContaining('Alice Smith'),
      })
    );
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('Hope Medical Center'),
      })
    );
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('TKT-ABCDEF'),
      })
    );
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('http://localhost:3000/queue-status/ticket-uuid-123'),
      })
    );
  });

  it('sends cancellation email successfully', async () => {
    const user = { name: 'Alice Smith', email: 'alice@example.com' };
    const department = { name: 'Pediatrics' };
    const ticket = {
      id: 'ticket-uuid-123',
      ticketNumber: 'TKT-1717892300000-ABCDEF123456',
    };

    await sendCancellationEmail(user, department, ticket);

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'no-reply@smartqueue.com',
        to: 'alice@example.com',
        subject: expect.stringContaining('Booking Cancelled'),
        html: expect.stringContaining('Pediatrics'),
      })
    );
  });

  it('sends completion thank you email successfully', async () => {
    const user = { name: 'Alice Smith', email: 'alice@example.com' };
    const department = { name: 'Orthopedics' };
    const ticket = {
      id: 'ticket-uuid-123',
    };

    await sendCompletionEmail(user, department, ticket);

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'no-reply@smartqueue.com',
        to: 'alice@example.com',
        subject: expect.stringContaining('Visit Completed'),
        html: expect.stringContaining('Orthopedics'),
      })
    );
  });

  it('sends queue reminder email successfully', async () => {
    const user = { name: 'Alice Smith', email: 'alice@example.com' };
    const department = { name: 'Ophthalmology' };
    const ticket = {
      id: 'ticket-uuid-123',
      ticketNumber: 'TKT-1717892300000-ABCDEF123456',
    };

    await sendQueueReminderEmail(user, department, ticket, 4);

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'no-reply@smartqueue.com',
        to: 'alice@example.com',
        subject: expect.stringContaining('Your Turn is Approaching'),
        html: expect.stringContaining('Ophthalmology'),
      })
    );
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('24 minutes'),
      })
    );
  });

  it('logs a warning and skips sending if SMTP is not configured', async () => {
    process.env.MAIL_HOST = '';
    process.env.MAIL_USER = '';

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const user = { name: 'Alice Smith', email: 'alice@example.com' };
    const department = { name: 'Orthopedics' };
    const ticket = { id: 't1' };

    await sendCompletionEmail(user, department, ticket);

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('SMTP not configured')
    );

    consoleWarnSpy.mockRestore();
  });

  it('logs an error and resolves without throwing if sendMail fails', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP server down'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const user = { name: 'Alice Smith', email: 'alice@example.com' };
    const department = { name: 'Orthopedics' };
    const ticket = { id: 't1' };

    // Should not throw
    await expect(sendCompletionEmail(user, department, ticket)).resolves.not.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to send email to alice@example.com'),
      'SMTP server down'
    );

    consoleErrorSpy.mockRestore();
  });
});
