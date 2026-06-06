import React from 'react';

const QueueStatsCards = ({ waiting = 0, serving = 0, completed = 0, estWaitTime = 0 }) => {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Waiting */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
        <div className="p-3.5 rounded bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div className="space-y-0.5 truncate">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Waiting</span>
          <span className="text-xl font-extrabold text-slate-900 block">{waiting} Patients</span>
        </div>
      </div>

      {/* Currently Serving */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
        <div className="p-3.5 rounded bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </div>
        <div className="space-y-0.5 truncate">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Serving Now</span>
          <span className="text-xl font-extrabold text-slate-900 block">{serving} Active</span>
        </div>
      </div>

      {/* Completed Today */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
        <div className="p-3.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="space-y-0.5 truncate">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed Today</span>
          <span className="text-xl font-extrabold text-slate-900 block">{completed} Sessions</span>
        </div>
      </div>

      {/* Average Wait Time */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
        <div className="p-3.5 rounded bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="space-y-0.5 truncate">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Wait Time</span>
          <span className="text-xl font-extrabold text-slate-900 block">{estWaitTime} mins</span>
        </div>
      </div>
    </section>
  );
};

export default QueueStatsCards;
