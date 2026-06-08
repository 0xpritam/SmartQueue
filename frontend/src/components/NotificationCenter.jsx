// src/components/NotificationCenter.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../context/NotificationContext';

// Helper to calculate relative time
export const getRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const NotificationCenter = ({ isDarkMode = false }) => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    browserPermission,
    requestBrowserPermission,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (item) => {
    if (!item.isRead) {
      markAsRead(item.id);
    }
    if (item.ticketId) {
      navigate(`/queue-status/${item.ticketId}`);
      setIsOpen(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'serving':
        return (
          <span className="p-1.5 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
            <svg className="h-4 w-4 animate-pulse" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </span>
        );
      case 'completed':
        return (
          <span className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </span>
        );
      case 'cancelled':
        return (
          <span className="p-1.5 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </span>
        );
      default:
        return (
          <span className="p-1.5 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a9.001 9.001 0 0 1-5.714 0M3.181 12.062a1.88 1.88 0 0 1 3.638 0A18.001 18.001 0 0 0 12 21.75c2.676 0 5.216-.584 7.499-1.632M12 3v1.5M12 18.75V21m-9-9H1.5m21 0H21" />
            </svg>
          </span>
        );
    }
  };

  // Limit dropdown to latest 5 items
  const recentItems = notifications.slice(0, 5);

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors cursor-pointer focus:outline-none flex items-center justify-center ${
          isDarkMode
            ? 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-700/50'
            : 'text-slate-600 hover:text-blue-700 hover:bg-slate-50 border border-slate-200'
        }`}
        aria-label="View notifications"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a9.001 9.001 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M3.181 12.062a1.88 1.88 0 0 1 3.638 0A18.001 18.001 0 0 0 12 21.75c2.676 0 5.216-.584 7.499-1.632m-15-7.796a5.907 5.907 0 0 1 3.541-4.486m14.19 0a5.907 5.907 0 0 1 3.54 4.486m-14.19-10.187a3 3 0 0 1 5.96 0m-5.96 0A9.753 9.753 0 0 0 9 10.5M12 3a9.753 9.753 0 0 1 3 7.5" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1.5 bg-red-500 text-white rounded-full text-[9px] font-black min-w-[17px] h-[17px] px-1 flex items-center justify-center border-2 border-white shadow-sm animate-fadeIn">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl p-4 shadow-2xl z-50 text-slate-800 cursor-default border ${
              isDarkMode
                ? 'bg-slate-900/98 backdrop-blur-md border-slate-800 shadow-slate-950 text-slate-200'
                : 'bg-white/98 backdrop-blur-md border-slate-200 shadow-slate-200/50 text-slate-850'
            }`}
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100/30">
              <span className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-900'}`}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] font-extrabold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer focus:outline-none"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Browser Permission Banner */}
            {browserPermission === 'default' && (
              <div className={`mt-2 p-2 rounded-lg flex items-center justify-between border ${
                isDarkMode 
                  ? 'bg-slate-800/60 border-slate-700/50 text-slate-300' 
                  : 'bg-blue-50/60 border-blue-100 text-blue-800'
              }`}>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold">Desktop Alerts</span>
                  <span className="text-[9px] text-slate-400 leading-none">Show real-time notifications</span>
                </div>
                <button
                  onClick={requestBrowserPermission}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[9px] px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-sm"
                >
                  Enable
                </button>
              </div>
            )}

            {/* Body */}
            <div className="py-2.5 max-h-80 overflow-y-auto divide-y divide-slate-100/20 pr-0.5 mt-1 space-y-1">
              {recentItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-semibold text-[11px] leading-relaxed">
                  You're all caught up!
                  <span className="block text-[9px] text-slate-500 font-normal mt-0.5">No new alerts received</span>
                </div>
              ) : (
                recentItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`flex gap-3 p-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
                      item.isRead
                        ? 'opacity-75 hover:bg-slate-100/50'
                        : isDarkMode
                          ? 'bg-slate-800/40 hover:bg-slate-800/70 border-l-3 border-blue-500 pl-1.5'
                          : 'bg-blue-50/30 hover:bg-blue-50/60 border-l-3 border-blue-600 pl-1.5'
                    }`}
                  >
                    {getIcon(item.type)}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex justify-between items-start gap-1">
                        <span className={`text-[11px] font-black truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                          {item.title}
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold shrink-0">
                          {getRelativeTime(item.createdAt)}
                        </span>
                      </div>
                      <p className={`text-[10px] leading-normal font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {item.message}
                      </p>
                      {item.ticketId && (
                        <div className="pt-1 flex items-center justify-between">
                          <span className="text-[9px] font-bold text-blue-600 hover:underline">
                            Track appointment status &rarr;
                          </span>
                          {!item.isRead && (
                            <span className="h-1.5 w-1.5 bg-blue-600 rounded-full shrink-0" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-100/30 text-center">
              <button
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
                className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 hover:underline w-full cursor-pointer focus:outline-none"
              >
                See all notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
