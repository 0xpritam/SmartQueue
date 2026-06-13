import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { token, currentUser, loadingProfile } = useAuth();

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-8 w-8 animate-spin text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Restoring Session...</span>
        </div>
      </div>
    );
  }

  if (!token) {
    if (allowedRoles && allowedRoles.includes('admin')) {
      return <Navigate to="/staff-login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // Fallback for incomplete/corrupted sessions
  if (!currentUser || !currentUser.role) {
    if (allowedRoles && allowedRoles.includes('admin')) {
      return <Navigate to="/staff-login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    if (currentUser.role === 'admin') {
      return <Navigate to="/dashboard" replace />;
    } else if (currentUser.role === 'user') {
      return <Navigate to="/patient-dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
