import api from './auth';

// Create a new queue ticket for a specific department
export const bookTicket = async (departmentId) => {
  const res = await api.post('/tickets', { departmentId });
  return res.data;
};

// Fetch specific ticket details by UUID
export const getTicket = async (ticketId) => {
  const res = await api.get(`/tickets/${ticketId}`);
  return res.data;
};

// Fetch all tickets created by the currently logged-in user
export const getMyTickets = async () => {
  const res = await api.get('/tickets/my');
  return res.data;
};

// Fetch all tickets in the system (for staff dashboard)
export const getAllTickets = async (params = {}) => {
  const res = await api.get('/tickets', { params });
  return res.data;
};

// Update ticket status (for staff dashboard)
export const updateTicketStatus = async (ticketId, status) => {
  const res = await api.patch(`/tickets/${ticketId}/status`, { status });
  return res.data;
};

// Fetch QR Code for a ticket
export const getTicketQRCode = async (ticketId) => {
  const res = await api.get(`/tickets/${ticketId}/qr`);
  return res.data;
};

// Cancel ticket
export const cancelTicket = async (ticketId) => {
  console.log("Canceling ticket:", ticketId);
  const res = await api.patch(`/tickets/${ticketId}/cancel`);
  return res.data;
};

// Fetch appointment history (completed/cancelled tickets) with optional pagination
export const getAppointmentHistory = async (params = {}) => {
  const res = await api.get('/tickets/history', { params });
  return res.data;
};

// Reschedule ticket
export const rescheduleTicket = async (ticketId, departmentId) => {
  const res = await api.patch(`/tickets/${ticketId}/reschedule`, { departmentId });
  return res.data;
};

// Fetch prediction details for a ticket
export const getPrediction = async (ticketId) => {
  const res = await api.get(`/predictions/${ticketId}`);
  return res.data;
};

