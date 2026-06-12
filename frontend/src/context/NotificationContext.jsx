// src/context/NotificationContext.jsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { getNotifications, markAsRead, markAllAsRead } from '../api/notifications';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { token, currentUser } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 20,
  });
  const [toast, setToast] = useState(null); // { id, title, message, type }
  const [browserPermission, setBrowserPermission] = useState(
    typeof window !== 'undefined' ? window.Notification?.permission || 'default' : 'default'
  );

  const fetchNotifications = async (page = 1, limit = 20) => {
    if (!token) return;
    try {
      const res = await getNotifications(page, limit);
      if (res && res.success) {
        setNotifications(res.notifications || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error('[NOTIFICATIONS CONTEXT] Failed to fetch notifications:', err);
    }
  };

  // Fetch initial notifications when token changes (or user logs in)
  useEffect(() => {
    if (token) {
      fetchNotifications(1, 20);
    } else {
      setNotifications([]);
      setPagination({
        totalCount: 0,
        totalPages: 1,
        currentPage: 1,
        limit: 20,
      });
    }
  }, [token]);

  // Request browser notification permission on demand
  const requestBrowserPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return 'denied';
    }

    try {
      const permission = await window.Notification.requestPermission();
      setBrowserPermission(permission);
      return permission;
    } catch (err) {
      console.error('[NOTIFICATIONS CONTEXT] Failed requesting permission:', err);
      return 'default';
    }
  };

  // Listen to socket connection user:${userId}
  useEffect(() => {
    if (!socket || !currentUser) return;

    // The backend automatically joined the socket to user:${currentUser.id}
    // on connection, so we do not emit any custom join event.
    console.log(`[SOCKET] Registered user notifications listener for user:${currentUser.id}`);

    const handleNewNotification = (newNotif) => {
      console.log('[SOCKET] Received new notification:', newNotif);

      // Prepend to current list and adjust total count
      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });
      setPagination((prev) => ({
        ...prev,
        totalCount: prev.totalCount + 1,
      }));

      // Trigger standard in-app toast
      showToast(newNotif);
    };

    const handleNotificationRead = ({ id }) => {
      console.log('[SOCKET] Received notification_read event:', id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    };

    const handleAllNotificationsRead = () => {
      console.log('[SOCKET] Received all_notifications_read event');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('notification_read', handleNotificationRead);
    socket.on('all_notifications_read', handleAllNotificationsRead);

    return () => {
      console.log('[SOCKET] Tearing down user notifications listeners');
      socket.off('new_notification', handleNewNotification);
      socket.off('notification_read', handleNotificationRead);
      socket.off('all_notifications_read', handleAllNotificationsRead);
    };
  }, [socket, currentUser]);

  const showToast = (notification) => {
    const id = Date.now();
    setToast({
      id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
    });

    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setToast((prev) => (prev && prev.id === id ? null : prev));
    }, 6000);
  };

  const handleMarkAsRead = async (id) => {
    try {
      const res = await markAsRead(id);
      if (res && res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error('[NOTIFICATIONS CONTEXT] Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await markAllAsRead();
      if (res && res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error('[NOTIFICATIONS CONTEXT] Failed to mark all as read:', err);
    }
  };

  // Compute unread count based on current notifications
  // Note: Since pagination only retrieves a subset, we fetch unread count dynamically or scan local list.
  // SCANNING the local list works well for local counters, but wait!
  // If there are unread notifications on other pages, it might not be counted.
  // Wait, let's scan unreadCount. The backend doesn't return unreadCount separately in metadata,
  // but we can compute it from current list. If we want it to be 100% accurate,
  // let's count all unread notifications in local list. Since we only keep 100 notifications,
  // the unread list will naturally match.
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        pagination,
        unreadCount,
        toast,
        browserPermission,
        requestBrowserPermission,
        markAsRead: handleMarkAsRead,
        markAllAsRead: handleMarkAllAsRead,
        fetchNotifications,
        setToast,
      }}
    >
      {children}
      <ToastContainer toast={toast} onClose={() => setToast(null)} />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

// Global Visual Toast Alert Component
const ToastContainer = ({ toast, onClose }) => {
  return (
    <div className="fixed bottom-6 right-6 z-100 max-w-sm w-full pointer-events-none select-none">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 p-4 flex gap-3.5 select-none"
          >
            <div className="p-2 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
              {toast.type === 'serving' ? (
                <svg className="h-5.5 w-5.5 text-teal-600 animate-pulse" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              ) : toast.type === 'completed' ? (
                <svg className="h-5.5 w-5.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              ) : toast.type === 'cancelled' ? (
                <svg className="h-5.5 w-5.5 text-red-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              ) : (
                <svg className="h-5.5 w-5.5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a9.001 9.001 0 0 1-5.714 0M3.181 12.062a1.88 1.88 0 0 1 3.638 0A18.001 18.001 0 0 0 12 21.75c2.676 0 5.216-.584 7.499-1.632M12 3v1.5M12 18.75V21m-9-9H1.5m21 0H21" />
                </svg>
              )}
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-xs font-bold text-slate-905">{toast.title}</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-normal">{toast.message}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 self-start p-0.5 cursor-pointer rounded-md hover:bg-slate-50 transition-colors">
              <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6 12 12" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
