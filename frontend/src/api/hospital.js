import api from './auth';

// Fetch hospital listings from the backend (contains mapped database department UUIDs)
export const getHospitals = async () => {
  const res = await api.get('/hospitals');
  return res.data;
};

// Fetch all active departments from the database
export const getDepartments = async () => {
  const res = await api.get('/departments');
  return res.data;
};
