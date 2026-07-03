import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles, fallbackPath = "/login" }) => {
  const { token, currentUser } = useAuth();
  
  if (!token) return <Navigate to={fallbackPath} replace />;
  
  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
    if (currentUser.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (currentUser.role === 'staff') {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/patient-dashboard" replace />;
    }
  }
  
  return children;
};

export default ProtectedRoute;
