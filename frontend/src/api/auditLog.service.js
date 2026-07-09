import api from './auth';

/**
 * Fetch paginated audit logs with search, sort, and filters
 * @param {Object} params - Query parameters (page, limit, search, action, role, userId, entityType, from, to, sortBy, sortOrder)
 */
export const getAuditLogs = async (params) => {
  const res = await api.get('/admin/audit-logs', { params });
  return res.data;
};

/**
 * Fetch details of a single audit log
 * @param {string} id - Audit log UUID
 */
export const getAuditLogById = async (id) => {
  const res = await api.get(`/admin/audit-logs/${id}`);
  return res.data;
};
