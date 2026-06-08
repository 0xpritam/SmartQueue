import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';

const PatientNavbar = () => {
  const [navSearchInput, setNavSearchInput] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { token, logout } = useAuth();

  const handleSignOut = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (!navSearchInput.trim()) return;
    const cleanId = navSearchInput.trim().toUpperCase();
    navigate(`/queue-status/${cleanId}`);
    setNavSearchInput('');
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand/Logo */}
        <Link to="/" className="flex items-center gap-3 hover:opacity-95 transition-opacity">
          <div className="h-10 w-10 rounded bg-blue-700 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 block leading-tight">SmartQueue</span>
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Patient Platform</span>
          </div>
        </Link>

        {/* Desktop Links & Tools */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <Link to="/hospitals" className="hover:text-blue-700 transition-colors">Find Hospitals</Link>
          <Link to="/book-ticket" className="hover:text-blue-700 transition-colors">Book Queue</Link>
          <Link to="/ai-assistant" className="hover:text-blue-700 transition-colors">AI Assistant</Link>
          {token && (
            <Link to="/patient-dashboard" className="hover:text-blue-700 transition-colors">My Dashboard</Link>
          )}
        </nav>

        {/* Quick Ticket Tracker Search Box & Staff button */}
        <div className="hidden md:flex items-center gap-4">
          <form onSubmit={handleTrackSubmit} className="relative flex items-center">
            <input
              type="text"
              placeholder="Track Ticket ID..."
              value={navSearchInput}
              onChange={(e) => setNavSearchInput(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-700 w-44 transition-all focus:w-52"
            />
            <button type="submit" className="absolute right-2 text-slate-400 hover:text-blue-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>

          {token && (
            <NotificationCenter />
          )}

          {token ? (
            <button 
              onClick={handleSignOut} 
              className="btn-secondary py-1.5 px-4 text-xs font-bold cursor-pointer"
            >
              Sign Out
            </button>
          ) : (
            <Link to="/login" className="btn-secondary py-1.5 px-4 text-xs font-semibold">
              Staff Portal
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-3">
          {token && (
            <NotificationCenter />
          )}
          {token ? (
            <button 
              onClick={handleSignOut} 
              className="btn-secondary py-1 px-3 text-[11px] font-bold cursor-pointer"
            >
              Sign Out
            </button>
          ) : (
            <Link to="/login" className="btn-secondary py-1 px-3 text-[11px] font-semibold">
              Staff Portal
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-slate-600 hover:text-blue-700 focus:outline-none"
            aria-label="Toggle Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 py-4 px-6 space-y-4 shadow-inner">
          <div className="flex flex-col gap-3 font-semibold text-slate-700 text-sm">
            <Link to="/hospitals" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-700 py-1 transition-colors">Find Hospitals</Link>
            <Link to="/book-ticket" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-700 py-1 transition-colors">Book Queue</Link>
            <Link to="/ai-assistant" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-700 py-1 transition-colors">AI Assistant</Link>
            {token && (
              <Link to="/patient-dashboard" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-700 py-1 transition-colors">My Dashboard</Link>
            )}
          </div>
          
          <form onSubmit={handleTrackSubmit} className="relative flex items-center">
            <input
              type="text"
              placeholder="Track Ticket ID (e.g. CAR-102)"
              value={navSearchInput}
              onChange={(e) => setNavSearchInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-700"
            />
            <button type="submit" className="absolute right-3 text-slate-400 hover:text-blue-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </header>
  );
};

export default PatientNavbar;
