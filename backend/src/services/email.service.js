// src/services/email.service.js

const nodemailer = require('nodemailer');
const { getCleanTicketNumber } = require('../utils/notification');

// Templates
const bookingTemplate = require('../templates/booking.template');
const cancellationTemplate = require('../templates/cancellation.template');
const completionTemplate = require('../templates/completion.template');
const queueReminderTemplate = require('../templates/queueReminder.template');
const rescheduleTemplate = require('../templates/reschedule.template');

const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT, 10) || 587,
    secure: process.env.MAIL_PORT == 465,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });
};

const departmentToHospitalMap = {
  'Cardiology': 'Hope Medical Center',
  'Pediatrics': 'Hope Medical Center',
  'Orthopedics': 'Hope Medical Center',
  'General Medicine': 'Hope Medical Center',
  'Radiology': 'Hope Medical Center',
  'Emergency Triage': 'Hope Medical Center',
  'Dermatology': 'Hope Medical Center',
  'Dental': 'Hope Medical Center',
  'Ophthalmology': 'Metro General Hospital'
};

const getHospitalName = (departmentName) => {
  return departmentToHospitalMap[departmentName] || 'SmartQueue Health Center';
};

const sendEmail = async (to, subject, html) => {
  try {
    if (!process.env.MAIL_HOST || !process.env.MAIL_USER) {
      console.warn('[EMAIL WARNING] SMTP not configured. Skipping email sending.');
      return;
    }
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to,
      subject,
      html,
    });
    console.log(`Email sent:\nRecipient: ${to}\nSubject: ${subject}\nTimestamp: ${new Date().toISOString()}`);
    return info;
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send email to ${to}:`, error.message);
  }
};

const sendBookingEmail = async (user, department, ticket) => {
  const patientName = user.name || 'Valued Patient';
  const departmentName = department.name || 'Medical Clinic';
  const hospitalName = getHospitalName(departmentName);
  
  // Calculate queue number
  const { Ticket } = require('../models');
  const { Op } = require('sequelize');
  const queueNumber = await Ticket.count({
    where: {
      departmentId: ticket.departmentId,
      status: 'waiting',
      createdAt: {
        [Op.lte]: ticket.createdAt,
      },
    },
  });

  const cleanTicket = getCleanTicketNumber(ticket);
  const appointmentDate = new Date(ticket.createdAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const bookingTime = new Date(ticket.createdAt).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true
  });
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const queueLink = `${frontendUrl}/queue-status/${ticket.id}`;

  const html = bookingTemplate({
    patientName,
    hospitalName,
    departmentName,
    queueNumber,
    ticketNumber: cleanTicket,
    appointmentDate,
    bookingTime,
    queueLink,
  });

  await sendEmail(user.email, `SmartQueue Booking Confirmation: ${cleanTicket}`, html);
};

const sendCancellationEmail = async (user, department, ticket) => {
  const patientName = user.name || 'Valued Patient';
  const departmentName = department.name || 'Medical Clinic';
  const cleanTicket = getCleanTicketNumber(ticket);
  const cancellationTime = new Date().toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
  });

  const html = cancellationTemplate({
    patientName,
    departmentName,
    ticketNumber: cleanTicket,
    cancellationTime,
  });

  await sendEmail(user.email, `SmartQueue Booking Cancelled: ${cleanTicket}`, html);
};

const sendCompletionEmail = async (user, department, ticket) => {
  const patientName = user.name || 'Valued Patient';
  const departmentName = department.name || 'Medical Clinic';
  const visitTime = new Date().toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
  });
  const appreciationMessage = `Thank you for choosing SmartQueue. We hope your visit to the ${departmentName} department was pleasant and our services met your expectations. Your feedback is highly appreciated.`;

  const html = completionTemplate({
    patientName,
    departmentName,
    visitTime,
    appreciationMessage,
  });

  await sendEmail(user.email, `SmartQueue Visit Completed: Thank You`, html);
};

const sendQueueReminderEmail = async (user, department, ticket, currentPosition) => {
  const patientName = user.name || 'Valued Patient';
  const departmentName = department.name || 'Medical Clinic';
  const cleanTicket = getCleanTicketNumber(ticket);
  const estimatedWaitTime = `${(currentPosition - 1) * 8} minutes`;

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const queueLink = `${frontendUrl}/queue-status/${ticket.id}`;

  const html = queueReminderTemplate({
    patientName,
    currentPosition,
    estimatedWaitTime,
    departmentName,
    queueNumber: cleanTicket,
    queueLink,
  });

  await sendEmail(user.email, `SmartQueue Alert: Your Turn is Approaching`, html);
};

const sendRescheduleEmail = async (user, oldDepartment, newDepartment, ticket, oldPosition, newPosition) => {
  const patientName = user.name || 'Valued Patient';
  const cleanTicket = getCleanTicketNumber(ticket);

  const rescheduledTime = new Date(ticket.updatedAt).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const queueLink = `${frontendUrl}/queue-status/${ticket.id}`;

  const html = rescheduleTemplate({
    patientName,
    ticketNumber: cleanTicket,
    oldDepartment,
    newDepartment,
    oldQueuePosition: oldPosition,
    newQueuePosition: newPosition,
    rescheduledTime,
    queueLink,
  });

  await sendEmail(user.email, `SmartQueue Appointment Rescheduled: ${cleanTicket}`, html);
};

module.exports = {
  sendBookingEmail,
  sendCancellationEmail,
  sendCompletionEmail,
  sendQueueReminderEmail,
  sendRescheduleEmail,
};
