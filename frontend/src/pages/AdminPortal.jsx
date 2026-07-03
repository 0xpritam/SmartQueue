import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/auth';

const AdminPortal = () => {
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();
  const { socket, connectionStatus } = useSocket();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'departments' | 'staff' | 'patients' | 'statistics'

  // Common UI State
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // Dashboard Stats
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalStaff: 0,
    totalDepartments: 0,
    activeQueues: 0,
    waitingTickets: 0,
    servingTickets: 0,
    completedToday: 0,
    cancelledToday: 0,
    averageWaitTime: 0
  });

  // Department State
  const [departments, setDepartments] = useState([]);
  const [deptSearch, setDeptSearch] = useState('');
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null); // null for 'add'
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });
  const [isDisableConfirmOpen, setIsDisableConfirmOpen] = useState(false);
  const [deptToDisable, setDeptToDisable] = useState(null);

  // Staff State
  const [staff, setStaff] = useState([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null); // null for 'add'
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    age: '',
    departmentId: '',
    status: 'active'
  });

  // Patient State
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, limit: 10 });
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState({
    activeTickets: [],
    completedVisits: [],
    cancelledAppointments: []
  });

  // Analytics State
  const [analytics, setAnalytics] = useState({
    appointmentsToday: 0,
    appointmentsThisWeek: 0,
    appointmentsThisMonth: 0,
    mostActiveDepartment: 'N/A',
    averageWaitingTime: 0,
    averageServiceTime: 0,
    peakHours: [],
    departmentDistribution: []
  });

  // ==========================================
  // API Calls
  // ==========================================

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Fetch dashboard stats error:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard statistics.');
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/admin/departments');
      if (res.data.success) {
        setDepartments(res.data.departments);
      }
    } catch (err) {
      console.error('Fetch departments error:', err);
      setError(err.response?.data?.message || 'Failed to load departments.');
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await api.get('/admin/staff');
      if (res.data.success) {
        setStaff(res.data.staff);
      }
    } catch (err) {
      console.error('Fetch staff error:', err);
      setError(err.response?.data?.message || 'Failed to load staff accounts.');
    }
  };

  const fetchPatients = async (page = 1, search = '') => {
    try {
      const res = await api.get(`/admin/patients?page=${page}&limit=10&search=${search}`);
      if (res.data.success) {
        setPatients(res.data.patients);
        setPagination({
          currentPage: res.data.pagination.currentPage,
          totalPages: res.data.pagination.totalPages,
          limit: res.data.pagination.limit
        });
      }
    } catch (err) {
      console.error('Fetch patients error:', err);
      setError(err.response?.data?.message || 'Failed to load patients.');
    }
  };

  const fetchSystemStatistics = async () => {
    try {
      const res = await api.get('/admin/statistics');
      if (res.data.success) {
        setAnalytics(res.data.data);
      }
    } catch (err) {
      console.error('Fetch system stats error:', err);
      setError(err.response?.data?.message || 'Failed to load system statistics.');
    }
  };

  // Run on tab change or mount
  useEffect(() => {
    setError(null);
    setSuccess(null);
    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    } else if (activeTab === 'departments') {
      fetchDepartments();
    } else if (activeTab === 'staff') {
      fetchStaff();
      fetchDepartments(); // Need departments for dropdown assignment
    } else if (activeTab === 'patients') {
      fetchPatients(1, patientSearch);
    } else if (activeTab === 'statistics') {
      fetchSystemStatistics();
    }
  }, [activeTab]);

  // WebSocket Live Updates
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      if (activeTab === 'dashboard') fetchDashboardStats();
      if (activeTab === 'departments') fetchDepartments();
      if (activeTab === 'staff') fetchStaff();
      if (activeTab === 'statistics') fetchSystemStatistics();
    };

    socket.on('queue_updated', handleUpdate);
    socket.on('ticket_updated', handleUpdate);
    socket.on('analytics_updated', handleUpdate);
    socket.on('department_created', handleUpdate);
    socket.on('department_updated', handleUpdate);
    socket.on('department_disabled', handleUpdate);
    socket.on('staff_created', handleUpdate);
    socket.on('staff_updated', handleUpdate);

    return () => {
      socket.off('queue_updated', handleUpdate);
      socket.off('ticket_updated', handleUpdate);
      socket.off('analytics_updated', handleUpdate);
      socket.off('department_created', handleUpdate);
      socket.off('department_updated', handleUpdate);
      socket.off('department_disabled', handleUpdate);
      socket.off('staff_created', handleUpdate);
      socket.off('staff_updated', handleUpdate);
    };
  }, [socket, activeTab]);

  // ==========================================
  // Department Management
  // ==========================================
  const handleOpenDeptModal = (dept = null) => {
    setError(null);
    setSuccess(null);
    setEditingDept(dept);
    if (dept) {
      setDeptForm({ name: dept.name, description: dept.description || '' });
    } else {
      setDeptForm({ name: '', description: '' });
    }
    setIsDeptModalOpen(true);
  };

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let res;
      if (editingDept) {
        res = await api.put(`/admin/departments/${editingDept.id}`, deptForm);
      } else {
        res = await api.post('/admin/departments', deptForm);
      }

      if (res.data.success) {
        setSuccess(res.data.message);
        fetchDepartments();
        setIsDeptModalOpen(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save department.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDisableDept = (dept) => {
    setError(null);
    setSuccess(null);
    setDeptToDisable(dept);
    setIsDisableConfirmOpen(true);
  };

  const handleDisableDept = async () => {
    setError(null);
    setIsDisableConfirmOpen(false);
    setLoading(true);

    try {
      const res = await api.delete(`/admin/departments/${deptToDisable.id}`);
      if (res.data.success) {
        setSuccess('Department deactivated successfully.');
        fetchDepartments();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate department.');
    } finally {
      setLoading(false);
      setDeptToDisable(null);
    }
  };

  // ==========================================
  // Staff Management
  // ==========================================
  const handleOpenStaffModal = (member = null) => {
    setError(null);
    setSuccess(null);
    setEditingStaff(member);
    if (member) {
      setStaffForm({
        name: member.name,
        email: member.email,
        password: '', // Blank by default
        phone: member.phone || '',
        age: member.age || '',
        departmentId: member.departmentId || '',
        status: member.status
      });
    } else {
      setStaffForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        age: '',
        departmentId: '',
        status: 'active'
      });
    }
    setIsStaffModalOpen(true);
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let res;
      const payload = { ...staffForm };
      if (!payload.password) delete payload.password; // Do not send blank password

      if (editingStaff) {
        res = await api.put(`/admin/staff/${editingStaff.id}`, payload);
      } else {
        res = await api.post('/admin/staff', payload);
      }

      if (res.data.success) {
        setSuccess(res.data.message);
        fetchStaff();
        setIsStaffModalOpen(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save staff account.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStaffStatus = async (member) => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const newStatus = member.status === 'active' ? 'inactive' : 'active';
      const res = await api.put(`/admin/staff/${member.id}`, { status: newStatus });
      if (res.data.success) {
        setSuccess(`Staff account status updated to ${newStatus}.`);
        fetchStaff();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update staff status.');
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDeleteStaff = async (member) => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await api.delete(`/admin/staff/${member.id}`);
      if (res.data.success) {
        setSuccess('Staff account deactivated successfully.');
        fetchStaff();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate staff account.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Patient Management
  // ==========================================
  const handleOpenPatientDetails = async (patient) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.get(`/admin/patients/${patient.id}`);
      if (res.data.success) {
        setSelectedPatient(res.data.patient);
        setPatientHistory(res.data.history);
        setIsPatientModalOpen(true);
      }
    } catch (err) {
      console.error('Fetch patient details error:', err);
      setError(err.response?.data?.message || 'Failed to load patient history.');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSearchSubmit = (e) => {
    e.preventDefault();
    fetchPatients(1, patientSearch);
  };

  // ==========================================
  // Render Helpers
  // ==========================================

  const renderActiveQueuesList = () => {
    // If no active queues are shown
    return (
      <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Real-Time Operational Queues</h3>
        {stats.activeQueues === 0 ? (
          <p className="text-xs text-slate-400">All queues are currently idle. No active tickets.</p>
        ) : (
          <div className="flex items-center gap-4">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs text-slate-300">
              There are currently <strong className="text-blue-400 font-extrabold">{stats.activeQueues}</strong> departments active. Waiting: {stats.waitingTickets}, Serving: {stats.servingTickets}.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Banner Navigation */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center border border-blue-500 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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
              <span>{connectionStatus}</span>
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

      {/* Main Admin Console Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full flex flex-col md:flex-row gap-8">
        
        {/* Left Side Tab Navigation */}
        <aside className="w-full md:w-64 shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-3 cursor-pointer shrink-0 ${
              activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15 border border-blue-500' : 'bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
            <span>Overview</span>
          </button>
          
          <button
            onClick={() => setActiveTab('departments')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-3 cursor-pointer shrink-0 ${
              activeTab === 'departments' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15 border border-blue-500' : 'bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Departments</span>
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-3 cursor-pointer shrink-0 ${
              activeTab === 'staff' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15 border border-blue-500' : 'bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Staff Portal</span>
          </button>

          <button
            onClick={() => setActiveTab('patients')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-3 cursor-pointer shrink-0 ${
              activeTab === 'patients' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15 border border-blue-500' : 'bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Patients</span>
          </button>

          <button
            onClick={() => setActiveTab('statistics')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-3 cursor-pointer shrink-0 ${
              activeTab === 'statistics' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15 border border-blue-500' : 'bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
            <span>Statistics</span>
          </button>
        </aside>

        {/* Right Side Content Pane */}
        <section className="flex-grow flex flex-col gap-6">
          
          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl flex gap-3 text-xs text-red-300 animate-fadeIn">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="font-semibold leading-normal">{error}</div>
            </div>
          )}

          {/* Success Banner */}
          {success && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-xl flex gap-3 text-xs text-emerald-300 animate-fadeIn">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="font-semibold leading-normal">{success}</div>
            </div>
          )}

          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl shadow-md">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Patients</span>
                  <span className="text-2xl font-black text-white mt-2 block">{stats.totalPatients}</span>
                </div>
                <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl shadow-md">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Staff Members</span>
                  <span className="text-2xl font-black text-white mt-2 block">{stats.totalStaff}</span>
                </div>
                <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl shadow-md">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Departments</span>
                  <span className="text-2xl font-black text-white mt-2 block">{stats.totalDepartments}</span>
                </div>
                <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl shadow-md">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Average Wait</span>
                  <span className="text-2xl font-black text-white mt-2 block">{stats.averageWaitTime} <span className="text-xs text-slate-400 font-medium">min</span></span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl shadow-md text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Waiting Tickets</span>
                  <span className="text-3xl font-black text-amber-500 mt-2 block">{stats.waitingTickets}</span>
                </div>
                <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl shadow-md text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Serving Now</span>
                  <span className="text-3xl font-black text-blue-500 mt-2 block">{stats.servingTickets}</span>
                </div>
                <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl shadow-md text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Completed Today</span>
                  <span className="text-3xl font-black text-emerald-500 mt-2 block">{stats.completedToday}</span>
                </div>
              </div>

              {renderActiveQueuesList()}
            </div>
          )}

          {/* TAB 2: DEPARTMENT MANAGEMENT */}
          {activeTab === 'departments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={deptSearch}
                  onChange={(e) => setDeptSearch(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500 w-full max-w-xs"
                />
                <button
                  onClick={() => handleOpenDeptModal()}
                  className="bg-blue-600 hover:bg-blue-700 border border-blue-500 px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
                >
                  Add Department
                </button>
              </div>

              <div className="bg-slate-850 border border-slate-850 rounded-2xl overflow-hidden shadow-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Department Name</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments
                      .filter((d) => d.name.toLowerCase().includes(deptSearch.toLowerCase()))
                      .map((d) => (
                        <tr key={d.id} className="border-b border-slate-800/80 hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-white">{d.name}</td>
                          <td className="px-6 py-4 text-slate-300">{d.description || '—'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              d.status === 'active' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900' : 'bg-slate-900 text-slate-400 border border-slate-800'
                            }`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenDeptModal(d)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer font-bold"
                            >
                              Edit
                            </button>
                            {d.status === 'active' && (
                              <button
                                onClick={() => handleConfirmDisableDept(d)}
                                className="px-2.5 py-1 rounded bg-red-950 hover:bg-red-900 text-red-300 hover:text-white border border-red-900 cursor-pointer font-bold"
                              >
                                Disable
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: STAFF MANAGEMENT */}
          {activeTab === 'staff' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <input
                  type="text"
                  placeholder="Search staff members..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500 w-full max-w-xs"
                />
                <button
                  onClick={() => handleOpenStaffModal()}
                  className="bg-blue-600 hover:bg-blue-700 border border-blue-500 px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
                >
                  Add Staff Account
                </button>
              </div>

              <div className="bg-slate-850 border border-slate-850 rounded-2xl overflow-hidden shadow-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Email / Phone</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff
                      .filter((s) => s.name.toLowerCase().includes(staffSearch.toLowerCase()) || s.email.toLowerCase().includes(staffSearch.toLowerCase()))
                      .map((s) => (
                        <tr key={s.id} className="border-b border-slate-800/80 hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{s.name}</div>
                            <div className="text-[10px] text-slate-400">Age: {s.age || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-slate-200">{s.email}</div>
                            <div className="text-[10px] text-slate-400">{s.phone || '—'}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-300 font-bold">
                            {s.department ? s.department.name : <span className="text-slate-500">Unassigned</span>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              s.status === 'active' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900' : 'bg-red-950/60 text-red-400 border border-red-900'
                            }`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenStaffModal(s)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer font-bold"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleStaffStatus(s)}
                              className={`px-2.5 py-1 rounded border cursor-pointer font-bold ${
                                s.status === 'active' ? 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-750' : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-900'
                              }`}
                            >
                              {s.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleSoftDeleteStaff(s)}
                              className="px-2.5 py-1 rounded bg-red-950 hover:bg-red-900 text-red-300 hover:text-white border border-red-900 cursor-pointer font-bold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PATIENT MANAGEMENT */}
          {activeTab === 'patients' && (
            <div className="space-y-6">
              <form onSubmit={handlePatientSearchSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search patients by name, email, phone..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500 w-full max-w-sm"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 border border-blue-500 px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
                >
                  Search
                </button>
              </form>

              <div className="bg-slate-850 border border-slate-850 rounded-2xl overflow-hidden shadow-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Phone</th>
                      <th className="px-6 py-4">Age</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((p) => (
                      <tr key={p.id} className="border-b border-slate-800/80 hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">{p.name}</td>
                        <td className="px-6 py-4 text-slate-300">{p.email}</td>
                        <td className="px-6 py-4 text-slate-300">{p.phone || '—'}</td>
                        <td className="px-6 py-4 text-slate-300">{p.age || '—'}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleOpenPatientDetails(p)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer font-bold"
                          >
                            View History
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between py-2 border-t border-slate-800 text-slate-400 text-xs">
                  <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
                  <div className="flex gap-2">
                    <button
                      disabled={pagination.currentPage === 1}
                      onClick={() => fetchPatients(pagination.currentPage - 1, patientSearch)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      disabled={pagination.currentPage === pagination.totalPages}
                      onClick={() => fetchPatients(pagination.currentPage + 1, patientSearch)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SYSTEM STATISTICS / ANALYTICS */}
          {activeTab === 'statistics' && (
            <div className="space-y-6">
              {/* Aggregate Statistics Block */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl shadow-md">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Today's Visits</span>
                  <span className="text-3xl font-black text-white mt-2 block">{analytics.appointmentsToday}</span>
                </div>
                <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl shadow-md">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Weekly Visits</span>
                  <span className="text-3xl font-black text-white mt-2 block">{analytics.appointmentsThisWeek}</span>
                </div>
                <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl shadow-md">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Monthly Visits</span>
                  <span className="text-3xl font-black text-white mt-2 block">{analytics.appointmentsThisMonth}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl shadow-md">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Most Active Department</span>
                  <span className="text-lg font-black text-blue-400 mt-2 block truncate">{analytics.mostActiveDepartment}</span>
                </div>
                <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl shadow-md">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Avg Waiting Time</span>
                  <span className="text-2xl font-black text-white mt-2 block">{analytics.averageWaitingTime} <span className="text-xs text-slate-400 font-medium">min</span></span>
                </div>
                <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl shadow-md">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Avg Service Time</span>
                  <span className="text-2xl font-black text-white mt-2 block">{analytics.averageServiceTime} <span className="text-xs text-slate-400 font-medium">min</span></span>
                </div>
              </div>

              {/* Department Distribution (Percentage bar lists) */}
              <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Department Distribution</h3>
                <div className="space-y-4">
                  {analytics.departmentDistribution.length === 0 ? (
                    <p className="text-xs text-slate-450">No department statistics logged yet.</p>
                  ) : (
                    analytics.departmentDistribution.map((item) => {
                      const total = analytics.departmentDistribution.reduce((acc, curr) => acc + curr.count, 0);
                      const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
                      return (
                        <div key={item.departmentName} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-200">{item.departmentName}</span>
                            <span className="text-slate-400">{item.count} tickets ({percentage}%)</span>
                          </div>
                          <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* DEPARTMENT MODAL */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6">
            <h3 className="text-md font-bold text-white">{editingDept ? 'Edit Department' : 'Add Department'}</h3>
            <form onSubmit={handleDeptSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="Cardiology"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  placeholder="Cardiovascular diagnosis and surgery..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 rounded-xl text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-55 cursor-pointer"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEPARTMENT DEACTIVATION CONFIRMATION MODAL */}
      {isDisableConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h3 className="text-md font-bold text-white">Confirm Deactivation</h3>
            <p className="text-xs text-slate-350 leading-relaxed">
              Are you sure you want to deactivate the department <strong>{deptToDisable?.name}</strong>?
              This will mark it as inactive. Connected dashboard panels and kiosks will reflect this immediately.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDisableConfirmOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 rounded-xl text-xs font-bold text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDisableDept}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-750 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Deactivating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAFF MODAL */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6">
            <h3 className="text-md font-bold text-white">{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  placeholder="Dr. Amanda Ross"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    placeholder="amanda@hospital.org"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {editingStaff ? 'New Password (Optional)' : 'Password'}
                  </label>
                  <input
                    type="password"
                    required={!editingStaff}
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone (10 digits)</label>
                  <input
                    type="text"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Age</label>
                  <input
                    type="number"
                    value={staffForm.age}
                    onChange={(e) => setStaffForm({ ...staffForm, age: e.target.value })}
                    placeholder="35"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department</label>
                <select
                  value={staffForm.departmentId}
                  onChange={(e) => setStaffForm({ ...staffForm, departmentId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Unassigned</option>
                  {departments
                    .filter((d) => d.status === 'active' || d.id === staffForm.departmentId)
                    .map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 rounded-xl text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-55 cursor-pointer"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PATIENT DETAILS MODAL */}
      {isPatientModalOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-md font-bold text-white">Patient Record: {selectedPatient.name}</h3>
                <p className="text-[10px] text-slate-450 font-bold uppercase mt-1">
                  Email: {selectedPatient.email} | Phone: {selectedPatient.phone || 'N/A'} | Age: {selectedPatient.age || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setIsPatientModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs border border-slate-850 px-2 py-1 rounded cursor-pointer font-bold"
              >
                Close
              </button>
            </div>

            {/* Active Tickets List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Active Slots / Tickets</h4>
              {patientHistory.activeTickets.length === 0 ? (
                <p className="text-[11px] text-slate-400">No active tickets registered.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {patientHistory.activeTickets.map((t) => (
                    <div key={t.id} className="p-3 bg-slate-850 border border-slate-750 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <div className="font-black text-white">{t.ticketNumber}</div>
                        <div className="text-[10px] text-slate-400">Dept: {t.department?.name || 'Unassigned'}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-950 text-amber-400 border border-amber-900">
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Completed Visits List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Completed Visits History</h4>
              {patientHistory.completedVisits.length === 0 ? (
                <p className="text-[11px] text-slate-400">No completed visits logged.</p>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-2 pr-2">
                  {patientHistory.completedVisits.map((t) => (
                    <div key={t.id} className="p-3 bg-slate-850/50 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-slate-200">{t.ticketNumber}</div>
                        <div className="text-[10px] text-slate-450">Dept: {t.department?.name || 'Unassigned'}</div>
                      </div>
                      <div className="text-right text-[10px] text-slate-450">
                        {new Date(t.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cancelled appointments */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">Cancelled / Aborted History</h4>
              {patientHistory.cancelledAppointments.length === 0 ? (
                <p className="text-[11px] text-slate-400">No cancelled appointments logged.</p>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-2 pr-2">
                  {patientHistory.cancelledAppointments.map((t) => (
                    <div key={t.id} className="p-3 bg-slate-850/50 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-slate-350">{t.ticketNumber}</div>
                        <div className="text-[10px] text-slate-500">Dept: {t.department?.name || 'Unassigned'}</div>
                      </div>
                      <div className="text-right text-[10px] text-slate-500">
                        {new Date(t.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
