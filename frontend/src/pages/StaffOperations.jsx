import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/auth';

const StaffOperations = () => {
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();
  const { socket, connectionStatus } = useSocket();

  // Selected Department Filter
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('all');

  // Queues & Stats State
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Confirmations Modals
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: '', // 'start', 'complete', 'cancel'
    ticket: null,
    message: ''
  });

  // Serving Timer
  const [servingTicket, setServingTicket] = useState(null);
  const [servingDuration, setServingDuration] = useState(0);

  // Fetch Departments
  const fetchDepartments = async () => {
    try {
      const res = await api.get('/admin/departments');
      if (res.data.success) {
        setDepartments(res.data.departments.filter(d => d.status === 'active'));
      }
    } catch (err) {
      console.error('Fetch departments error:', err);
    }
  };

  // Fetch Tickets
  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      // Query parameters
      let url = '/tickets';
      const params = [];
      if (currentUser?.role === 'staff') {
        // Enforce staff locked departmentId
        if (currentUser.departmentId) {
          params.push(`departmentId=${currentUser.departmentId}`);
        }
      } else if (selectedDeptId !== 'all') {
        params.push(`departmentId=${selectedDeptId}`);
      }

      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }

      const res = await api.get(url);
      if (res.data.success) {
        setTickets(res.data.tickets);
      }
    } catch (err) {
      console.error('Fetch tickets error:', err);
      setError(err.response?.data?.message || 'Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize data
  useEffect(() => {
    fetchDepartments();
    // Default selected department for staff
    if (currentUser?.role === 'staff' && currentUser.departmentId) {
      setSelectedDeptId(currentUser.departmentId);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchTickets();
  }, [selectedDeptId, currentUser]);

  // Live Socket.IO Updates
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchTickets();
    };

    socket.on('queue_updated', handleUpdate);
    socket.on('ticket_updated', handleUpdate);
    socket.on('analytics_updated', handleUpdate);
    socket.on('serving_started', handleUpdate);
    socket.on('visit_completed', handleUpdate);
    socket.on('ticket_cancelled', handleUpdate);

    return () => {
      socket.off('queue_updated', handleUpdate);
      socket.off('ticket_updated', handleUpdate);
      socket.off('analytics_updated', handleUpdate);
      socket.off('serving_started', handleUpdate);
      socket.off('visit_completed', handleUpdate);
      socket.off('ticket_cancelled', handleUpdate);
    };
  }, [socket]);

  // Compute stats and split tickets list
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const waitingTickets = tickets
    .filter(t => t.status === 'waiting')
    .sort((a, b) => {
      const timeA = a.rescheduledAt || a.createdAt;
      const timeB = b.rescheduledAt || b.createdAt;
      return new Date(timeA) - new Date(timeB);
    });

  const servingTickets = tickets.filter(t => t.status === 'serving');

  const completedToday = tickets.filter(t =>
    t.status === 'completed' && new Date(t.updatedAt || t.completedAt) >= todayStart
  );

  const cancelledToday = tickets.filter(t =>
    t.status === 'cancelled' && new Date(t.updatedAt) >= todayStart
  );

  // Set serving ticket for timer
  useEffect(() => {
    if (servingTickets.length > 0) {
      // Find the currently serving ticket for the selected department
      let currentServing = null;
      if (currentUser?.role === 'staff') {
        currentServing = servingTickets.find(t => t.departmentId === currentUser.departmentId);
      } else if (selectedDeptId !== 'all') {
        currentServing = servingTickets.find(t => t.departmentId === selectedDeptId);
      } else {
        currentServing = servingTickets[0]; // fallback
      }
      setServingTicket(currentServing);
    } else {
      setServingTicket(null);
    }
  }, [tickets, selectedDeptId, currentUser]);

  // Serving Timer tick
  useEffect(() => {
    if (!servingTicket) {
      setServingDuration(0);
      return;
    }

    const startTime = new Date(servingTicket.servingStartTime || servingTicket.calledAt).getTime();
    
    // Set initial duration
    setServingDuration(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));

    const timer = setInterval(() => {
      const duration = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      setServingDuration(duration);
    }, 1000);

    return () => clearInterval(timer);
  }, [servingTicket]);

  const formatDuration = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Trigger Operations
  const openConfirm = (type, ticket) => {
    let message = '';
    if (type === 'start') {
      message = `Are you sure you want to call and start serving Ticket ${ticket.ticketNumber}?`;
    } else if (type === 'complete') {
      message = `Are you sure you want to complete the visit for Ticket ${ticket.ticketNumber}?`;
    } else if (type === 'cancel') {
      message = `Are you sure you want to cancel Ticket ${ticket.ticketNumber}? This will send a cancellation notice.`;
    }

    setConfirmModal({
      isOpen: true,
      type,
      ticket,
      message
    });
  };

  const handleConfirmAction = async () => {
    const { type, ticket } = confirmModal;
    setConfirmModal({ isOpen: false, type: '', ticket: null, message: '' });
    setError(null);
    setSuccess(null);

    try {
      let res;
      if (type === 'start') {
        res = await api.post(`/tickets/${ticket.id}/start-serving`);
        if (res.data.success) {
          setSuccess(`Serving started for ticket ${ticket.ticketNumber}.`);
        }
      } else if (type === 'complete') {
        res = await api.post(`/tickets/${ticket.id}/complete`);
        if (res.data.success) {
          setSuccess(`Ticket ${ticket.ticketNumber} completed successfully.`);
        }
      } else if (type === 'cancel') {
        res = await api.post(`/tickets/${ticket.id}/cancel`);
        if (res.data.success) {
          setSuccess(`Ticket ${ticket.ticketNumber} has been cancelled.`);
        }
      }
      fetchTickets();
    } catch (err) {
      console.error('Queue action error:', err);
      setError(err.response?.data?.message || 'Failed to perform queue action.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans antialiased">
      {/* Navigation Header */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center border border-blue-500 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-md font-black tracking-tight text-white leading-tight">SmartQueue Operations</h1>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Live Queue Management Console</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Nav Tabs */}
            <nav className="hidden md:flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
              {currentUser?.role === 'admin' && (
                <Link to="/admin" className="text-slate-400 hover:text-white transition-colors">Admin Portal</Link>
              )}
              <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors">Staff Dashboard</Link>
              <Link to="/analytics" className="text-slate-400 hover:text-white transition-colors">Analytics</Link>
              <Link to="/staff-operations" className="text-blue-400 border-b-2 border-blue-500 pb-1">Staff Operations</Link>
            </nav>

            <div className="flex items-center gap-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 text-[9px] font-bold uppercase tracking-wider border border-slate-800 text-slate-300">
                <span className={`h-1.5 w-1.5 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
                  connectionStatus === 'reconnecting' ? 'bg-amber-500 animate-ping' :
                  'bg-slate-400'
                }`} />
                <span>{connectionStatus}</span>
              </div>
              <button
                onClick={() => logout()}
                className="px-3.5 py-1.5 border border-slate-700/80 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full space-y-6">
        
        {/* Error / Success Notifications */}
        {error && (
          <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl flex gap-3 text-xs text-red-300 animate-fadeIn">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="font-semibold leading-normal">{error}</div>
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-xl flex gap-3 text-xs text-emerald-300 animate-fadeIn">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="font-semibold leading-normal">{success}</div>
          </div>
        )}

        {/* Top Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl shadow-md">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Waiting Patients</span>
            <span className="text-2xl font-black text-white mt-2 block">{waitingTickets.length}</span>
          </div>
          <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl shadow-md">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Serving Patients</span>
            <span className="text-2xl font-black text-blue-400 mt-2 block">{servingTickets.length}</span>
          </div>
          <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl shadow-md">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Completed Today</span>
            <span className="text-2xl font-black text-emerald-400 mt-2 block">{completedToday.length}</span>
          </div>
          <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl shadow-md">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cancelled Today</span>
            <span className="text-2xl font-black text-red-400 mt-2 block">{cancelledToday.length}</span>
          </div>
        </div>

        {/* Filter controls */}
        <div className="bg-slate-850 p-4 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {currentUser?.role === 'staff' ? (
              <span>Locked Department: <strong className="text-white">{currentUser.department?.name || 'Assigned Division'}</strong></span>
            ) : (
              <span>Manage Department Queue</span>
            )}
          </div>

          {currentUser?.role === 'admin' && (
            <div className="flex items-center gap-2">
              <label htmlFor="dept-select" className="text-xs text-slate-400 font-bold uppercase">Division:</label>
              <select
                id="dept-select"
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Core Queues Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Waiting Queue List */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Waiting List ({waitingTickets.length})</span>
            </h3>

            {waitingTickets.length === 0 ? (
              <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-450">
                No patients currently waiting. The queue is empty.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {waitingTickets.map((t, idx) => {
                  const position = idx + 1;
                  const estWaitTime = (position - 1) * 8;
                  const patientName = t.user?.name || 'Outpatient Guest';
                  const deptName = t.department?.name || 'General';

                  return (
                    <div key={t.id} className="bg-slate-800 border border-slate-750/70 p-5 rounded-2xl shadow-xl flex flex-col justify-between space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs text-slate-400 font-bold uppercase">Token</div>
                          <div className="text-lg font-black text-white tracking-tight">{t.ticketNumber}</div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-750 text-slate-350">
                            Pos #{position}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs space-y-1">
                        <div>Patient: <strong className="text-slate-200">{patientName}</strong></div>
                        <div>Dept: <span className="text-slate-400 font-medium">{deptName}</span></div>
                        <div>Booked: <span className="text-slate-400">{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                        <div>Est. Wait: <span className="text-blue-400 font-bold">{estWaitTime === 0 ? 'Next up' : `${estWaitTime} min`}</span></div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-750/50">
                        <button
                          onClick={() => openConfirm('start', t)}
                          className="flex-grow bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs cursor-pointer shadow active:translate-y-[1px] transition-all"
                        >
                          Start Serving
                        </button>
                        <button
                          onClick={() => openConfirm('cancel', t)}
                          className="px-3 bg-slate-750 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs cursor-pointer active:translate-y-[1px] transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Serving Panel */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span>Currently Serving</span>
            </h3>

            {servingTicket ? (
              <div className="bg-slate-800 border border-blue-900/60 p-6 rounded-2xl shadow-2xl space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-blue-400 font-bold uppercase">Token</div>
                    <div className="text-2xl font-black text-white tracking-tight">{servingTicket.ticketNumber}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-950/60 text-blue-400 border border-blue-900">
                    Active
                  </span>
                </div>

                <div className="text-xs space-y-2 py-4 border-t border-b border-slate-750/50">
                  <div>Patient: <strong className="text-slate-200">{servingTicket.user?.name || 'Outpatient Guest'}</strong></div>
                  {servingTicket.user?.phone && <div>Phone: <span className="text-slate-400">{servingTicket.user.phone}</span></div>}
                  <div>Department: <span className="text-slate-300 font-bold">{servingTicket.department?.name || 'General'}</span></div>
                  <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-750 mt-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Serving Duration:</span>
                    <span className="text-sm font-black text-blue-400 font-mono tracking-wider">{formatDuration(servingDuration)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => openConfirm('complete', servingTicket)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs cursor-pointer shadow active:translate-y-[1px] transition-all"
                  >
                    Complete Visit
                  </button>
                  <button
                    onClick={() => openConfirm('cancel', servingTicket)}
                    className="w-full bg-slate-750 hover:bg-slate-700 text-red-400 hover:text-red-300 py-2.5 rounded-xl text-xs cursor-pointer active:translate-y-[1px] transition-all font-bold"
                  >
                    Cancel Visit
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/40 border border-slate-850 p-8 rounded-2xl text-center text-xs text-slate-450 leading-relaxed">
                No patient is currently being served.<br />Click <strong>Start Serving</strong> on any patient in the waiting queue to begin.
              </div>
            )}
          </div>
        </div>

        {/* Completed Today Table */}
        <div className="bg-slate-850 border border-slate-850 rounded-2xl overflow-hidden shadow-lg p-6 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Completed Today ({completedToday.length})</span>
          </h3>

          {completedToday.length === 0 ? (
            <p className="text-xs text-slate-450 text-center py-4">No completed appointments recorded today.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-450 font-bold uppercase tracking-wider">
                    <th className="px-6 py-3">Patient</th>
                    <th className="px-6 py-3">Ticket ID</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3 text-right">Completed Time</th>
                  </tr>
                </thead>
                <tbody>
                  {completedToday.map((t) => (
                    <tr key={t.id} className="border-b border-slate-800 hover:bg-slate-850 transition-colors">
                      <td className="px-6 py-3 font-bold text-white">{t.user?.name || 'Outpatient Guest'}</td>
                      <td className="px-6 py-3 text-slate-350">{t.ticketNumber}</td>
                      <td className="px-6 py-3 text-slate-350">{t.department?.name || 'General'}</td>
                      <td className="px-6 py-3 text-right text-slate-400">
                        {new Date(t.completedAt || t.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* CONFIRMATION DIALOG MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h3 className="text-md font-bold text-white">Confirm Queue Action</h3>
            <p className="text-xs text-slate-350 leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, type: '', ticket: null, message: '' })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 rounded-xl text-xs font-bold text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-750 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffOperations;
