import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getDashboardAnalytics } from '../api/analytics';
import api from '../api/auth';

const AnalyticsPage = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { socket, connectionStatus } = useSocket();

  // State
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // 1. Verify role-based access control and fetch metrics
  const fetchAnalytics = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await getDashboardAnalytics();
      if (res && res.success) {
        setData(res.data);
        setError(null);
      } else {
        setError('Failed to load dashboard metrics.');
      }
    } catch (err) {
      console.error('Failed to load analytics dashboard:', err);
      setError('Failed to fetch analytics. Please make sure you are logged in as operations staff.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    const initPage = async () => {
      try {
        setLoading(true);
        // Verify role with backend profile check
        const profileRes = await api.get('/users/profile');
        if (!profileRes.data || !profileRes.data.success || (profileRes.data.user.role !== 'admin' && profileRes.data.user.role !== 'staff')) {
          // Non-admin users redirected
          navigate('/patient-dashboard');
          return;
        }

        setAuthorized(true);
        await fetchAnalytics(true);
      } catch (err) {
        console.error('Auth check failed:', err);
        setError('Access denied. Admin role required.');
        if (err.response?.status === 403 || err.response?.status === 401) {
          setTimeout(() => navigate('/patient-dashboard'), 2000);
        }
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [navigate]);

  // Socket queue update subscription
  useEffect(() => {
    if (!socket || !authorized) return;

    const handleUpdate = () => {
      console.log('[SOCKET] Refreshing analytics dashboard data');
      fetchAnalytics(true);
    };

    const handleDirectPayload = (payload) => {
      console.log('[SOCKET] Direct analytics payload received:', payload);
      if (payload && payload.success && payload.data) {
        setData(payload.data);
        setError(null);
      }
    };

    socket.on('queue_updated', handleUpdate);
    socket.on('ticket_updated', handleUpdate);
    socket.on('analytics_updated', handleDirectPayload);

    return () => {
      socket.off('queue_updated', handleUpdate);
      socket.off('ticket_updated', handleUpdate);
      socket.off('analytics_updated', handleDirectPayload);
    };
  }, [socket, authorized]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-10 w-10 animate-spin text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <span className="text-slate-600 font-medium">Loading Operational Analytics...</span>
        </div>
      </div>
    );
  }

  if (error && !authorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="max-w-md w-full mx-4 p-6 bg-white rounded-xl shadow-lg border border-slate-100 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto text-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
          <p className="text-sm text-slate-500">{error}</p>
          <p className="text-xs text-slate-400">Redirecting you to the patient portal...</p>
        </div>
      </div>
    );
  }

  // Fallback to empty data state if calculations yield nothing
  const isEmptyState = !data || (
    data.totalTicketsToday === 0 &&
    data.waiting === 0 &&
    data.inProgress === 0 &&
    data.completed === 0 &&
    data.cancelled === 0 &&
    (!data.departments || data.departments.length === 0)
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-blue-600 flex items-center justify-center border border-blue-500 shadow">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight block leading-tight">Queue Analytics Dashboard</h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Real-Time Operational Monitoring</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-[9px] font-bold uppercase tracking-wider border border-slate-700 text-slate-300">
              <span className={`h-1.5 w-1.5 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
                connectionStatus === 'reconnecting' ? 'bg-amber-500 animate-ping' :
                'bg-slate-450'
              }`} />
              <span>
                {connectionStatus === 'connected' ? 'Live connected' :
                 connectionStatus === 'reconnecting' ? 'Reconnecting' :
                 'Offline (Polling)'}
              </span>
            </div>
            <button 
              onClick={() => navigate('/staff-operations')}
              className="bg-teal-600 hover:bg-teal-700 border border-teal-500 text-white text-xs font-bold py-1.5 px-3 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 shadow"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Staff Operations</span>
            </button>

            <button 
              onClick={() => navigate('/dashboard')}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold py-1.5 px-3 rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full space-y-8">
        
        {/* Error Alert Box */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex gap-3 text-xs text-red-700 font-semibold animate-fadeIn">
            <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>{error}</div>
          </div>
        )}

        {isEmptyState ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-md mx-auto shadow-sm space-y-4 animate-fadeIn">
            <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto border border-blue-100 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800">No Operations Data Today</h2>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              There are no active tickets or department metrics compiled for today yet. Use the staff dashboard to book tickets and call patients to see metrics populate in real-time.
            </p>
          </div>
        ) : (
          <>
            {/* Dashboard Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
              
              {/* Total Tickets Today */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl p-5 shadow-md border border-blue-500/20 relative overflow-hidden transition-all hover:scale-[1.02] duration-200">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-blue-100 uppercase tracking-wider block">Total Today</span>
                    <span className="text-2xl font-black block leading-none">{data.totalTicketsToday}</span>
                  </div>
                  <div className="p-2 bg-white/10 rounded-lg text-white shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                </div>
                <div className="text-[9px] text-blue-200/90 font-bold mt-5 tracking-wide">Tickets generated today</div>
              </div>

              {/* Waiting */}
              <div className="bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-xl p-5 shadow-md border border-sky-400/20 relative overflow-hidden transition-all hover:scale-[1.02] duration-200">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-sky-100 uppercase tracking-wider block">Waiting</span>
                    <span className="text-2xl font-black block leading-none">{data.waiting}</span>
                  </div>
                  <div className="p-2 bg-white/10 rounded-lg text-white shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-[9px] text-sky-200/90 font-bold mt-5 tracking-wide">Patients in queue</div>
              </div>

              {/* In Progress */}
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl p-5 shadow-md border border-amber-400/20 relative overflow-hidden transition-all hover:scale-[1.02] duration-200">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-amber-100 uppercase tracking-wider block">In Progress</span>
                    <span className="text-2xl font-black block leading-none">{data.inProgress}</span>
                  </div>
                  <div className="p-2 bg-white/10 rounded-lg text-white shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-[9px] text-amber-200/90 font-bold mt-5 tracking-wide">Currently being served</div>
              </div>

              {/* Completed */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl p-5 shadow-md border border-emerald-400/20 relative overflow-hidden transition-all hover:scale-[1.02] duration-200">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider block">Completed</span>
                    <span className="text-2xl font-black block leading-none">{data.completed}</span>
                  </div>
                  <div className="p-2 bg-white/10 rounded-lg text-white shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-[9px] text-emerald-200/90 font-bold mt-5 tracking-wide">Consultations finished</div>
              </div>

              {/* Cancelled */}
              <div className="bg-gradient-to-br from-rose-500 to-red-600 text-white rounded-xl p-5 shadow-md border border-rose-400/20 relative overflow-hidden transition-all hover:scale-[1.02] duration-200">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-rose-100 uppercase tracking-wider block">Cancelled</span>
                    <span className="text-2xl font-black block leading-none">{data.cancelled}</span>
                  </div>
                  <div className="p-2 bg-white/10 rounded-lg text-white shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-[9px] text-rose-200/90 font-bold mt-5 tracking-wide">Tickets cancelled today</div>
              </div>

              {/* Average Waiting Time */}
              <div className="bg-gradient-to-br from-purple-600 to-indigo-800 text-white rounded-xl p-5 shadow-md border border-purple-500/20 relative overflow-hidden transition-all hover:scale-[1.02] duration-200">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-purple-100 uppercase tracking-wider block">Avg Wait Time</span>
                    <span className="text-2xl font-black block leading-none">
                      {data.averageWaitingTime} <span className="text-xs font-semibold">mins</span>
                    </span>
                  </div>
                  <div className="p-2 bg-white/10 rounded-lg text-white shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div className="text-[9px] text-purple-200/90 font-bold mt-5 tracking-wide">Average wait in queue today</div>
              </div>

            </div>

            {/* Department Summary Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fadeIn">
              <div className="bg-white border-b border-slate-200 px-6 py-4">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Department Traffic & Operations</h2>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Live statistics and throughput metrics by clinical unit</span>
              </div>
              
              {(!data.departments || data.departments.length === 0) ? (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                  No department statistics registered for today.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-6">Department ID</th>
                        <th className="py-3.5 px-6">Department Name</th>
                        <th className="py-3.5 px-6">Patients Waiting</th>
                        <th className="py-3.5 px-6">Completed Today</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {data.departments.map((dept) => (
                        <tr key={dept.departmentId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6 text-slate-455 font-mono text-[10.5px] select-all">{dept.departmentId}</td>
                          <td className="py-4 px-6 font-bold text-slate-800">{dept.departmentName}</td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                              dept.waiting > 0 
                                ? 'bg-blue-50 border border-blue-200 text-blue-700' 
                                : 'bg-slate-100 border border-slate-200 text-slate-400'
                            }`}>
                              {dept.waiting} waiting
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                              dept.completedToday > 0 
                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
                                : 'bg-slate-100 border border-slate-200 text-slate-400'
                            }`}>
                              {dept.completedToday} completed
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-slate-100 border-t border-slate-200 py-4 text-center text-[10px] text-slate-400 uppercase tracking-wider mt-auto">
        Operations Control Room © 2026 SmartQueue System. All database systems connected.
      </footer>
    </div>
  );
};

export default AnalyticsPage;
