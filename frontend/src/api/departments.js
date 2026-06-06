import api from './auth';

// Fetch all active departments from the database
export const getDepartments = async () => {
  const res = await api.get('/departments');
  return res.data;
};
