// src/pages/Notifications.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import PatientNavbar from '../components/PatientNavbar';
import PatientFooter from '../components/PatientFooter';
import { getRelativeTime } from '../components/NotificationCenter';

const Notifications = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const {
    notifications,
    pagination,
    unreadCount,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    browserPermission,
    requestBrowserPermission,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState('all');

  // Fetch notifications whenever page or activeFilter changes
  useEffect(() => {
    // If not 'all', we fetch page 1 since pagination applies to current query.
    // Wait, the backend GET /api/notifications returns all notifications for the user.
    // We can filter them locally on the page, which works perfectly since the database is pruned to 100!
    // But since the API supports page and limit, we can fetch page 1 first.
    // Let's retrieve notifications from context.
    fetchNotifications(pagination.currentPage, pagination.limit);
  }, []);

  const handlePageChange = (newPage) => {
    fetchNotifications(newPage, pagination.limit);
  };

  const handleMarkAsRead = (e, id) => {
    e.stopPropagation();
    markAsRead(id);
  };

  const handleNotificationClick = (item) => {
    if (!item.isRead) {
      markAsRead(item.id);
    }
    if (item.ticketId) {
      navigate(`/queue-status/${item.ticketId}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Filter items locally (this is extremely robust and fast, and combines well with pagination!)
  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'all') return true;
    return n.type === activeFilter;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'serving':
        return (
          <span className="p-2.5 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
            <svg className="h-5 w-5 animate-pulse" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </span>
        );
      case 'completed':
        return (
          <span className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </span>
        );
      case 'cancelled':
        return (
          <span className="p-2.5 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </span>
        );
      default:
        return (
          <span className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a9.001 9.001 0 0 1-5.714 0M3.181 12.062a1.88 1.88 0 0 1 3.638 0A18.001 18.001 0 0 0 12 21.75c2.676 0 5.216-.584 7.499-1.632M12 3v1.5M12 18.75V21m-9-9H1.5m21 0H21" />
            </svg>
          </span>
        );
    }
  };

  const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'staff';

  const renderContent = () => (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 font-sans">
      {/* Header and Mark All as Read */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Notification Center</h2>
          <p className="text-xs text-slate-500 font-medium">
            Manage your real-time queue slips, clinic status alerts, and updates.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer shadow-sm focus:outline-none flex items-center gap-1.5 self-start sm:self-auto"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Mark all as read
          </button>
        )}
      </div>

      {/* Browser Notification Banner */}
      {browserPermission === 'default' && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-5 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-blue-500">
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-widest text-blue-200">Stay Updated</h4>
            <h3 className="text-sm font-extrabold text-white">Enable Real-Time Browser Alerts</h3>
            <p className="text-xs text-blue-100/90 font-medium">
              Receive sound alerts and desktop notifications when your ticket is ready or position changes.
            </p>
          </div>
          <button
            onClick={requestBrowserPermission}
            className="bg-white hover:bg-blue-50 text-blue-700 font-extrabold text-xs py-2.5 px-5 rounded-xl transition-colors cursor-pointer shadow shrink-0 self-start sm:self-auto"
          >
            Enable Alerts
          </button>
        </div>
      )}

      {/* Filters Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All Alerts' },
            { id: 'queue_update', label: 'Queue Shifts' },
            { id: 'serving', label: 'Serving' },
            { id: 'completed', label: 'Completed' },
            { id: 'appointment', label: 'Appointments' },
            { id: 'system', label: 'System' },
          ].map((tab) => {
            const count = tab.id === 'all'
              ? notifications.length
              : notifications.filter((n) => n.type === tab.id).length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  activeFilter === tab.id
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                    activeFilter === tab.id ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl text-slate-400 font-semibold text-xs leading-relaxed shadow-sm"
            >
              <svg className="h-10 w-10 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a9.001 9.001 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M3.181 12.062a1.88 1.88 0 0 1 3.638 0A18.001 18.001 0 0 0 12 21.75c2.676 0 5.216-.584 7.499-1.632m-15-7.796a5.907 5.907 0 0 1 3.541-4.486m14.19 0a5.907 5.907 0 0 1 3.54 4.486m-14.19-10.187a3 3 0 0 1 5.96 0m-5.96 0A9.753 9.753 0 0 0 9 10.5M12 3a9.753 9.753 0 0 1 3 7.5" />
              </svg>
              No notifications matching the filter found.
            </motion.div>
          ) : (
            filteredNotifications.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
                onClick={() => handleNotificationClick(item)}
                className={`bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-sm transition-all duration-150 flex items-start gap-4 cursor-pointer relative ${
                  !item.isRead ? 'border-l-4 border-l-blue-600 pl-4' : ''
                }`}
              >
                {getIcon(item.type)}
                <div className="flex-grow min-w-0 space-y-1">
                  <div className="flex justify-between items-start gap-2 flex-wrap sm:flex-nowrap">
                    <h3 className="text-xs font-black text-slate-905 truncate">{item.title}</h3>
                    <span className="text-[10px] text-slate-400 font-bold shrink-0">
                      {getRelativeTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 font-medium">
                    {item.message}
                  </p>
                  {item.ticketId && (
                    <div className="pt-2 flex items-center gap-1 text-[10px] font-black text-blue-600 hover:underline">
                      <span>Track Appointment Queue Live</span>
                      <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </div>
                  )}
                </div>
                {!item.isRead && (
                  <button
                    onClick={(e) => handleMarkAsRead(e, item.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-colors shrink-0 focus:outline-none cursor-pointer self-center"
                    title="Mark as read"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </button>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="btn-secondary py-1.5 px-3.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
          >
            &larr; Previous
          </button>
          <span className="text-xs text-slate-500 font-bold">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="btn-secondary py-1.5 px-3.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );

  if (isStaff) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        {/* Staff Navbar Header */}
        <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
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
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold py-1.5 px-3.5 rounded-md transition-colors cursor-pointer"
              >
                Back to Dashboard
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

        <main className="flex-grow">{renderContent()}</main>

        <footer className="bg-slate-100 border-t border-slate-200 py-4 text-center text-[10px] text-slate-400 uppercase tracking-wider">
          Operations Control Center © 2026 SmartQueue System. All database systems connected.
        </footer>
      </div>
    );
  }

  // Patient layout
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <PatientNavbar />
      <main className="flex-grow">{renderContent()}</main>
      <PatientFooter />
    </div>
  );
};

export default Notifications;
