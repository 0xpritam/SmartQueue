import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getDepartments } from '../api/departments';
import { getAllTickets, updateTicketStatus } from '../api/tickets';
import { 
  getCurrentServing, 
  getWaitingTickets, 
  callNextPatient, 
  completeCurrentPatient 
} from '../api/queues';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // API Data State
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('all');
  const [tickets, setTickets] = useState([]);
  const [waitingTickets, setWaitingTickets] = useState([]);
  const [servingTicket, setServingTicket] = useState(null);

  // System State
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  // Fetch all dashboard data from backend database
  const fetchDashboardData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const deptsRes = await getDepartments();
      const ticketsRes = await getAllTickets();

      if (deptsRes && deptsRes.success) {
        setDepartments(deptsRes.departments || []);
      }
      if (ticketsRes && ticketsRes.success) {
        setTickets(ticketsRes.tickets || []);
      }

      if (selectedDeptId !== 'all') {
        // Fetch specific queue states
        try {
          const servingRes = await getCurrentServing(selectedDeptId);
          setServingTicket(servingRes && servingRes.success ? servingRes.ticket : null);
        } catch {
          setServingTicket(null);
        }

        try {
          const waitingRes = await getWaitingTickets(selectedDeptId);
          setWaitingTickets(waitingRes && waitingRes.success ? waitingRes.tickets : []);
        } catch {
          setWaitingTickets([]);
        }
      } else {
        setServingTicket(null);
        setWaitingTickets(ticketsRes.tickets?.filter(t => t.status === 'waiting') || []);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard states:', err);
      setError('Failed to refresh clinic metrics. Retrying...');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Poll database every 3 seconds to keep status in sync with patients
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedDeptId]);

  // Seed recent logs from completed/serving tickets in the database
  useEffect(() => {
    if (tickets.length > 0 && logs.length === 0) {
      const recentLogs = tickets
        .filter(t => t.status !== 'waiting')
        .slice(0, 6)
        .map(t => {
          const dept = departments.find(d => d.id === t.departmentId);
          const deptName = dept ? dept.name : 'Clinic';
          const time = new Date(t.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          let msg = `Ticket TKT-${t.ticketNumber.split('-')[2]?.substring(0, 6) || t.id.substring(0, 6)} status updated to ${t.status}`;
          if (t.status === 'serving') msg = `Patient called: Token TKT-${t.ticketNumber.split('-')[2]?.substring(0, 6) || t.id.substring(0, 6)} in ${deptName}`;
          if (t.status === 'completed') msg = `Consultation complete: Token TKT-${t.ticketNumber.split('-')[2]?.substring(0, 6) || t.id.substring(0, 6)} in ${deptName}`;
          if (t.status === 'cancelled') msg = `Ticket TKT-${t.ticketNumber.split('-')[2]?.substring(0, 6) || t.id.substring(0, 6)} cancelled`;
          return { id: t.id, time, message: msg };
        });
      setLogs(recentLogs);
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

  // Retrieve patient metadata stored in localStorage
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
    if (selectedDeptId === 'all') return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await callNextPatient(selectedDeptId);
      if (res && res.success && res.ticket) {
        const deptName = departments.find(d => d.id === selectedDeptId)?.name || 'Clinic';
        const num = res.ticket.ticketNumber.split('-')[2]?.substring(0, 6) || res.ticket.id.substring(0, 6);
        addLog(`Patient called: Token TKT-${num} in ${deptName}`);
        await fetchDashboardData(true);
      } else {
        setError(res.message || 'No waiting patients found.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to call the next patient.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteCurrent = async () => {
    if (selectedDeptId === 'all') return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await completeCurrentPatient(selectedDeptId);
      if (res && res.success) {
        const deptName = departments.find(d => d.id === selectedDeptId)?.name || 'Clinic';
        const num = res.ticket.ticketNumber.split('-')[2]?.substring(0, 6) || res.ticket.id.substring(0, 6);
        addLog(`Consultation complete: Token TKT-${num} in ${deptName}`);
        await fetchDashboardData(true);
      } else {
        setError(res.message || 'No active consultation being served.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete consultation session.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTicket = async (ticketId, ticketNumber) => {
    if (!window.confirm('Are you sure you want to cancel this ticket?')) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await updateTicketStatus(ticketId, 'cancelled');
      if (res && res.success) {
        const num = ticketNumber.split('-')[2]?.substring(0, 6) || ticketId.substring(0, 6);
        addLog(`Ticket TKT-${num} cancelled`);
        await fetchDashboardData(true);
      }
    } catch (err) {
      setError('Failed to cancel the ticket.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Metrics calculation
  const getMetrics = () => {
    const waiting = tickets.filter(t => t.status === 'waiting').length;
    const serving = tickets.filter(t => t.status === 'serving').length;
    const completed = tickets.filter(t => t.status === 'completed').length;
    const estWaitTime = waiting * 8; // average 8 mins per waiting patient
    return { waiting, serving, completed, estWaitTime };
  };

  const metrics = getMetrics();

  // Search logic filtering
  const searchedTickets = tickets.filter(t => {
    const meta = getPatientMetadata(t.id);
    const lowerQuery = searchQuery.toLowerCase();
    const cleanNum = t.ticketNumber.split('-')[2] || t.ticketNumber;
    return (
      cleanNum.toLowerCase().includes(lowerQuery) ||
      t.ticketNumber.toLowerCase().includes(lowerQuery) ||
      t.id.toLowerCase().includes(lowerQuery) ||
      meta.patientName.toLowerCase().includes(lowerQuery) ||
      meta.patientPhone.toLowerCase().includes(lowerQuery) ||
      t.status.toLowerCase().includes(lowerQuery)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Staff Dashboard Header */}
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
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Hospital Operations Command</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold block text-slate-200">{currentUser?.name || 'Staff Member'}</span>
              <span className="text-[10px] text-teal-400 font-bold block uppercase tracking-wide">Clinic Receptionist</span>
            </div>
            <button 
              onClick={handleLogout}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold py-1.5 px-3 rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
            >
              Sign Out
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full space-y-6">

        {/* Global Error Banner */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex gap-3 text-xs text-red-700 font-semibold animate-fadeIn">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>{error}</div>
          </div>
        )}

        {/* Metrics Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Waiting */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="p-3.5 rounded bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="space-y-0.5 truncate">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Waiting</span>
              <span className="text-xl font-extrabold text-slate-900 block">{metrics.waiting} Patients</span>
            </div>
          </div>

          {/* Serving */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="p-3.5 rounded bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </div>
            <div className="space-y-0.5 truncate">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Serving Now</span>
              <span className="text-xl font-extrabold text-slate-900 block">{metrics.serving} Active</span>
            </div>
          </div>

          {/* Completed */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="p-3.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-0.5 truncate">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed Consults</span>
              <span className="text-xl font-extrabold text-slate-900 block">{metrics.completed} Sessions</span>
            </div>
          </div>

          {/* Avg Wait */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="p-3.5 rounded bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-0.5 truncate">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Network Wait</span>
              <span className="text-xl font-extrabold text-slate-900 block">{metrics.estWaitTime} mins</span>
            </div>
          </div>
        </section>

        {/* Dashboard Actions and Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Department select and Queue Call Panel */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Department Filter Selector */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Department</h3>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                <button
                  onClick={() => setSelectedDeptId('all')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-colors flex justify-between items-center cursor-pointer ${
                    selectedDeptId === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <span>All Active Divisions</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] ${selectedDeptId === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {tickets.filter(t => t.status === 'waiting').length}
                  </span>
                </button>
                {departments.map((dept) => {
                  const waitingCount = tickets.filter(t => t.departmentId === dept.id && t.status === 'waiting').length;
                  return (
                    <button
                      key={dept.id}
                      onClick={() => setSelectedDeptId(dept.id)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-colors flex justify-between items-center cursor-pointer ${
                        selectedDeptId === dept.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                      }`}
                    >
                      <span className="truncate">{dept.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] shrink-0 ${selectedDeptId === dept.id ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {waitingCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Department Actions Control Panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Queue Operations Panel</h3>
                <span className="text-[11px] text-slate-800 font-extrabold truncate block">
                  Active Division: <span className="text-blue-600">{selectedDeptId === 'all' ? 'Select department...' : departments.find(d => d.id === selectedDeptId)?.name}</span>
                </span>
              </div>

              {selectedDeptId === 'all' ? (
                <div className="p-3 bg-amber-50 border border-amber-100 text-[10px] text-amber-800 leading-normal font-semibold rounded-lg">
                  💡 Select a clinical department from the list above to activate queue operations (Call Next / Complete Session).
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={handleCallNext}
                    disabled={actionLoading || waitingTickets.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {actionLoading ? 'Advancing state...' : 'Call Next Patient'}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </button>

                  <button
                    onClick={handleCompleteCurrent}
                    disabled={actionLoading || !servingTicket}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {actionLoading ? 'Updating session...' : 'Complete Current Consultation'}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Now Serving Panel */}
            {selectedDeptId !== 'all' && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Consultation</h3>
                
                {servingTicket ? (
                  <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-xl space-y-3.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-bold text-teal-600 uppercase tracking-wider block">Serving Token</span>
                        <span className="text-lg font-black text-teal-800 block">
                          TKT-{servingTicket.ticketNumber.split('-')[2]?.substring(0, 6) || servingTicket.id.substring(0, 6)}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-teal-600 text-white text-[9px] font-bold uppercase tracking-wider animate-pulse">
                        In Room
                      </span>
                    </div>

                    <div className="border-t border-teal-100 pt-3 text-xs text-slate-700 space-y-1.5 font-semibold">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Patient:</span>
                        <span className="text-slate-900">{getPatientMetadata(servingTicket.id).patientName} (Age {getPatientMetadata(servingTicket.id).patientAge})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Contact:</span>
                        <span className="text-slate-900">{getPatientMetadata(servingTicket.id).patientPhone}</span>
                      </div>
                      {getPatientMetadata(servingTicket.id).reason && (
                        <div className="flex justify-between items-start gap-4">
                          <span className="text-slate-400 shrink-0">Reason:</span>
                          <span className="text-slate-900 text-right truncate">{getPatientMetadata(servingTicket.id).reason}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-400">Called At:</span>
                        <span className="text-slate-500">
                          {new Date(servingTicket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 border border-slate-200 border-dashed rounded-xl text-slate-400 text-xs font-semibold">
                    No patient is currently being served in this department.
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Right Panel: Waiting list & lookup search */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Search and Lookup bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:max-w-md">
                <input
                  type="text"
                  placeholder="Lookup ticket number, patient name, or phone..."
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
              
              <div className="text-xs text-slate-500 font-bold shrink-0">
                {searchQuery ? `${searchedTickets.length} match(es) found` : `Total active tickets: ${tickets.length}`}
              </div>
            </div>

            {/* Waiting Queue List Card */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    {searchQuery ? 'Search Query Results' : (selectedDeptId === 'all' ? 'All Active Wait Lists' : 'Department Waiting Queue')}
                  </h2>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">First-In, First-Out (FIFO) Order</span>
                </div>
              </div>

              {loading && tickets.length === 0 ? (
                /* Skeleton table */
                <div className="p-6 space-y-3 animate-pulse">
                  <div className="h-8 bg-slate-100 rounded w-full" />
                  <div className="h-10 bg-slate-50 rounded w-full" />
                  <div className="h-10 bg-slate-50 rounded w-full" />
                </div>
              ) : (searchQuery ? searchedTickets : waitingTickets).length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                  No active waiting records match the criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-5">Pos</th>
                        <th className="py-3 px-5">Token Number</th>
                        <th className="py-3 px-5">Patient Details</th>
                        <th className="py-3 px-5">Department</th>
                        <th className="py-3 px-5">Wait Estimate</th>
                        <th className="py-3 px-5">Status</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(searchQuery ? searchedTickets : waitingTickets).map((t, index) => {
                        const meta = getPatientMetadata(t.id);
                        const dept = departments.find(d => d.id === t.departmentId);
                        const deptName = dept ? dept.name : 'Clinical Division';
                        const tktNum = t.ticketNumber.split('-')[2]?.substring(0, 6) || t.id.substring(0, 6);
                        
                        // Wait estimation: position * 8 mins
                        const waitEst = (index + 1) * 8;

                        const getStatusBadge = (status) => {
                          switch (status) {
                            case 'serving':
                              return <span className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold">Serving</span>;
                            case 'completed':
                              return <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">Completed</span>;
                            case 'cancelled':
                              return <span className="px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-800 text-[10px] font-bold">Cancelled</span>;
                            case 'waiting':
                            default:
                              return <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-bold">Waiting</span>;
                          }
                        };

                        return (
                          <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-5 text-slate-400 font-bold">#{index + 1}</td>
                            <td className="py-4 px-5 font-black text-slate-800 font-mono">TKT-{tktNum}</td>
                            <td className="py-4 px-5 space-y-0.5">
                              <div className="font-bold text-slate-900">{meta.patientName}</div>
                              <div className="text-[10px] text-slate-400 font-semibold">Age {meta.patientAge} • {meta.patientPhone}</div>
                              {meta.reason && <div className="text-[10px] text-slate-500 truncate max-w-[180px]">{meta.reason}</div>}
                            </td>
                            <td className="py-4 px-5 text-slate-600 font-semibold">{deptName}</td>
                            <td className="py-4 px-5 font-bold text-slate-700">
                              {t.status === 'waiting' ? `~${waitEst}m` : '0m'}
                            </td>
                            <td className="py-4 px-5">{getStatusBadge(t.status)}</td>
                            <td className="py-4 px-5 text-right space-x-1.5 shrink-0">
                              {t.status === 'waiting' && selectedDeptId !== 'all' && (
                                <button
                                  onClick={handleCallNext}
                                  disabled={actionLoading}
                                  className="text-[10px] font-bold bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 py-1 px-2.5 rounded transition-colors cursor-pointer"
                                >
                                  Call
                                </button>
                              )}
                              {t.status !== 'completed' && t.status !== 'cancelled' && (
                                <button
                                  onClick={() => handleCancelTicket(t.id, t.ticketNumber)}
                                  disabled={actionLoading}
                                  className="text-[10px] font-bold bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 py-1 px-2.5 rounded transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Activity Timeline Logs */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recent Activity logs</h3>
              
              {logs.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-xs font-semibold">
                  No activity events registered yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div key={log.id} className="flex gap-3 text-xs leading-normal border-b border-slate-50 pb-2">
                      <span className="font-mono text-slate-400 shrink-0 font-bold">{log.time}</span>
                      <span className="text-slate-700 font-semibold">{log.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </main>
      
      {/* Small Legal disclaimer footer */}
      <footer className="bg-slate-100 border-t border-slate-200 py-4 text-center text-[10px] text-slate-400 uppercase tracking-wider">
        Hospital Operations Control Center © 2026 SmartQueue System. All database systems online.
      </footer>

    </div>
  );
};

export default Dashboard;
