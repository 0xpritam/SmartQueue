import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PatientNavbar from '../components/PatientNavbar';
import PatientFooter from '../components/PatientFooter';
import { useAuth } from '../context/AuthContext';
import { getMyTickets, getTicketQRCode, cancelTicket } from '../api/tickets';
import { getWaitingTickets } from '../api/queues';
import { getDepartments } from '../api/departments';
import { useSocket } from '../context/SocketContext';
import { updateProfile } from '../api/user';

const PatientDashboard = () => {
  const { currentUser, updateUser } = useAuth();
  const navigate = useNavigate();

  // Data State
  const [tickets, setTickets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [deptQueues, setDeptQueues] = useState({}); // deptId -> waitingList

  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [toast, setToast] = useState(null); // { message, type }
  
  // QR Code State
  const [selectedTicketForQR, setSelectedTicketForQR] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [qrError, setQrError] = useState(null);

  // Cancellation State
  const [ticketToCancel, setTicketToCancel] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    age: currentUser?.age !== null && currentUser?.age !== undefined ? currentUser.age : ''
  });

  const fetchPatientData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // 1. Fetch departments
      const deptsRes = await getDepartments();
      const resolvedDepts = deptsRes && deptsRes.success ? deptsRes.departments : [];
      setDepartments(resolvedDepts);

      // 2. Fetch logged-in user's own tickets
      const ticketsRes = await getMyTickets();
      const userTickets = ticketsRes && ticketsRes.success ? ticketsRes.tickets : [];
      setTickets(userTickets);

      // 3. Fetch waiting queues for active departments to calculate position & wait times
      const activeWaitingTickets = userTickets.filter(t => t.status === 'waiting');
      const queuesData = {};
      for (const t of activeWaitingTickets) {
        if (!queuesData[t.departmentId]) {
          try {
            const queueRes = await getWaitingTickets(t.departmentId);
            if (queueRes && queueRes.success) {
              queuesData[t.departmentId] = queueRes.tickets || [];
            }
          } catch (qErr) {
            console.error(`Failed to fetch queue list for department ${t.departmentId}`, qErr);
          }
        }
      }
      setDeptQueues(queuesData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch patient dashboard data:', err);
      setError('Could not load your dashboard parameters. Re-establishing link...');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientData();
    // Poll state every 4 seconds
    const interval = setInterval(() => {
      fetchPatientData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const { socket, connectionStatus } = useSocket();

  // Socket subscription for active departments and tickets
  useEffect(() => {
    if (!socket) return;

    const activeTickets = tickets.filter(t => t.status === 'waiting' || t.status === 'serving');
    
    activeTickets.forEach(t => {
      socket.emit('join_ticket', t.id);
      socket.emit('join_department', t.departmentId);
    });

    const handleUpdate = () => {
      console.log('[SOCKET] Refreshing patient dashboard data');
      fetchPatientData(true);
    };

    socket.on('ticket_updated', handleUpdate);
    socket.on('queue_updated', handleUpdate);

    return () => {
      socket.off('ticket_updated', handleUpdate);
      socket.off('queue_updated', handleUpdate);
    };
  }, [socket, tickets]);

  // Sync profile details if currentUser properties update
  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        age: currentUser.age !== null && currentUser.age !== undefined ? currentUser.age : ''
      });
    }
  }, [currentUser]);

  // Calculations
  const getDashboardStats = () => {
    const activeTickets = tickets.filter(t => t.status === 'waiting' || t.status === 'serving');
    const completedTickets = tickets.filter(t => t.status === 'completed');
    
    // Calculate total wait time for all user's active waiting tickets
    let totalWait = 0;
    activeTickets.forEach(t => {
      if (t.status === 'waiting' && deptQueues[t.departmentId]) {
        const idx = deptQueues[t.departmentId].findIndex(waitTkt => waitTkt.id === t.id);
        if (idx !== -1) {
          totalWait += idx * 8; // 8 minutes per patient ahead
        }
      }
    });

    const lastCompleted = completedTickets[0];
    const lastVisitDate = lastCompleted 
      ? new Date(lastCompleted.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
      : 'No visits yet';

    return {
      activeCount: activeTickets.length,
      completedCount: completedTickets.length,
      estWaitTime: totalWait,
      lastVisitDate
    };
  };

  const stats = getDashboardStats();

  const handleOpenQRModal = async (ticket) => {
    setSelectedTicketForQR(ticket);
    setQrLoading(true);
    setQrCodeData(null);
    setQrError(null);
    try {
      const res = await getTicketQRCode(ticket.id);
      if (res && res.success) {
        setQrCodeData(res.qrCode);
      } else {
        setQrError('Failed to load QR code. Please try again.');
      }
    } catch (err) {
      console.error('Fetch QR code error:', err);
      setQrError(err.response?.data?.message || 'Error fetching QR code. Try again later.');
    } finally {
      setQrLoading(false);
    }
  };

  const handleDownloadQR = () => {
    if (!qrCodeData || !selectedTicketForQR) return;
    const cleanNum = selectedTicketForQR.ticketNumber.split('-')[2]?.substring(0, 6) || selectedTicketForQR.id.substring(0, 6);
    const link = document.createElement('a');
    link.href = qrCodeData;
    link.download = `QR_Code_TKT-${cleanNum}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCancelSubmit = async (e) => {

    e.preventDefault();
    if (!ticketToCancel) return;
    setCancelLoading(true);
    try {
      const res = await cancelTicket(ticketToCancel.id);
      if (res && res.success) {
        setTicketToCancel(null);
        setToast({ message: 'Appointment cancelled successfully.', type: 'success' });
        setTimeout(() => setToast(null), 4000);
        // Refresh dashboard data
        await fetchPatientData(true);
      } else {
        setToast({ message: res.message || 'Failed to cancel appointment.', type: 'error' });
        setTimeout(() => setToast(null), 4000);
      }
    } catch (err) {
      console.error('Cancel ticket submit error:', err);
      const errMsg = err.response?.data?.message || 'An error occurred during cancellation.';
      setToast({ message: errMsg, type: 'error' });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleOpenEditModal = () => {
    setProfileForm({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      age: currentUser?.age !== null && currentUser?.age !== undefined ? currentUser.age : ''
    });
    setModalError(null);
    setIsEditingProfile(true);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setModalError(null);

    // Front-end validations
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      setModalError('Name and email are required');
      setSaveLoading(false);
      return;
    }

    const trimmedPhone = profileForm.phone ? profileForm.phone.trim() : '';
    if (trimmedPhone !== '') {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(trimmedPhone)) {
        setModalError('Phone number must be exactly 10 digits and contain only numbers.');
        setSaveLoading(false);
        return;
      }
    }

    const parsedAge = parseInt(profileForm.age, 10);
    if (profileForm.age !== '' && profileForm.age !== null && profileForm.age !== undefined && (isNaN(parsedAge) || parsedAge <= 0)) {
      setModalError('Age must be greater than 0');
      setSaveLoading(false);
      return;
    }

    try {
      const res = await updateProfile({
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
        phone: trimmedPhone || null,
        age: (profileForm.age !== '' && profileForm.age !== null && profileForm.age !== undefined) ? parsedAge : null
      });

      if (res && res.success) {
        // Update auth state globally
        updateUser(res.user);
        
        // Close modal
        setIsEditingProfile(false);

        // Show floating success toast
        setToast({ message: 'Profile details updated successfully.', type: 'success' });
        setTimeout(() => setToast(null), 4000);

        // Refresh dashboard data automatically
        await fetchPatientData(true);
      } else {
        setModalError(res.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Update profile submit error:', err);
      const errMsg = err.response?.data?.message || 'An error occurred while updating profile.';
      setModalError(errMsg);
    } finally {
      setSaveLoading(false);
    }
  };

  const getTicketMetadata = (ticketId) => {
    const stored = localStorage.getItem(`smartqueue_meta_${ticketId}`);
    if (stored) return JSON.parse(stored);
    return {
      patientName: currentUser?.name || 'Patient User',
      hospitalName: 'SmartQueue Partner Center',
      departmentName: 'Clinic Division'
    };
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'serving':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-[9px] font-bold uppercase tracking-wider animate-pulse shadow-sm">
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full shrink-0" />
            Serving
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold uppercase tracking-wider shadow-sm">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-[9px] font-bold uppercase tracking-wider shadow-sm">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
            Cancelled
          </span>
        );
      case 'waiting':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[9px] font-bold uppercase tracking-wider shadow-sm">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
            Waiting
          </span>
        );
    }
  };

  const activeTickets = tickets.filter(t => t.status === 'waiting' || t.status === 'serving');
  const pastTickets = tickets.filter(t => t.status === 'completed' || t.status === 'cancelled');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <PatientNavbar />

      {/* Hero Header */}
      <section className="bg-slate-900 text-white py-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-teal-500 opacity-80" />
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-800/80 text-blue-100 text-[10px] font-bold uppercase tracking-wider border border-blue-700">
                Patient Portal
              </span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-800 text-[9px] font-bold uppercase tracking-wider border border-slate-700 text-slate-300">
                <span className={`h-1.5 w-1.5 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
                  connectionStatus === 'reconnecting' ? 'bg-amber-500 animate-ping' :
                  'bg-slate-400'
                }`} />
                <span>
                  {connectionStatus === 'connected' ? 'Live Connected' :
                   connectionStatus === 'reconnecting' ? 'Reconnecting' :
                   'Offline (Polling)'}
                </span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {profileForm.name}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
              Track your active clinical queue slips, view consultation histories, and configure notifications.
            </p>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full space-y-6">

        {/* Global Alert */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex gap-3 text-xs text-red-700 font-semibold animate-fadeIn">
            <svg className="h-4 w-4 shrink-0 animate-bounce" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>{error}</div>
          </div>
        )}



        {/* Metrics Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Tickets */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="p-3.5 rounded bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div className="truncate">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Tickets</span>
              <span className="text-lg font-extrabold text-slate-900 block">{stats.activeCount} slips</span>
            </div>
          </div>

          {/* Completed Visits */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="p-3.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="truncate">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed Visits</span>
              <span className="text-lg font-extrabold text-slate-900 block">{stats.completedCount} sessions</span>
            </div>
          </div>

          {/* Average Wait Time */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="p-3.5 rounded bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="truncate">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Est. Wait Time</span>
              <span className="text-lg font-extrabold text-slate-900 block">{stats.estWaitTime} mins</span>
            </div>
          </div>

          {/* Last Visit Date */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="p-3.5 rounded bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="truncate">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Last Visit Date</span>
              <span className="text-lg font-extrabold text-slate-900 block">{stats.lastVisitDate}</span>
            </div>
          </div>
        </section>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left Column: Active tickets and History */}
          <div className="lg:col-span-8 space-y-6">

            {/* Active Tickets Section */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Active Queue Slips</h2>
                <p className="text-xs text-slate-500">Live pacing status for your active medical appointments.</p>
              </div>

              {loading && activeTickets.length === 0 ? (
                /* Skeleton Loader */
                <div className="space-y-3 animate-pulse">
                  <div className="h-16 bg-slate-100 rounded-lg w-full" />
                </div>
              ) : activeTickets.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-semibold">
                  No active queue tickets currently. Choose a clinic to check in.
                  <div className="pt-3">
                    <Link to="/hospitals" className="btn-primary py-1.5 px-4 text-xs font-bold shadow-sm">
                      Book Queue Slot
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeTickets.map(t => {
                    const meta = getTicketMetadata(t.id);
                    const cleanNum = t.ticketNumber.split('-')[2]?.substring(0, 6) || t.id.substring(0, 6);
                    
                    // Fetch position dynamically from dept queue dictionaries
                    let positionLabel = '—';
                    let estWaitVal = 0;
                    if (t.status === 'serving') {
                      positionLabel = 'Called';
                    } else if (t.status === 'waiting' && deptQueues[t.departmentId]) {
                      const idx = deptQueues[t.departmentId].findIndex(waitTkt => waitTkt.id === t.id);
                      if (idx !== -1) {
                        positionLabel = idx === 0 ? 'Next' : `${idx + 1} ahead`;
                        estWaitVal = idx * 8;
                      } else {
                        positionLabel = '1 ahead';
                      }
                    }

                    return (
                      <div key={t.id} className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all duration-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1 truncate w-full sm:max-w-md">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 font-mono text-base">TKT-{cleanNum}</span>
                            {getStatusBadge(t.status)}
                          </div>
                          <h4 className="text-xs font-extrabold text-slate-700 truncate">{meta.hospitalName}</h4>
                          <span className="text-[11px] text-slate-400 font-bold block uppercase tracking-wide">
                            Division: <span className="text-blue-600">{meta.departmentName}</span>
                          </span>
                        </div>

                        {/* Pacing Info */}
                        <div className="flex gap-4 sm:gap-6 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-6 text-center shrink-0 w-full sm:w-auto justify-around sm:justify-start">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Position</span>
                            <span className="text-xs font-extrabold text-slate-900 block">{positionLabel}</span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Est. Wait</span>
                            <span className="text-xs font-extrabold text-slate-900 block">
                              {t.status === 'serving' ? '0 mins' : `${estWaitVal} mins`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 pt-1.5 sm:pt-0 flex-wrap">
                            <button
                              onClick={() => handleOpenQRModal(t)}
                              className="btn-secondary py-1.5 px-3 text-xs font-bold cursor-pointer shrink-0 flex items-center gap-1.5"
                              title="View QR Code"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a1 1 0 11-2 0 1 1 0 012 0zM12 15a1 1 0 11-2 0 1 1 0 012 0zM18 15a1 1 0 11-2 0 1 1 0 012 0zM15 18a1 1 0 11-2 0 1 1 0 012 0zM18 18a1 1 0 11-2 0 1 1 0 012 0z" />
                              </svg>
                              <span>QR Code</span>
                            </button>
                            {t.status === 'waiting' && (
                              <button
                                onClick={() => setTicketToCancel(t)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors font-bold text-xs cursor-pointer shrink-0"
                                title="Cancel Ticket"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Cancel</span>
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`/queue-status/${t.id}`)}
                              className="btn-primary py-1.5 px-3.5 text-xs font-bold cursor-pointer shrink-0"
                            >
                              Track Live
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Visit History Section */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Booking History</h2>
                <p className="text-xs text-slate-500">Record of your completed and cancelled visits.</p>
              </div>

              {loading && pastTickets.length === 0 ? (
                <div className="p-6 space-y-3 animate-pulse">
                  <div className="h-10 bg-slate-100 rounded w-full" />
                </div>
              ) : pastTickets.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                  No historical visits found in this account.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                        <th className="py-3 px-5">Ticket ID</th>
                        <th className="py-3 px-5">Facility & Division</th>
                        <th className="py-3 px-5">Booking Date</th>
                        <th className="py-3 px-5">Final Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {pastTickets.map(t => {
                        const meta = getTicketMetadata(t.id);
                        const cleanNum = t.ticketNumber.split('-')[2]?.substring(0, 6) || t.id.substring(0, 6);
                        const dateStr = new Date(t.createdAt).toLocaleDateString([], { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        }) + ' ' + new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        return (
                          <tr key={t.id} className="hover:bg-slate-50/20 transition-colors">
                            <td className="py-4 px-5 font-black text-slate-700 font-mono">TKT-{cleanNum}</td>
                            <td className="py-4 px-5 space-y-0.5">
                              <div className="font-bold text-slate-900">{meta.hospitalName}</div>
                              <div className="text-[10px] text-slate-500 font-semibold">{meta.departmentName}</div>
                            </td>
                            <td className="py-4 px-5 text-slate-500">{dateStr}</td>
                            <td className="py-4 px-5">{getStatusBadge(t.status)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Profile Panel */}
          <div className="lg:col-span-4 space-y-6">

            {/* Profile Panel Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="text-center pb-4 border-b border-slate-100 relative">
                <div className="h-16 w-16 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center text-xl font-extrabold mx-auto shadow-sm">
                  {(profileForm.name || 'P').substring(0, 2).toUpperCase()}
                </div>
                <h3 className="text-sm font-bold text-slate-950 mt-3">{profileForm.name || 'Patient User'}</h3>
                <span className="text-[10px] text-teal-500 font-bold block uppercase tracking-wider mt-0.5">Registered Patient</span>
              </div>

              <div className="space-y-4 text-xs font-semibold text-slate-700">
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-slate-900 truncate max-w-[180px]">{profileForm.email || '—'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-400">Phone:</span>
                  <span className="text-slate-900">{profileForm.phone || '—'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-400">Patient Age:</span>
                  <span className="text-slate-900">{profileForm.age ? `${profileForm.age} yrs` : '—'}</span>
                </div>

                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="w-full btn-secondary py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.83 20.082a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                  Edit Profile Details
                </button>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 animate-fadeIn">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!saveLoading) setIsEditingProfile(false);
              }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 overflow-hidden z-10 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Edit Profile Details</h3>
                <button
                  type="button"
                  onClick={() => {
                    if (!saveLoading) setIsEditingProfile(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  disabled={saveLoading}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {modalError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 font-semibold flex items-center gap-2 animate-fadeIn">
                  <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>{modalError}</div>
                </div>
              )}

              <form onSubmit={handleProfileSave} className="space-y-4">
                <div>
                  <label htmlFor="modalName" className="input-label">Full Name</label>
                  <input
                    id="modalName"
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field font-semibold text-slate-800"
                    disabled={saveLoading}
                  />
                </div>
                <div>
                  <label htmlFor="modalEmail" className="input-label">Email Address</label>
                  <input
                    id="modalEmail"
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    className="input-field font-semibold text-slate-800"
                    disabled={saveLoading}
                  />
                </div>
                <div>
                  <label htmlFor="modalPhone" className="input-label">Phone Number</label>
                  <input
                    id="modalPhone"
                    type="tel"
                    placeholder="e.g. +1 (555) 000-1234"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="input-field font-semibold text-slate-800"
                    disabled={saveLoading}
                  />
                </div>
                <div>
                  <label htmlFor="modalAge" className="input-label">Age</label>
                  <input
                    id="modalAge"
                    type="number"
                    min="1"
                    max="120"
                    placeholder="e.g. 28"
                    value={profileForm.age}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, age: e.target.value }))}
                    className="input-field font-semibold text-slate-800"
                    disabled={saveLoading}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="btn-secondary flex-1 text-xs font-bold"
                    disabled={saveLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1 text-xs font-bold gap-2"
                    disabled={saveLoading}
                  >
                    {saveLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 max-w-sm ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {toast.type === 'error' ? (
              <svg className="h-5 w-5 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div className="text-xs font-semibold">{toast.message}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code Ticket Modal */}
      <AnimatePresence>
        {selectedTicketForQR && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 animate-fadeIn">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!qrLoading) setSelectedTicketForQR(null);
              }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 overflow-hidden z-10 space-y-5"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Queue Ticket Pass</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold font-sans mt-0.5">Scan at reception</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTicketForQR(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  disabled={qrLoading}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* QR Code content container */}
              <div className="flex flex-col items-center justify-center py-4 bg-slate-50 rounded-xl border border-slate-100 min-h-[220px]">
                {qrLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">Loading Pass...</span>
                  </div>
                ) : qrError ? (
                  <div className="text-center px-4 space-y-2">
                    <svg className="w-10 h-10 text-red-500 mx-auto" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-xs font-semibold text-red-700">{qrError}</p>
                    <button
                      onClick={() => handleOpenQRModal(selectedTicketForQR)}
                      className="btn-secondary py-1 px-3 text-[10px] font-bold"
                    >
                      Retry
                    </button>
                  </div>
                ) : qrCodeData ? (
                  <div className="space-y-4 text-center">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm inline-block">
                      <img src={qrCodeData} alt="Queue QR Code" className="w-40 h-40 mx-auto select-none" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ticket ID</div>
                      <div className="text-sm font-black text-slate-900 font-mono">
                        {selectedTicketForQR.ticketNumber}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Info Details & Action Buttons */}
              {!qrLoading && !qrError && qrCodeData && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-[11px] font-medium text-slate-600 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase">Division</span>
                      <span className="text-slate-800 font-bold">{getTicketMetadata(selectedTicketForQR.id).departmentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase">Status</span>
                      <span className="font-bold capitalize text-blue-600">{selectedTicketForQR.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase">Created At</span>
                      <span className="text-slate-500">
                        {new Date(selectedTicketForQR.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedTicketForQR(null)}
                      className="btn-secondary flex-1 py-2 text-xs font-bold cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleDownloadQR}
                      className="btn-primary flex-1 py-2 text-xs font-bold gap-1.5 cursor-pointer flex items-center justify-center"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancel Ticket Confirmation Modal */}
      <AnimatePresence>
        {ticketToCancel && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 animate-fadeIn">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!cancelLoading) setTicketToCancel(null);
              }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 overflow-hidden z-10 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Cancel Appointment</h3>
                <button
                  type="button"
                  onClick={() => setTicketToCancel(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  disabled={cancelLoading}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 font-semibold flex items-start gap-2.5">
                  <svg className="h-5 w-5 text-red-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    Are you sure you want to cancel this booking? This action cannot be undone and you will lose your current queue position.
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3.5 text-xs font-semibold text-slate-700 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ticket ID:</span>
                    <span className="text-slate-900 font-mono">
                      {ticketToCancel.ticketNumber.split('-')[2]?.substring(0, 6) || ticketToCancel.id.substring(0, 6)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Facility:</span>
                    <span className="text-slate-900 truncate max-w-[180px]">{getTicketMetadata(ticketToCancel.id).hospitalName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Division:</span>
                    <span className="text-slate-900">{getTicketMetadata(ticketToCancel.id).departmentName}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCancelSubmit} className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTicketToCancel(null)}
                  className="btn-secondary flex-1 py-2 text-xs font-bold cursor-pointer"
                  disabled={cancelLoading}
                >
                  Keep Ticket
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold gap-1.5 cursor-pointer flex items-center justify-center rounded-md border border-transparent bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={cancelLoading}
                >
                  {cancelLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Cancelling...
                    </>
                  ) : (
                    'Cancel Booking'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PatientFooter />
    </div>
  );
};

export default PatientDashboard;
