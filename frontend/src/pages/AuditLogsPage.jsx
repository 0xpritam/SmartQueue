import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getAuditLogs, exportAuditLogsCSV, exportAuditLogsPDF } from '../api/auditLog.service';

const AuditLogsPage = () => {
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();
  const { connectionStatus } = useSocket();

  // API List State
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Filter States
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [role, setRole] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Modal State (Holds the currently selected log object for viewing details)
  const [selectedLog, setSelectedLog] = useState(null);

  // 1. Debounce Search Input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // 2. Fetch Paginated Logs
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditLogs({
        page,
        limit,
        search,
        action,
        role,
        entityType,
        from,
        to,
        sortBy,
        sortOrder
      });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (err) {
      console.error('Fetch audit logs error:', err);
      setError(err.response?.data?.message || 'Failed to load audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, limit, search, action, role, entityType, from, to, sortBy, sortOrder]);

  // 3. Relative Time Formatter
  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (isNaN(date.getTime())) return dateString;

    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;

    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // 4. Color-coded Action Badges
  const getActionBadgeClass = (actionName) => {
    const act = (actionName || '').toUpperCase();
    if (act.includes('LOGIN')) {
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
    if (act === 'BOOK_TICKET' || act === 'CREATE_TICKET') {
      return 'bg-green-500/10 text-green-400 border border-green-500/20';
    }
    if (act === 'CANCEL_TICKET') {
      return 'bg-red-500/10 text-red-400 border border-red-500/20';
    }
    if (act === 'RESCHEDULE_TICKET') {
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }
    if (act === 'START_SERVING') {
      return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    }
    if (act === 'COMPLETE_TICKET') {
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    }
    if (act === 'CREATE_DEPARTMENT') {
      return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
    }
    if (act === 'UPDATE_DEPARTMENT') {
      return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
    }
    if (act === 'DELETE_DEPARTMENT') {
      return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
    return 'bg-slate-500/10 text-slate-300 border border-slate-700';
  };

  const triggerDownload = (blob, extension) => {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10) + '-' + now.toTimeString().slice(0, 5).replace(':', '');
    const filename = `audit-logs-${formattedDate}.${extension}`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    setError(null);
    setSuccess(null);
    try {
      const blob = await exportAuditLogsCSV({
        search,
        action,
        role,
        entityType,
        from,
        to,
        sortBy,
        sortOrder
      });
      triggerDownload(blob, 'csv');
      setSuccess('Audit logs exported successfully as CSV.');
    } catch (err) {
      console.error('Export CSV error:', err);
      setError('Failed to export CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    setError(null);
    setSuccess(null);
    try {
      const blob = await exportAuditLogsPDF({
        search,
        action,
        role,
        entityType,
        from,
        to,
        sortBy,
        sortOrder
      });
      triggerDownload(blob, 'pdf');
      setSuccess('Audit logs exported successfully as PDF.');
    } catch (err) {
      console.error('Export PDF error:', err);
      setError('Failed to export PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchInput('');
    setAction('');
    setRole('');
    setEntityType('');
    setFrom('');
    setTo('');
    setSortBy('createdAt');
    setSortOrder('DESC');
    setPage(1);
  };

  // Left sidebar items (navigating back to Admin Portal tabs using React Router State)
  const navItems = [
    { id: 'dashboard', label: 'Overview' },
    { id: 'departments', label: 'Departments' },
    { id: 'staff', label: 'Staff Portal' },
    { id: 'patients', label: 'Patients' },
    { id: 'statistics', label: 'Statistics' }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans antialiased">
      {/* Header */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center border border-blue-500 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-md font-black tracking-tight text-white leading-tight">SmartQueue Admin</h1>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Hospital Management Console</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 text-[9px] font-bold uppercase tracking-wider border border-slate-800 text-slate-300">
              <span className={`h-1.5 w-1.5 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
                connectionStatus === 'reconnecting' ? 'bg-amber-500 animate-ping' :
                'bg-slate-400'
              }`} />
              <span>{connectionStatus || 'connected'}</span>
            </div>
            <button
              onClick={() => navigate('/staff-operations')}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 border border-teal-500 rounded-lg text-xs font-bold text-white hover:border-teal-600 transition-all cursor-pointer"
            >
              Staff Operations
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-lg text-xs font-bold text-white hover:border-blue-600 transition-all cursor-pointer"
            >
              Staff Dashboard
            </button>
            <button
              onClick={() => logout()}
              className="px-3.5 py-1.5 border border-slate-700/80 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate('/admin', { state: { tab: item.id } })}
              className="w-full text-left px-4 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-3 cursor-pointer bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 shrink-0"
            >
              <span>{item.label}</span>
            </button>
          ))}
          <button
            className="w-full text-left px-4 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-3 cursor-default bg-blue-600 text-white shadow-lg border border-blue-500 shrink-0"
          >
            <span>Audit Logs</span>
          </button>
        </aside>

        {/* Content Pane */}
        <section className="flex-grow flex flex-col gap-6">
          {/* Success Banner */}
          {success && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-xl flex gap-3 text-xs text-emerald-300 animate-fadeIn">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="flex-grow font-semibold leading-normal">{success}</div>
              <button
                onClick={() => setSuccess(null)}
                className="text-[10px] font-bold text-emerald-400 hover:text-white cursor-pointer transition-all"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl flex gap-3 text-xs text-red-300 animate-fadeIn">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-grow font-semibold leading-normal">{error}</div>
              <button
                onClick={() => fetchLogs()}
                className="px-2.5 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer transition-all"
              >
                Retry
              </button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Logs (Enabled) */}
            <div className="bg-slate-800 border border-slate-700/60 p-5 rounded-2xl shadow-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Audit Logs</span>
                <span className="text-2xl font-black text-white">{loading ? '...' : total}</span>
              </div>
              <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/15">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>

            {/* Today's Logs (Placeholder - Easy to enable) */}
            <div className="bg-slate-800/40 border border-slate-850/60 p-5 rounded-2xl flex items-center justify-between opacity-50 select-none">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Today's Logs</span>
                <span className="text-2xl font-black text-slate-600">-</span>
              </div>
              <div className="h-11 w-11 rounded-xl bg-slate-800/50 flex items-center justify-center text-slate-500 border border-slate-700/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Admin Actions (Placeholder - Easy to enable) */}
            <div className="bg-slate-800/40 border border-slate-850/60 p-5 rounded-2xl flex items-center justify-between opacity-50 select-none">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Admin Actions</span>
                <span className="text-2xl font-black text-slate-600">-</span>
              </div>
              <div className="h-11 w-11 rounded-xl bg-slate-800/50 flex items-center justify-center text-slate-500 border border-slate-700/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-13.32 9-8.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>

            {/* Staff Actions (Placeholder - Easy to enable) */}
            <div className="bg-slate-800/40 border border-slate-850/60 p-5 rounded-2xl flex items-center justify-between opacity-50 select-none">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Staff Actions</span>
                <span className="text-2xl font-black text-slate-600">-</span>
              </div>
              <div className="h-11 w-11 rounded-xl bg-slate-800/50 flex items-center justify-center text-slate-500 border border-slate-700/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Global Search */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Search Logs</label>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Action, description, or entity..."
                  className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              {/* Action Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Action Type</label>
                <select
                  value={action}
                  onChange={(e) => { setAction(e.target.value); setPage(1); }}
                  className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="">All Actions</option>
                  <option value="LOGIN_SUCCESS">Login Success</option>
                  <option value="BOOK_TICKET">Book Ticket</option>
                  <option value="CANCEL_TICKET">Cancel Ticket</option>
                  <option value="START_SERVING">Start Serving</option>
                  <option value="COMPLETE_TICKET">Complete Ticket</option>
                  <option value="RESCHEDULE_TICKET">Reschedule Ticket</option>
                  <option value="CREATE_DEPARTMENT">Create Department</option>
                  <option value="UPDATE_DEPARTMENT">Update Department</option>
                  <option value="DELETE_DEPARTMENT">Delete Department</option>
                  <option value="CREATE_STAFF">Create Staff</option>
                  <option value="UPDATE_STAFF">Update Staff</option>
                  <option value="DELETE_STAFF">Delete Staff</option>
                </select>
              </div>

              {/* Role Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Role</label>
                <select
                  value={role}
                  onChange={(e) => { setRole(e.target.value); setPage(1); }}
                  className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Administrator</option>
                  <option value="staff">Staff</option>
                  <option value="user">Patient</option>
                </select>
              </div>

              {/* Entity Type Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Entity Type</label>
                <select
                  value={entityType}
                  onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
                  className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="">All Entities</option>
                  <option value="Ticket">Ticket</option>
                  <option value="Department">Department</option>
                  <option value="User">User</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {/* Date From */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Date From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                  className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                />
              </div>

              {/* Date To */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Date To</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => { setTo(e.target.value); setPage(1); }}
                  className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                />
              </div>

              {/* Sorting Columns */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Sort By</label>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-grow px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                  >
                    <option value="createdAt">Created Time</option>
                    <option value="action">Action</option>
                    <option value="role">Role</option>
                    <option value="entityType">Entity Type</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC')}
                    className="px-3.5 bg-slate-900 border border-slate-700/80 hover:border-blue-500 text-xs text-slate-300 hover:text-white rounded-lg cursor-pointer transition-all flex items-center justify-center font-extrabold uppercase tracking-wider"
                  >
                    {sortOrder === 'ASC' ? 'ASC ▲' : 'DESC ▼'}
                  </button>
                </div>
              </div>

              {/* Reset Button */}
              <div>
                <button
                  onClick={resetFilters}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-755 border border-slate-700/80 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            </div>
          </div>

          {/* Export Actions Section */}
          <div className="flex items-center justify-between gap-4 flex-wrap bg-slate-800 border border-slate-700/60 p-4 rounded-2xl shadow-xl">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Report Actions</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Export matching logs based on applied search and filters.</p>
            </div>
            <div className="flex gap-3">
              <button
                disabled={exporting || loading}
                onClick={handleExportCSV}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
                  exporting || loading
                    ? 'border-slate-800 text-slate-500 bg-slate-800/40 cursor-not-allowed'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-900/40 hover:bg-slate-900 text-slate-300 hover:text-white'
                }`}
              >
                {exporting ? (
                  <span className="h-3 w-3 border-2 border-slate-500 border-t-slate-300 rounded-full animate-spin inline-block mr-1" />
                ) : (
                  <svg xmlns="http://www.w3.org/2500/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                <span>Export CSV</span>
              </button>

              <button
                disabled={exporting || loading}
                onClick={handleExportPDF}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
                  exporting || loading
                    ? 'border-slate-800 text-slate-500 bg-slate-800/40 cursor-not-allowed'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-900/40 hover:bg-slate-900 text-slate-300 hover:text-white'
                }`}
              >
                {exporting ? (
                  <span className="h-3 w-3 border-2 border-slate-500 border-t-slate-300 rounded-full animate-spin inline-block mr-1" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-slate-800 border border-slate-700/60 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/50 border-b border-slate-700/80">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-44">Time</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-44">User</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-24">Role</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-40">Action</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-32">Entity</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-xs">
                  {loading ? (
                    // Skeleton Loaders
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="px-6 py-4.5"><div className="h-3 bg-slate-700 rounded w-28" /></td>
                        <td className="px-6 py-4.5"><div className="h-3 bg-slate-700 rounded w-24" /></td>
                        <td className="px-6 py-4.5"><div className="h-5 bg-slate-700 rounded-full w-14" /></td>
                        <td className="px-6 py-4.5"><div className="h-5 bg-slate-700 rounded-full w-24" /></td>
                        <td className="px-6 py-4.5"><div className="h-3 bg-slate-700 rounded w-20" /></td>
                        <td className="px-6 py-4.5"><div className="h-3 bg-slate-700 rounded w-52" /></td>
                      </tr>
                    ))
                  ) : logs.length === 0 ? (
                    // Empty State
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <p className="font-semibold">No audit logs found matching your filters</p>
                          <p className="text-[10px] text-slate-500">Try adjusting your dates or clearing your search term</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className="hover:bg-slate-700/30 transition-all cursor-pointer"
                      >
                        {/* Time with Full Timestamp Hover Tooltip */}
                        <td className="px-6 py-4 font-medium text-slate-300" title={new Date(log.createdAt).toLocaleString()}>
                          {formatRelativeTime(log.createdAt)}
                        </td>

                        {/* User */}
                        <td className="px-6 py-4">
                          {log.user ? (
                            <div>
                              <div className="font-semibold text-slate-200">{log.user.name}</div>
                              <div className="text-[9px] text-slate-400">{log.user.email}</div>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">System</span>
                          )}
                        </td>

                        {/* Role */}
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider inline-block ${
                            log.role === 'admin' ? 'bg-red-500/10 text-red-400 border border-red-500/15' :
                            log.role === 'staff' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/15' :
                            'bg-slate-700/60 text-slate-300 border border-slate-600/50'
                          }`}>
                            {log.role || 'n/a'}
                          </span>
                        </td>

                        {/* Action badge */}
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide inline-block ${getActionBadgeClass(log.action)}`}>
                            {log.action}
                          </span>
                        </td>

                        {/* Entity */}
                        <td className="px-6 py-4 font-semibold text-slate-300">
                          {log.entityType ? (
                            <div>
                              <span>{log.entityType}</span>
                              {log.entityId && <span className="block text-[9px] text-slate-500 font-mono mt-0.5">{log.entityId}</span>}
                            </div>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>

                        {/* Description */}
                        <td className="px-6 py-4 text-slate-300 font-medium">
                          {log.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Panel */}
            {!loading && logs.length > 0 && (
              <div className="px-6 py-4 bg-slate-900/30 border-t border-slate-700/60 flex items-center justify-between flex-wrap gap-4 text-xs">
                <div className="text-slate-400 font-medium">
                  Showing <span className="text-slate-200 font-extrabold">{(page - 1) * limit + 1}</span> to <span className="text-slate-200 font-extrabold">{Math.min(page * limit, total)}</span> of <span className="text-slate-200 font-extrabold">{total}</span> logs
                </div>

                <div className="flex items-center gap-4">
                  {/* Page Size Select */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Page Size:</span>
                    <select
                      value={limit}
                      onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
                      className="px-2.5 py-1 bg-slate-900 border border-slate-700/80 text-[11px] rounded text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>

                  {/* Previous / Next page */}
                  <div className="flex gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                      className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        page === 1 ? 'border-slate-800 text-slate-655 cursor-not-allowed opacity-50' : 'border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white cursor-pointer'
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      disabled={page === pages}
                      onClick={() => setPage(p => p + 1)}
                      className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        page === pages ? 'border-slate-800 text-slate-655 cursor-not-allowed opacity-50' : 'border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white cursor-pointer'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-850 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900/50 border-b border-slate-700/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Audit Log Details</h3>
                <span className="text-[10px] text-slate-400 font-semibold font-mono block mt-1">{selectedLog.id}</span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="h-7 w-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable details */}
            <div className="p-6 overflow-y-auto flex-grow space-y-5 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Time</span>
                  <span className="font-semibold text-slate-200">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">IP Address</span>
                  <span className="font-semibold text-slate-200">{selectedLog.ipAddress || 'n/a'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">User</span>
                  {selectedLog.user ? (
                    <div>
                      <div className="font-semibold text-slate-200">{selectedLog.user.name}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{selectedLog.user.email}</div>
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">System Event</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Role</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider inline-block mt-0.5 ${
                    selectedLog.role === 'admin' ? 'bg-red-500/10 text-red-400 border border-red-500/15' :
                    selectedLog.role === 'staff' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/15' :
                    'bg-slate-700/60 text-slate-300 border border-slate-600/50'
                  }`}>
                    {selectedLog.role || 'n/a'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Action</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide inline-block mt-0.5 ${getActionBadgeClass(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Entity</span>
                  {selectedLog.entityType ? (
                    <div>
                      <span className="font-semibold text-slate-200">{selectedLog.entityType}</span>
                      {selectedLog.entityId && (
                        <span className="block text-[9px] font-mono text-slate-455 mt-0.5">{selectedLog.entityId}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-555 italic">None</span>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Description</span>
                <p className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-slate-200 leading-relaxed">
                  {selectedLog.description}
                </p>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Extended Metadata</span>
                {selectedLog.metadata ? (
                  <pre className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-[10px] font-mono text-blue-300 overflow-x-auto max-h-48 leading-normal shadow-inner">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                ) : (
                  <span className="text-slate-500 italic block py-1">No custom metadata parameters recorded.</span>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-700/60 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 border border-blue-500 hover:border-blue-600 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
