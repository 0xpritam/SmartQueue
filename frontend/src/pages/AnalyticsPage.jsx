import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOverviewMetrics, getDepartmentAnalytics, getTrendAnalytics } from '../api/analytics';
import api from '../api/auth';

const AnalyticsPage = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [overview, setOverview] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [trends, setTrends] = useState([]);

  // Hover states for tooltips
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState(null);
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [hoveredDeptIdx, setHoveredDeptIdx] = useState(null);

  // 1. Verify role-based access control and fetch metrics
  useEffect(() => {
    const initPage = async () => {
      try {
        setLoading(true);
        // Verify role with backend profile check
        const profileRes = await api.get('/users/profile');
        if (!profileRes.data || !profileRes.data.success || profileRes.data.user.role !== 'admin') {
          // Non-admin users redirected
          navigate('/patient-dashboard');
          return;
        }

        setAuthorized(true);

        // Fetch analytics data
        const [overviewRes, deptsRes, trendsRes] = await Promise.all([
          getOverviewMetrics(),
          getDepartmentAnalytics(),
          getTrendAnalytics(),
        ]);

        if (overviewRes.success) setOverview(overviewRes.data);
        if (deptsRes.success) setDepartments(deptsRes.data);
        if (trendsRes.success) setTrends(trendsRes.data);

        setError(null);
      } catch (err) {
        console.error('Failed to load analytics dashboard:', err);
        setError('Failed to fetch analytics. Please make sure you are logged in as operations staff.');
        // If 403 or 401, redirect after a short timeout
        if (err.response?.status === 403 || err.response?.status === 401) {
          setTimeout(() => navigate('/patient-dashboard'), 2000);
        }
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-10 w-10 animate-spin text-blue-600" xmlns="http://www.w3.org/2500/svg" fill="none" viewBox="0 0 24 24">
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

  // Define SVG Chart variables
  const renderLineChart = () => {
    if (trends.length === 0) return null;

    const width = 500;
    const height = 220;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;

    // Find max value to scale Y axis
    const maxVal = Math.max(...trends.map(t => Math.max(t.registered, t.completed)), 6);

    // Compute coordinates
    const regPoints = trends.map((t, idx) => {
      const x = paddingLeft + (idx * graphWidth) / (trends.length - 1);
      const y = height - paddingBottom - (t.registered / maxVal) * graphHeight;
      return { x, y, value: t.registered, date: t.date };
    });

    const compPoints = trends.map((t, idx) => {
      const x = paddingLeft + (idx * graphWidth) / (trends.length - 1);
      const y = height - paddingBottom - (t.completed / maxVal) * graphHeight;
      return { x, y, value: t.completed, date: t.date };
    });

    const regLineD = regPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const compLineD = compPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const regAreaD = `${regLineD} L ${regPoints[regPoints.length - 1].x} ${height - paddingBottom} L ${regPoints[0].x} ${height - paddingBottom} Z`;
    const compAreaD = `${compLineD} L ${compPoints[compPoints.length - 1].x} ${height - paddingBottom} L ${compPoints[0].x} ${height - paddingBottom} Z`;

    return (
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Y Axis Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = height - paddingBottom - ratio * graphHeight;
            const gridVal = Math.round(ratio * maxVal);
            return (
              <g key={idx} className="opacity-40">
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth={1} />
                <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-medium">{gridVal}</text>
              </g>
            );
          })}

          {/* X Axis Labels */}
          {trends.map((t, idx) => {
            const x = paddingLeft + (idx * graphWidth) / (trends.length - 1);
            return (
              <text key={idx} x={x} y={height - 15} textAnchor="middle" className="text-[10px] fill-slate-400 font-medium">
                {t.date}
              </text>
            );
          })}

          {/* Shaded Areas */}
          <path d={regAreaD} fill="url(#regGrad)" opacity="0.06" />
          <path d={compAreaD} fill="url(#compGrad)" opacity="0.06" />

          {/* Lines */}
          <path d={regLineD} fill="transparent" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          <path d={compLineD} fill="transparent" stroke="#10b981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

          {/* Interactive hover overlays */}
          {trends.map((t, idx) => {
            const x = paddingLeft + (idx * graphWidth) / (trends.length - 1);
            return (
              <g key={idx} onMouseEnter={() => setHoveredTrendIdx(idx)} onMouseLeave={() => setHoveredTrendIdx(null)}>
                {/* Transparent bar for easy hovering */}
                <rect x={x - 15} y={paddingTop} width={30} height={graphHeight} fill="transparent" className="cursor-pointer" />
                {hoveredTrendIdx === idx && (
                  <>
                    <line x1={x} y1={paddingTop} x2={x} y2={height - paddingBottom} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="2 2" />
                    <circle cx={regPoints[idx].x} cy={regPoints[idx].y} r={5} fill="#3b82f6" stroke="#ffffff" strokeWidth={1.5} className="shadow" />
                    <circle cx={compPoints[idx].x} cy={compPoints[idx].y} r={5} fill="#10b981" stroke="#ffffff" strokeWidth={1.5} className="shadow" />
                  </>
                )}
              </g>
            );
          })}

          {/* Definitions for Gradients */}
          <defs>
            <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredTrendIdx !== null && (
          <div 
            className="absolute bg-slate-950 text-white text-xs rounded-lg p-2.5 shadow-xl border border-slate-800 z-10 pointer-events-none animate-fadeIn"
            style={{
              left: `${(hoveredTrendIdx * graphWidth) / (trends.length - 1) + paddingLeft + 15}px`,
              top: '20px'
            }}
          >
            <div className="font-bold text-slate-300 border-b border-slate-800 pb-1 mb-1.5">{trends[hoveredTrendIdx].date}</div>
            <div className="flex items-center gap-2 text-blue-400">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Registered: <strong>{trends[hoveredTrendIdx].registered}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 mt-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Completed: <strong>{trends[hoveredTrendIdx].completed}</strong></span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDonutChart = () => {
    if (!overview || !overview.statusDistribution) return null;

    const { waiting, serving, completed, cancelled } = overview.statusDistribution;
    const total = waiting + serving + completed + cancelled;

    const radius = 50;
    const circumference = 2 * Math.PI * radius; // ~314.16

    let accumulatedPercent = 0;
    const slices = [
      { key: 'waiting', name: 'Waiting', value: waiting, color: '#3b82f6', hoverColor: '#2563eb' },
      { key: 'serving', name: 'Serving', value: serving, color: '#eab308', hoverColor: '#ca8a04' },
      { key: 'completed', name: 'Completed', value: completed, color: '#10b981', hoverColor: '#059669' },
      { key: 'cancelled', name: 'Cancelled', value: cancelled, color: '#ef4444', hoverColor: '#dc2626' }
    ].map(slice => {
      const percent = total > 0 ? slice.value / total : 0;
      const strokeDashoffset = circumference - percent * circumference;
      const strokeDasharray = `${circumference} ${circumference}`;
      const rotation = accumulatedPercent * 360;
      accumulatedPercent += percent;
      return {
        ...slice,
        percent,
        strokeDasharray,
        strokeDashoffset,
        rotation
      };
    });

    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-2">
        <div className="relative h-40 w-40">
          <svg viewBox="0 0 160 160" className="w-full h-full">
            {slices.map((slice, idx) => {
              if (slice.percent === 0) return null;
              const isHovered = hoveredSlice === slice.key;
              return (
                <circle
                  key={idx}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke={isHovered ? slice.hoverColor : slice.color}
                  strokeWidth={isHovered ? 24 : 18}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  transform={`rotate(${slice.rotation - 90} 80 80)`}
                  onMouseEnter={() => setHoveredSlice(slice.key)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className="transition-all duration-300 cursor-pointer origin-center"
                />
              );
            })}
            {/* Center Text */}
            <g transform="translate(80, 80)" className="pointer-events-none">
              <text textAnchor="middle" y="-2" className="text-[10px] font-bold fill-slate-400 uppercase tracking-wider">Total Tickets</text>
              <text textAnchor="middle" y="14" className="text-xl font-extrabold fill-slate-900 leading-none">{total}</text>
            </g>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-grow space-y-2.5 w-full sm:w-auto">
          {slices.map((slice, idx) => (
            <div 
              key={idx}
              className={`flex items-center justify-between p-2 rounded-lg transition-colors border ${
                hoveredSlice === slice.key ? 'bg-slate-50 border-slate-200' : 'border-transparent'
              }`}
              onMouseEnter={() => setHoveredSlice(slice.key)}
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.color }} />
                <span>{slice.name}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-extrabold text-slate-900 block">{slice.value}</span>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">
                  {Math.round(slice.percent * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBarChart = () => {
    if (departments.length === 0) {
      return <div className="text-center text-xs text-slate-400 py-10 font-medium">No departments registered.</div>;
    }

    const maxServed = Math.max(...departments.map(d => d.patientsServed), 5);

    return (
      <div className="space-y-4 py-2">
        {departments.map((dept, idx) => {
          const barWidthPercent = (dept.patientsServed / maxServed) * 100;
          const isHovered = hoveredDeptIdx === idx;

          return (
            <div 
              key={idx}
              className={`space-y-1.5 p-2.5 rounded-lg border transition-all duration-200 ${
                isHovered ? 'bg-slate-50 border-slate-200' : 'border-transparent'
              }`}
              onMouseEnter={() => setHoveredDeptIdx(idx)}
              onMouseLeave={() => setHoveredDeptIdx(null)}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">{dept.departmentName}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-medium">
                    Served: <strong className="text-slate-900 font-extrabold">{dept.patientsServed}</strong>
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-50 border border-purple-100 text-[9px] font-bold text-purple-700 uppercase tracking-wide">
                    Avg Wait: {dept.avgWaitTime}m
                  </span>
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden w-full relative">
                <div 
                  className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-indigo-500 ${
                    isHovered ? 'brightness-95 shadow-inner' : ''
                  }`}
                  style={{ width: `${Math.max(3, barWidthPercent)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

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
              <h1 className="text-lg font-extrabold tracking-tight block leading-tight">Operational Analytics</h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">SmartQueue Control Room</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
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

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full space-y-8">
        
        {/* Overview Cards Grid */}
        {overview && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Total Patients */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 p-5 text-white shadow-lg border border-blue-400/20">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-blue-100 uppercase tracking-wider block">Total Patients Today</span>
                  <span className="text-3xl font-extrabold block leading-none">{overview.totalPatientsToday}</span>
                </div>
                <div className="p-2.5 bg-white/10 rounded-lg text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-[10px] text-blue-200 mt-4 font-semibold">Total queue tickets generated since 00:00</p>
            </div>

            {/* Active Queues */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-5 text-white shadow-lg border border-amber-400/20">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-amber-100 uppercase tracking-wider block">Active Queues</span>
                  <span className="text-3xl font-extrabold block leading-none">{overview.activeQueues}</span>
                </div>
                <div className="p-2.5 bg-white/10 rounded-lg text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </div>
              </div>
              <p className="text-[10px] text-amber-200 mt-4 font-semibold">Departments actively serving queue tokens</p>
            </div>

            {/* Completed Visits */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-lg border border-emerald-400/20">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider block">Completed Visits Today</span>
                  <span className="text-3xl font-extrabold block leading-none">{overview.completedVisitsToday}</span>
                </div>
                <div className="p-2.5 bg-white/10 rounded-lg text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-[10px] text-emerald-200 mt-4 font-semibold">Consultations successfully processed today</p>
            </div>

            {/* Avg Wait Time */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 p-5 text-white shadow-lg border border-purple-400/20">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-purple-100 uppercase tracking-wider block">Average Wait Time</span>
                  <span className="text-3xl font-extrabold block leading-none">
                    {overview.avgWaitTime} <span className="text-base font-normal">mins</span>
                  </span>
                </div>
                <div className="p-2.5 bg-white/10 rounded-lg text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-[10px] text-purple-200 mt-4 font-semibold">Average wait duration in queue today</p>
            </div>

          </div>
        )}

        {/* Charts Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
          
          {/* Trends Line Chart */}
          <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="mb-4">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Daily Visits & Registration Trends</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Monitoring tickets booked and completed visits over the last 7 days</p>
            </div>
            
            {/* Visual Indicators / Legends */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span className="h-2.5 w-5 rounded bg-blue-500 inline-block" />
                <span>Registered Patients</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span className="h-2.5 w-5 rounded bg-emerald-500 inline-block" />
                <span>Completed Consultations</span>
              </div>
            </div>

            <div className="flex-grow flex items-center justify-center">
              {renderLineChart()}
            </div>
          </div>

          {/* Ticket Status Distribution (Donut Chart) */}
          <div className="lg:col-span-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="mb-4">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Ticket Status Mix</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Breakdown of operational state allocations across all tickets</p>
            </div>

            <div className="flex-grow flex flex-col justify-center">
              {renderDonutChart()}
            </div>
          </div>

        </div>

        {/* Department Analytics Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fadeIn">
          <div className="mb-6">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Department Traffic & Wait Metrics</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Summary of patients served and estimated queue wait times grouped by department</p>
          </div>

          <div>
            {renderBarChart()}
          </div>
        </div>

      </main>
    </div>
  );
};

export default AnalyticsPage;
