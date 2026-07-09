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

/**
 * Export audit logs as CSV file (returns binary blob)
 * @param {Object} params - Active query filters
 */
export const exportAuditLogsCSV = async (params) => {
  const res = await api.get('/admin/audit-logs/export/csv', {
    params,
    responseType: 'blob'
  });
  return res.data;
};

/**
 * Export audit logs as PDF report (returns binary blob)
 * @param {Object} params - Active query filters
 */
export const exportAuditLogsPDF = async (params) => {
  const res = await api.get('/admin/audit-logs/export/pdf', {
    params,
    responseType: 'blob'
  });
  return res.data;
};
