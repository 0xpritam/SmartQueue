import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PatientNavbar from '../components/PatientNavbar';
import PatientFooter from '../components/PatientFooter';
import { 
  getTicketDetails, 
  advanceQueueForTicket, 
  updateTicket 
} from '../api/mockData';

const QueueStatus = () => {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [notFound, setNotFound] = useState(false);

  // Load and refresh ticket details
  const fetchTicket = () => {
    if (!ticketId) return;
    const details = getTicketDetails(ticketId);
    if (details) {
      setTicket(details);
      setNotFound(false);
    } else {
      setNotFound(true);
    }
  };

  useEffect(() => {
    fetchTicket();

    // Simulate real-time polling (e.g. WebSocket / API polling simulation)
    // Every 2 seconds it pulls from localStorage so the queue state stays reactive
    const interval = setInterval(() => {
      fetchTicket();
    }, 2000);

    return () => clearInterval(interval);
  }, [ticketId]);

  // Demo: Advance queue manually
  const handleAdvanceQueue = () => {
    if (!ticket) return;
    const updated = advanceQueueForTicket(ticket.ticketId);
    setTicket(updated);
  };

  // Demo: Reset queue to original wait state
  const handleResetQueue = () => {
    if (!ticket) return;
    const baseServing = ticket.tokenNumber - 4 > 100 ? ticket.tokenNumber - 4 : 100;
    const updated = updateTicket(ticket.ticketId, {
      currentServingToken: baseServing,
      status: 'Waiting'
    });
    setTicket(updated);
  };

  // Calculate current queue position (how many patients are ahead)
  const calculatePosition = () => {
    if (!ticket) return 0;
    const diff = ticket.tokenNumber - ticket.currentServingToken;
    return diff > 0 ? diff : 0;
  };

  // Calculate dynamic wait time based on position
  const calculateCurrentWaitTime = (position) => {
    if (!ticket) return 0;
    if (ticket.status === 'Called') return 0;
    if (ticket.status === 'Completed') return 0;
    // Estimate 8 minutes per patient ahead
    return position * 8;
  };

  const position = calculatePosition();
  const currentWaitTime = calculateCurrentWaitTime(position);

  // Ticket styling helper based on status
  const getStatusConfig = () => {
    switch (ticket?.status) {
      case 'Called':
        return {
          bg: 'bg-teal-50 border-teal-200 text-teal-800',
          badge: 'bg-teal-600 text-white animate-pulse',
          desc: 'Your token is being called! Please proceed to the consultation room immediately.',
          color: 'text-teal-700'
        };
      case 'Completed':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          badge: 'bg-emerald-600 text-white',
          desc: 'Your consultation session is marked as completed. Thank you for checking in online!',
          color: 'text-emerald-700'
        };
      case 'Waiting':
      default:
        return {
          bg: 'bg-blue-50 border-blue-200 text-blue-800',
          badge: 'bg-blue-600 text-white',
          desc: 'You are in queue. Relax at home or in the lobby; we will update your screen live.',
          color: 'text-blue-700'
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <PatientNavbar />

      <main className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow w-full">
        {notFound ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200 shadow-sm p-8 space-y-4">
            <svg className="w-16 h-16 text-slate-300 mx-auto" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
            <h2 className="text-lg font-bold text-slate-900">Ticket Not Found</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              We couldn't find a queue ticket with ID <span className="font-bold text-slate-800">"{ticketId}"</span>. Make sure the ID is formatted correctly (e.g. CAR-102) and that it was generated on this browser.
            </p>
            <div className="pt-4 flex justify-center gap-4">
              <Link to="/book-ticket" className="btn-primary py-2 text-xs font-semibold">
                Book New Ticket
              </Link>
              <Link to="/hospitals" className="btn-secondary py-2 text-xs font-semibold">
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
                {ticket.status === 'Called' ? (
                  <svg className="h-5 w-5 animate-bounce" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                ) : ticket.status === 'Completed' ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
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
                    {ticket.hospitalName}
                  </h2>
                  <p className="text-[11px] text-slate-300 font-semibold">
                    Clinical Division: <span className="text-white font-bold">{ticket.department}</span>
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
                  <div className={`text-4xl font-black tracking-tight ${statusConfig.color}`}>
                    {ticket.ticketId}
                  </div>
                  <div className="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider mt-1.5 bg-slate-200 text-slate-700">
                    Token #{ticket.tokenNumber}
                  </div>
                </div>

                {/* Queue Stats Grid */}
                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  
                  {/* Current Serving */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Serving Now</span>
                    <span className="text-lg font-extrabold text-slate-900 block">
                      {ticket.status === 'Completed' ? '—' : `${ticket.ticketId.split('-')[0]}-${ticket.currentServingToken}`}
                    </span>
                  </div>

                  {/* Position */}
                  <div className="space-y-1 border-x border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Your Position</span>
                    <span className="text-lg font-extrabold text-slate-900 block">
                      {ticket.status === 'Completed' ? (
                        <span className="text-emerald-600 text-sm">Checked In</span>
                      ) : ticket.status === 'Called' ? (
                        <span className="text-teal-600 text-sm animate-pulse">Your Turn</span>
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
                    <span className="text-lg font-extrabold text-slate-900 block">
                      {ticket.status === 'Completed' ? '0 mins' : `${currentWaitTime} mins`}
                    </span>
                  </div>

                </div>

                {/* Patient / Timestamp Meta Info */}
                <div className="border-t border-slate-100 pt-5 text-xs text-slate-600 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-400 uppercase text-[10px]">Patient</span>
                    <span className="font-bold text-slate-900">{ticket.patientName} (Age {ticket.patientAge})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-400 uppercase text-[10px]">Phone</span>
                    <span className="font-semibold text-slate-800">{ticket.patientPhone}</span>
                  </div>
                  {ticket.reason && (
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-slate-400 uppercase text-[10px] shrink-0 pt-0.5">Reason</span>
                      <span className="font-semibold text-slate-800 text-right max-w-[70%] truncate">{ticket.reason}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-400 uppercase text-[10px]">Booked At</span>
                    <span className="font-semibold text-slate-500">
                      {new Date(ticket.bookingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

            {/* DEMO QUEUE SIMULATOR CONTROL PANEL */}
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
                  <h3 className="text-xs font-bold uppercase tracking-wider">Demo Queue Simulator</h3>
                  <p className="text-[10px] text-slate-500 font-semibold">Test live queue status transitions locally.</p>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                This panel simulates the clinic receptionist advancing the queue. Click **Advance Queue** to call the next token. Observe the position decreases and status updates to **Called** (pulsing teal alert) and then **Completed** (green alert) on this page in real time.
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAdvanceQueue}
                  disabled={ticket.status === 'Completed'}
                  className="flex-grow bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Advance Queue
                </button>
                <button
                  onClick={handleResetQueue}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs py-2 px-3 rounded transition-colors cursor-pointer"
                >
                  Reset Demo
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
