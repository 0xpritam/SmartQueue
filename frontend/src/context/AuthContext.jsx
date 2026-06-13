import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { login as apiLogin, getProfile } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loadingProfile, setLoadingProfile] = useState(() => {
    const hasToken = !!localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    return hasToken && (!user || !user.role);
  });

  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [token]);

  useEffect(() => {
    const fetchMe = async () => {
      if (token && (!currentUser || !currentUser.role)) {
        try {
          const res = await getProfile();
          if (res && res.success) {
            setCurrentUser(res.user);
            localStorage.setItem('user', JSON.stringify(res.user));
          } else {
            logout();
          }
        } catch (err) {
          console.error('Error fetching profile on startup:', err);
          logout();
        } finally {
          setLoadingProfile(false);
        }
      } else {
        setLoadingProfile(false);
      }
    };
    fetchMe();
  }, [token]);

  const login = async (email, password) => {
    const data = await apiLogin(email, password);
    if (data && data.token) {
      setToken(data.token);
      setCurrentUser(data.user || null);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user || null));
      setLoadingProfile(false);
      return { success: true, user: data.user };
    }
    return { success: false, message: data.message };
  };

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    setLoadingProfile(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateUser = (updatedUser) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ token, currentUser, login, logout, updateUser, loadingProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
