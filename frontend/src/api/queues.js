import api from './auth';

// Fetch the currently serving ticket for a specific department
export const getCurrentServing = async (departmentId) => {
  const res = await api.get(`/queues/${departmentId}/current`);
  return res.data;
};

// Fetch the list of waiting tickets for a specific department
export const getWaitingTickets = async (departmentId) => {
  const res = await api.get(`/queues/${departmentId}/waiting`);
  return res.data;
};

// SIMULATOR: Call next patient (advances queue to serving)
export const callNextPatient = async (departmentId) => {
  const res = await api.post(`/queues/${departmentId}/call-next`);
  return res.data;
};

// SIMULATOR: Complete current patient (advances serving patient to completed)
export const completeCurrentPatient = async (departmentId) => {
  const res = await api.post(`/queues/${departmentId}/complete-current`);
  return res.data;
};
