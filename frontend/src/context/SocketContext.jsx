import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('offline'); // 'connected' | 'reconnecting' | 'offline'

  useEffect(() => {
    // Only connect if user is authenticated (has token)
    if (!token) {
      if (socket) {
        console.log('[SOCKET] Disconnecting socket due to auth teardown');
        socket.disconnect();
        setSocket(null);
      }
      setConnectionStatus('offline');
      return;
    }

    console.log('[SOCKET] Initializing socket connection');
    const socketUrl = 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('[SOCKET] Connected to server successfully');
      setConnectionStatus('connected');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected from server:', reason);
      if (reason === 'io server disconnect') {
        // Local disconnect
        setConnectionStatus('offline');
      } else {
        // Reconnecting
        setConnectionStatus('offline');
      }
    });

    newSocket.on('connect_error', (err) => {
      console.error('[SOCKET] Connection error:', err);
      setConnectionStatus('offline');
    });

    newSocket.on('reconnect_attempt', (attempt) => {
      console.log(`[SOCKET] Reconnection attempt #${attempt}`);
      setConnectionStatus('reconnecting');
    });

    newSocket.on('reconnect', () => {
      console.log('[SOCKET] Reconnected to server');
      setConnectionStatus('connected');
    });

    setSocket(newSocket);

    return () => {
      console.log('[SOCKET] Tearing down socket listener');
      newSocket.disconnect();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, connectionStatus, isConnected: connectionStatus === 'connected' }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

export default SocketContext;
