import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between font-sans text-slate-100 relative overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center shadow-lg border border-blue-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white block leading-tight">SmartQueue</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Flow Logistics</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-full backdrop-blur-md">
          🏥 System Status: Active
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-12 z-10">
        <div className="max-w-3xl w-full text-center space-y-4 mb-12">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
            Smart Queue Management Portal
          </h1>
          <p className="text-sm sm:text-base text-slate-400 font-medium max-w-xl mx-auto leading-relaxed">
            Welcome to the clinical orchestration system. Please choose your portal below to sign in or access your dashboard.
          </p>
        </div>

        {/* Portal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
          {/* Patient Portal Card */}
          <div
            onClick={() => navigate('/login')}
            className="group relative cursor-pointer rounded-3xl p-8 bg-slate-900/40 border border-slate-800/60 hover:border-blue-500/50 shadow-2xl transition-all duration-300 backdrop-blur-xl flex flex-col justify-between min-h-[280px] overflow-hidden"
          >
            {/* Background Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="space-y-6">
              {/* Icon Container */}
              <div className="h-14 w-14 rounded-2xl bg-blue-950/60 border border-blue-900/50 flex items-center justify-center text-blue-400 shadow-md group-hover:scale-110 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
                  Patient Portal
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </h2>
                <p className="text-slate-400 text-xs leading-relaxed font-medium">
                  Book online queue tickets, check live estimated doctor waiting times, and monitor queue progressions in real-time.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800/40 text-[10px] text-slate-500 uppercase tracking-widest font-black group-hover:text-blue-400 transition-colors">
              Access Patient Platform &rarr;
            </div>
          </div>

          {/* Staff Portal Card */}
          <div
            onClick={() => navigate('/staff-login')}
            className="group relative cursor-pointer rounded-3xl p-8 bg-slate-900/40 border border-slate-800/60 hover:border-teal-500/50 shadow-2xl transition-all duration-300 backdrop-blur-xl flex flex-col justify-between min-h-[280px] overflow-hidden"
          >
            {/* Background Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="space-y-6">
              {/* Icon Container */}
              <div className="h-14 w-14 rounded-2xl bg-teal-950/60 border border-teal-900/50 flex items-center justify-center text-teal-400 shadow-md group-hover:scale-110 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
                  Staff Portal
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </h2>
                <p className="text-slate-400 text-xs leading-relaxed font-medium">
                  Manage patient flows, transition clinic ticket sequences, call next patients, and review facility operations statistics.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800/40 text-[10px] text-slate-500 uppercase tracking-widest font-black group-hover:text-teal-400 transition-colors">
              Access Staff Platform &rarr;
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 border-t border-slate-900/60 z-10 text-[10px] text-slate-600 uppercase tracking-widest font-bold">
        Secure Healthcare Systems © {new Date().getFullYear()} SmartQueue. HIPAA SSL Protected.
      </footer>
    </div>
  );
};

export default LandingPage;
