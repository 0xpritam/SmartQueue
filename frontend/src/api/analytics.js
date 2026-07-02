import api from './auth';

// Fetch overview metrics
export const getOverviewMetrics = async () => {
  const res = await api.get('/analytics/overview');
  return res.data;
};

// Fetch department analytics
export const getDepartmentAnalytics = async () => {
  const res = await api.get('/analytics/departments');
  return res.data;
};

// Fetch 7-day trend analytics
export const getTrendAnalytics = async () => {
  const res = await api.get('/analytics/trends');
  return res.data;
};

// Fetch dashboard analytics
export const getDashboardAnalytics = async () => {
  const res = await api.get('/analytics/dashboard');
  return res.data;
};
