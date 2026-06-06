import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PatientNavbar from '../components/PatientNavbar';
import PatientFooter from '../components/PatientFooter';
import { useAuth } from '../context/AuthContext';
import { getTicket } from '../api/tickets';
import { 
  getCurrentServing, 
  getWaitingTickets,
  callNextPatient,
  completeCurrentPatient 
} from '../api/queues';
import { register as apiRegister } from '../api/auth';

const QueueStatus = () => {
  const { token, login } = useAuth();
  const { ticketId } = useParams(); // UUID of the ticket
  
  // State variables
  const [ticket, setTicket] = useState(null);
  const [servingTicket, setServingTicket] = useState(null);
  const [waitingTickets, setWaitingTickets] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  // Retrieve patient metadata stored in localStorage
  const [meta, setMeta] = useState({
    patientName: 'Outpatient Patient',
    patientAge: '—',
    patientPhone: '—',
    reason: '',
    hospitalName: 'SmartQueue Partner Clinic',
    departmentName: 'Clinical Division'
  });

  // Load metadata on mount
  useEffect(() => {
    const stored = localStorage.getItem(`smartqueue_meta_${ticketId}`);
    if (stored) {
      setMeta(JSON.parse(stored));
    }
  }, [ticketId]);

  // Silent Guest Authentication: ensures frictionless patient ticket status tracking
  useEffect(() => {
    const ensureToken = async () => {
      if (!token && !guestLoading) {
        setGuestLoading(true);
        try {
          const guestEmail = `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}@smartqueue.demo`;
          const guestPassword = 'smartqueue_guest_pass_123';
          const guestName = 'Outpatient Guest';
          
          await apiRegister(guestName, guestEmail, guestPassword);
          await login(guestEmail, guestPassword);
        } catch (err) {
          console.error('Silent guest auth error in tracking:', err);
        } finally {
          setGuestLoading(false);
        }
      }
    };

    ensureToken();
  }, [token, login, guestLoading]);

  // Fetch ticket details and active queue stats from backend APIs
  const fetchQueueData = async (isSilent = false) => {
    if (!token) {
      // Wait for silent guest session to be established
      return;
    }
    if (!isSilent) setLoading(true);
    
    try {
      // 1. Fetch main ticket details
      const ticketRes = await getTicket(ticketId);
      if (ticketRes && ticketRes.success && ticketRes.ticket) {
        const t = ticketRes.ticket;
        setTicket(t);
        setNotFound(false);
        setError(null);

        // 2. Fetch currently serving ticket for this department
        try {
          const servingRes = await getCurrentServing(t.departmentId);
          if (servingRes && servingRes.success) {
            setServingTicket(servingRes.ticket);
          } else {
            setServingTicket(null);
          }
        } catch (sErr) {
          setServingTicket(null);
        }

        // 3. Fetch waiting list for this department
        const waitingRes = await getWaitingTickets(t.departmentId);
        if (waitingRes && waitingRes.success) {
          setWaitingTickets(waitingRes.tickets || []);
        }
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error('Fetch queue status error:', err);
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        setError(err.response?.data?.message || err.message || 'API connection failed.');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueData();

    // Poll server every 3 seconds for real-time state updates
    const interval = setInterval(() => {
      fetchQueueData(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [ticketId, token]);

  // Calculate position in queue (how many people are ahead of us)
  const calculateQueuePosition = () => {
    if (!ticket) return { position: 0, peopleAhead: 0 };
    if (ticket.status === 'serving') return { position: 0, peopleAhead: 0 };
    if (ticket.status === 'completed') return { position: 0, peopleAhead: 0 };

    const index = waitingTickets.findIndex(t => t.id === ticket.id);
    if (index !== -1) {
      return { position: index + 1, peopleAhead: index };
    }
    
    return { position: 1, peopleAhead: 0 };
  };

  // ADVANCE QUEUE SIMULATOR (Modifies backend MySQL state directly)
  const handleAdvanceQueue = async () => {
    if (!ticket || !token) return;
    setActionLoading(true);
    setError(null);
    try {
      if (servingTicket) {
        await completeCurrentPatient(ticket.departmentId);
      } else if (waitingTickets.length > 0) {
        await callNextPatient(ticket.departmentId);
      } else {
        setError('No active patients in queue to advance.');
      }
      await fetchQueueData(true);
    } catch (err) {
      console.error('Simulator action error:', err);
      setError(err.response?.data?.message || 'Failed to simulate queue movement.');
    } finally {
      setActionLoading(false);
    }
  };

  const { position, peopleAhead } = calculateQueuePosition();
  const estWaitTime = ticket?.status === 'waiting' ? peopleAhead * 8 : 0;

  // Visual status configurations
  const getStatusConfig = () => {
    if (!ticket) return { bg: '', badge: '', desc: '', color: '' };
    
    switch (ticket.status) {
      case 'serving':
        return {
          bg: 'bg-teal-50 border-teal-200 text-teal-800',
          badge: 'bg-teal-600 text-white animate-pulse',
          desc: 'Your token is being called! Please proceed to the examination room immediately.',
          color: 'text-teal-700',
          label: 'Called'
        };
      case 'completed':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          badge: 'bg-emerald-600 text-white',
          desc: 'Your consultation is complete. Thank you for booking online with SmartQueue!',
          color: 'text-emerald-700',
          label: 'Completed'
        };
      case 'cancelled':
        return {
          bg: 'bg-red-50 border-red-200 text-red-800',
          badge: 'bg-red-600 text-white',
          desc: 'This ticket has been cancelled. Please book another ticket to re-enter the queue.',
          color: 'text-red-700',
          label: 'Cancelled'
        };
      case 'waiting':
      default:
        return {
          bg: 'bg-blue-50 border-blue-200 text-blue-800',
          badge: 'bg-blue-600 text-white',
          desc: 'You are in the queue. Relax nearby; this receipt will update live when you are called.',
          color: 'text-blue-700',
          label: 'Waiting'
        };
    }
  };

  const statusConfig = getStatusConfig();

  const getReadableTicketId = () => {
    if (!ticket) return '';
    if (ticket.ticketNumber.startsWith('TKT-')) {
      const parts = ticket.ticketNumber.split('-');
      if (parts.length >= 3) {
        return `TKT-${parts[2].substring(0, 6)}`;
      }
    }
    return ticket.ticketNumber.substring(0, 10);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <PatientNavbar />

      <main className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow w-full">
        {loading || guestLoading ? (
          /* Skeleton Loader */
          <div className="space-y-6 animate-pulse">
            <div className="h-10 bg-slate-200 rounded w-full" />
            <div className="bg-white rounded-2xl h-[380px] border border-slate-200 p-6 space-y-6">
              <div className="h-6 bg-slate-200 rounded w-1/3 mx-auto" />
              <div className="h-24 bg-slate-100 rounded w-full" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-12 bg-slate-50 rounded" />
                <div className="h-12 bg-slate-50 rounded" />
                <div className="h-12 bg-slate-50 rounded" />
              </div>
            </div>
          </div>
        ) : notFound ? (
          /* Ticket Not Found Error State */
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200 shadow-sm p-8 space-y-4">
            <svg className="w-16 h-16 text-slate-300 mx-auto" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
            <h2 className="text-lg font-bold text-slate-900">Ticket Not Found</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              We couldn't locate ticket record <span className="font-bold text-slate-800">"{ticketId}"</span> in your account history. Verify that the URL matches your generated booking receipt.
            </p>
            <div className="pt-4 flex justify-center gap-4">
              <Link to="/book-ticket" className="btn-primary py-2 text-xs font-semibold cursor-pointer">
                Book Queue
              </Link>
              <Link to="/hospitals" className="btn-secondary py-2 text-xs font-semibold cursor-pointer">
                View Hospitals
              </Link>
            </div>
          </div>
        ) : ticket ? (
          <div className="space-y-6">
            
            {/* Live Status Header Alert */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`border rounded-lg p-4 flex gap-3.5 text-xs font-medium shadow-sm transition-all ${statusConfig.bg}`}
            >
              <div className="h-5 w-5 shrink-0 flex items-center justify-center">
                {ticket.status === 'serving' ? (
                  <svg className="h-5 w-5 animate-bounce text-teal-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                ) : ticket.status === 'completed' ? (
                  <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 animate-spin text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                )}
              </div>
              <div>
                <p className="font-bold">Live Status update</p>
                <p className="mt-0.5 leading-relaxed opacity-90">{statusConfig.desc}</p>
              </div>
            </motion.div>

            {/* High-Fidelity Outpatient Digital Ticket Card */}
            <motion.div
              layout
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg"
            >
              {/* Ticket Top: Hospital Header */}
              <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-20 h-20 bg-teal-500/10 rounded-full blur-xl" />
                <div className="relative z-10 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    SmartQueue Clinic Receipt
                  </div>
                  <h2 className="text-base font-extrabold tracking-tight truncate">
                    {meta.hospitalName}
                  </h2>
                  <p className="text-[11px] text-slate-300 font-semibold">
                    Clinical Division: <span className="text-white font-bold">{meta.departmentName}</span>
                  </p>
                </div>
              </div>

              {/* Dotted tear-off divider styling */}
              <div className="relative flex items-center justify-between py-1 bg-white">
                <div className="w-4 h-6 rounded-r-full bg-slate-50 border-y border-r border-slate-200 -ml-0.5 shrink-0" />
                <div className="border-t-2 border-dashed border-slate-200 w-full mx-2" />
                <div className="w-4 h-6 rounded-l-full bg-slate-50 border-y border-l border-slate-200 -mr-0.5 shrink-0" />
              </div>

              {/* Ticket Middle: Queue Parameters */}
              <div className="p-6 sm:p-8 space-y-6">
                
                {/* Large Token / Ticket ID display */}
                <div className="text-center space-y-1.5 py-4 bg-slate-50 rounded-xl border border-slate-100 relative">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Your Queue Token Number
                  </div>
                  <div className={`text-3xl font-black tracking-tight truncate px-4 ${statusConfig.color}`}>
                    {getReadableTicketId()}
                  </div>
                  <div className="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider mt-1.5 bg-slate-200 text-slate-700">
                    Status: {statusConfig.label}
                  </div>
                </div>

                {/* Queue Stats Grid */}
                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  
                  {/* Current Serving */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Serving Now</span>
                    <span className="text-sm font-extrabold text-slate-900 block truncate">
                      {ticket.status === 'completed' ? '—' : (servingTicket ? `TKT-${servingTicket.ticketNumber.split('-')[2].substring(0,6)}` : 'None')}
                    </span>
                  </div>

                  {/* Position */}
                  <div className="space-y-1 border-x border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Your Position</span>
                    <span className="text-sm font-extrabold text-slate-900 block">
                      {ticket.status === 'completed' ? (
                        <span className="text-emerald-600">Checked In</span>
                      ) : ticket.status === 'serving' ? (
                        <span className="text-teal-600 animate-pulse font-bold">Your Turn</span>
                      ) : position === 1 ? (
                        'Next'
                      ) : (
                        `${position} ahead`
                      )}
                    </span>
                  </div>

                  {/* Estimated Wait */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Est. Wait</span>
                    <span className="text-sm font-extrabold text-slate-900 block">
                      {ticket.status === 'completed' || ticket.status === 'serving' ? '0 mins' : `${estWaitTime} mins`}
                    </span>
                  </div>

                </div>

                {/* Patient / Timestamp Meta Info */}
                <div className="border-t border-slate-100 pt-5 text-xs text-slate-600 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-400 uppercase text-[10px]">Patient</span>
                    <span className="font-bold text-slate-900">{meta.patientName} (Age {meta.patientAge})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-400 uppercase text-[10px]">Phone</span>
                    <span className="font-semibold text-slate-800">{meta.patientPhone}</span>
                  </div>
                  {meta.reason && (
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-slate-400 uppercase text-[10px] shrink-0 pt-0.5">Reason</span>
                      <span className="font-semibold text-slate-800 text-right max-w-[75%] truncate">{meta.reason}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-400 uppercase text-[10px]">Booked At</span>
                    <span className="font-semibold text-slate-500">
                      {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

              </div>

              {/* Ticket Footer Action Bar */}
              <div className="bg-slate-50 border-t border-slate-100 p-4 flex gap-3 justify-center">
                <button 
                  onClick={() => window.print()}
                  className="btn-secondary py-1.5 px-4 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Slip
                </button>
                <Link 
                  to="/book-ticket" 
                  className="btn-primary py-1.5 px-4 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  Book Another
                </Link>
              </div>
            </motion.div>

            {/* REAL DATABASE QUEUE SIMULATOR CONTROL PANEL */}
            <motion.div 
              layout
              className="bg-white border-2 border-dashed border-amber-300 rounded-xl p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center gap-2 text-amber-800">
                <span className="p-1 rounded bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider">Database Queue Simulator</h3>
                  <p className="text-[10px] text-slate-500 font-semibold font-mono">Department ID: {ticket.departmentId.substring(0,8)}...</p>
                </div>
              </div>

              {error && (
                <div className="p-2.5 bg-red-50 border border-red-100 rounded text-[10px] text-red-700 font-semibold">
                  {error}
                </div>
              )}

              <div className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                This panel executes operations directly against the MySQL queue controller. Clicking **Advance Queue** will call the next patient (setting status to `serving`) or mark the active patient as `completed`. Since the page polls every 3s, the changes are synchronized instantly.
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAdvanceQueue}
                  disabled={ticket.status === 'completed' || actionLoading}
                  className="flex-grow bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                >
                  {actionLoading ? 'Advancing DB State...' : 'Advance Queue'}
                </button>
              </div>
            </motion.div>

          </div>
        ) : null}
      </main>

      <PatientFooter />
    </div>
  );
};

export default QueueStatus;
