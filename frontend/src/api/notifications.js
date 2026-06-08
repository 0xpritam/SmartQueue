// src/api/notifications.js

import api from './auth';

// Fetch paginated notifications
export const getNotifications = async (page = 1, limit = 20) => {
  const res = await api.get('/notifications', {
    params: { page, limit },
  });
  return res.data;
};

// Mark a specific notification as read
export const markAsRead = async (id) => {
  const res = await api.put(`/notifications/${id}/read`);
  return res.data;
};

// Mark all notifications as read
export const markAllAsRead = async () => {
  const res = await api.put('/notifications/read-all');
  return res.data;
};
