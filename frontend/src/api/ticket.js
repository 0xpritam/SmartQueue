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
