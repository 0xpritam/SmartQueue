import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDepartments } from '../api/departments';
import { getAllTickets, updateTicketStatus } from '../api/tickets';
import { useSocket } from '../context/SocketContext';
import { 
  getCurrentServing, 
  getWaitingTickets, 
  callNextPatient, 
  completeCurrentPatient 
} from '../api/queues';
import QueueStatsCards from '../components/QueueStatsCards';
import QueueTable from '../components/QueueTable';
import NotificationCenter from '../components/NotificationCenter';

const StaffDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // API Data State
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tickets, setTickets] = useState([]);
  const [waitingTicketsCount, setWaitingTicketsCount] = useState(0);

  // System State
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  // Fetch all states from the database
  const refreshQueueData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const deptsRes = await getDepartments();
      const ticketsRes = await getAllTickets();

      if (deptsRes && deptsRes.success) {
        setDepartments(deptsRes.departments || []);
      }
      if (ticketsRes && ticketsRes.success) {
        const tList = ticketsRes.tickets || [];
        setTickets(tList);
        setWaitingTicketsCount(tList.filter(t => t.status === 'waiting').length);
      }
      setError(null);
    } catch (err) {
      console.error('Refresh dashboard error:', err);
      setError('Failed to poll queue systems. Re-establishing link...');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Poll server database every 3 seconds for real-time sync with patient status receipts
  useEffect(() => {
    refreshQueueData();
    const interval = setInterval(() => {
      refreshQueueData(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const { socket, connectionStatus } = useSocket();

  // Socket room joining for all departments
  useEffect(() => {
    if (!socket || departments.length === 0) return;

    departments.forEach(dept => {
      console.log(`[SOCKET] Staff dashboard joining room: department_${dept.id}`);
      socket.emit('join_department', dept.id);
    });
  }, [socket, departments]);

  // Socket queue update subscription
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      console.log('[SOCKET] Refreshing staff dashboard queue data');
      refreshQueueData(true);
    };

    socket.on('queue_updated', handleUpdate);
    return () => {
      socket.off('queue_updated', handleUpdate);
    };
  }, [socket]);

  // Seed Timeline Activity logs from historical updates
  useEffect(() => {
    if (tickets.length > 0 && logs.length === 0) {
      const initialLogs = tickets
        .filter(t => t.status !== 'waiting')
        .slice(0, 6)
        .map(t => {
          const dept = departments.find(d => d.id === t.departmentId);
          const deptName = dept ? dept.name : 'Outpatient';
          const time = new Date(t.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const num = t.ticketNumber.split('-')[2]?.substring(0, 6) || t.id.substring(0, 6);
          let msg = `Ticket TKT-${num} status changed to ${t.status}`;
          if (t.status === 'serving') msg = `Patient called: Token TKT-${num} in ${deptName}`;
          if (t.status === 'completed') msg = `Consultation complete: Token TKT-${num} in ${deptName}`;
          if (t.status === 'cancelled') msg = `Ticket TKT-${num} cancelled`;
          return { id: t.id, time, message: msg };
        });
      setLogs(initialLogs);
    }
  }, [tickets, departments]);

  const addLog = (message) => {
    const newLog = {
      id: Date.now(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message,
    };
    setLogs(prev => [newLog, ...prev].slice(0, 15));
  };

  const getPatientMetadata = (ticketId) => {
    const stored = localStorage.getItem(`smartqueue_meta_${ticketId}`);
    if (stored) return JSON.parse(stored);
    return {
      patientName: 'Outpatient Guest',
      patientAge: '—',
      patientPhone: '—',
      reason: ''
    };
  };

  // Receptionist Actions
  const handleCallNext = async () => {
    if (selectedDeptId === 'all') {
      alert('Please select a specific department first to call the next patient in line.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await callNextPatient(selectedDeptId);
      if (res && res.success && res.ticket) {
        const deptName = departments.find(d => d.id === selectedDeptId)?.name || 'Clinic';
        const num = res.ticket.ticketNumber.split('-')[2]?.substring(0, 6) || res.ticket.id.substring(0, 6);
        addLog(`Patient called (FIFO): Token TKT-${num} in ${deptName}`);
        await refreshQueueData(true);
      } else {
        alert('No waiting patients found for the selected department.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to call the next patient.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (ticketId, status, ticketNumber, departmentId) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await updateTicketStatus(ticketId, status);
      if (res && res.success) {
        const deptName = departments.find(d => d.id === departmentId)?.name || 'Clinic';
        const num = ticketNumber.split('-')[2]?.substring(0, 6) || ticketId.substring(0, 6);
        
        if (status === 'serving') {
          addLog(`Patient marked as serving: Token TKT-${num} in ${deptName}`);
        } else if (status === 'completed') {
          addLog(`Consultation completed: Token TKT-${num} in ${deptName}`);
        } else if (status === 'cancelled') {
          addLog(`Ticket cancelled: Token TKT-${num}`);
        }
        await refreshQueueData(true);
      }
    } catch (err) {
      setError('Failed to update ticket status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Metrics Calculations
  const getCalculatedMetrics = () => {
    const activeWaiting = tickets.filter(t => t.status === 'waiting').length;
    const activeServing = tickets.filter(t => t.status === 'serving').length;
    const completedToday = tickets.filter(t => t.status === 'completed').length;
    const estWaitTime = activeWaiting * 8;
    return { activeWaiting, activeServing, completedToday, estWaitTime };
  };

  const metrics = getCalculatedMetrics();

  // Combine Department, Status and Query Filters
  const getFilteredTicketsList = () => {
    return tickets.filter(t => {
      // 1. Department Filter
      if (selectedDeptId !== 'all' && t.departmentId !== selectedDeptId) {
        return false;
      }
      // 2. Status Filter
      if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false;
      }
      // 3. Search Query Filter
      const meta = getPatientMetadata(t.id);
      const cleanNum = t.ticketNumber.split('-')[2] || t.ticketNumber;
      const q = searchQuery.toLowerCase();
      return (
        cleanNum.toLowerCase().includes(q) ||
        t.ticketNumber.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        meta.patientName.toLowerCase().includes(q) ||
        meta.patientPhone.toLowerCase().includes(q)
      );
    });
  };

  const filteredTickets = getFilteredTicketsList();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-blue-600 flex items-center justify-center border border-blue-500 shadow">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight block leading-tight">SmartQueue Dashboard</h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Staff Portal Control</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-850 text-[9px] font-bold uppercase tracking-wider border border-slate-700 text-slate-300">
              <span className={`h-1.5 w-1.5 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
                connectionStatus === 'reconnecting' ? 'bg-amber-500 animate-ping' :
                'bg-slate-400'
              }`} />
              <span>
                {connectionStatus === 'connected' ? 'Live connected' :
                 connectionStatus === 'reconnecting' ? 'Reconnecting' :
                 'Offline (Polling)'}
              </span>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold block text-slate-200">{currentUser?.name || 'Staff User'}</span>
              <span className="text-[10px] text-teal-400 font-bold block uppercase tracking-wide">Operations Staff</span>
            </div>
            
            {/* Notification Center Dropdown */}
            <NotificationCenter isDarkMode={true} />

            <button 
              onClick={() => navigate('/analytics')}
              className="bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold py-1.5 px-3 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 shadow"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Analytics</span>
            </button>

            <button 
              onClick={handleLogout}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold py-1.5 px-3 rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full space-y-6">

        {/* Global Alert Notification */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex gap-3 text-xs text-red-700 font-semibold animate-fadeIn">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>{error}</div>
          </div>
        )}

        {/* Reusable Stats Component */}
        <QueueStatsCards 
          waiting={metrics.activeWaiting}
          serving={metrics.activeServing}
          completed={metrics.completedToday}
          estWaitTime={metrics.estWaitTime}
        />

        {/* Action Panel / Grid Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Filters and timeline */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Department Management Filters */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Departments Management</h3>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                <button
                  onClick={() => setSelectedDeptId('all')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-colors flex justify-between items-center cursor-pointer ${
                    selectedDeptId === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <span>All Active Departments</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] ${selectedDeptId === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {tickets.filter(t => t.status === 'waiting').length}
                  </span>
                </button>
                {departments.map((dept) => {
                  const waitingCount = tickets.filter(t => t.departmentId === dept.id && t.status === 'waiting').length;
                  const activeServingCount = tickets.filter(t => t.departmentId === dept.id && t.status === 'serving').length;
                  return (
                    <button
                      key={dept.id}
                      onClick={() => setSelectedDeptId(dept.id)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-colors flex justify-between items-center cursor-pointer ${
                        selectedDeptId === dept.id
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                      }`}
                    >
                      <div className="truncate flex items-center gap-1.5 pr-2">
                        <span className="truncate">{dept.name}</span>
                        {activeServingCount > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping shrink-0" />
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] shrink-0 ${selectedDeptId === dept.id ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {waitingCount} wait
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Department FIFO Pacer Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Queue Pacing Actions</h3>
              
              <div className="text-[11px] text-slate-500 leading-normal font-semibold">
                Clicking **Call Next Patient** promotes the oldest waiting patient in the selected division to the serving room immediately.
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleCallNext}
                  disabled={actionLoading || selectedDeptId === 'all'}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  Call Next Patient
                </button>
              </div>
            </div>

            {/* Recent Activity Timeline panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Staff Activity Panel</h3>
              
              {logs.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-xs font-semibold">
                  No activity events registered today.
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[200px] overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div key={log.id} className="flex gap-3 text-[11px] leading-normal border-b border-slate-50 pb-2">
                      <span className="font-mono text-slate-400 shrink-0 font-bold">{log.time}</span>
                      <span className="text-slate-700 font-semibold">{log.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right panel: Active filter controls and list table */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Search, Status and filter panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
              
              {/* Lookup search */}
              <div className="relative w-full md:max-w-xs">
                <input
                  type="text"
                  placeholder="Search Ticket ID or Patient..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-all font-semibold"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Status Filter Tab Buttons */}
              <div className="flex gap-1.5 shrink-0 bg-slate-100/80 border border-slate-200/50 p-1 rounded-lg w-full md:w-auto">
                {['all', 'waiting', 'serving', 'completed'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`flex-grow md:flex-grow-0 px-3.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      statusFilter === status
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

            </div>

            {/* Queue Table */}
            <QueueTable 
              tickets={filteredTickets}
              departments={departments}
              onStatusChange={handleStatusChange}
              actionLoading={actionLoading}
            />

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="bg-slate-100 border-t border-slate-200 py-4 text-center text-[10px] text-slate-400 uppercase tracking-wider">
        Operations Control Center © 2026 SmartQueue System. All database systems connected.
      </footer>

    </div>
  );
};

export default StaffDashboard;
