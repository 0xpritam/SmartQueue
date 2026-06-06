import React from 'react';

const QueueTable = ({ tickets = [], departments = [], onStatusChange, actionLoading }) => {
  // Retrieve patient metadata stored in localStorage
  const getPatientMetadata = (ticketId) => {
    const stored = localStorage.getItem(`smartqueue_meta_${ticketId}`);
    if (stored) return JSON.parse(stored);
    return {
      patientName: 'Outpatient Guest',
      patientAge: '—',
      patientPhone: '—',
      reason: ''
    };
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'serving':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-bold uppercase tracking-wider animate-pulse shadow-sm">
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full shrink-0" />
            Serving
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider shadow-sm">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold uppercase tracking-wider shadow-sm">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
            Cancelled
          </span>
        );
      case 'waiting':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold uppercase tracking-wider shadow-sm">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
            Waiting
          </span>
        );
    }
  };

  if (tickets.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 text-xs font-semibold bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-center items-center gap-3">
        <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span>No active patient records in this queue category.</span>
      </div>
    );
  }

  // FIFO waiting order helper: only count positions for 'waiting' tickets
  const waitingTickets = tickets.filter(t => t.status === 'waiting');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-4 px-4 text-center w-12">Pos</th>
              <th className="py-4 px-4 w-28">Ticket ID</th>
              <th className="py-4 px-4">Patient details</th>
              <th className="py-4 px-4 w-36">Clinical Division</th>
              <th className="py-4 px-4 w-28">Current Status</th>
              <th className="py-4 px-4 w-24">Check-in Time</th>
              <th className="py-4 px-4 text-right pr-6 w-36 min-w-[140px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {tickets.map((t) => {
              const meta = getPatientMetadata(t.id);
              const dept = departments.find(d => d.id === t.departmentId);
              const deptName = dept ? dept.name : 'Outpatient Clinic';
              const cleanTktNum = t.ticketNumber.split('-')[2]?.substring(0, 6) || t.id.substring(0, 6);
              
              // Calculate index among waiting tickets only
              const waitingIndex = waitingTickets.findIndex(waitTkt => waitTkt.id === t.id);
              const positionLabel = t.status === 'waiting' 
                ? `#${waitingIndex + 1}` 
                : (t.status === 'serving' ? 'Serving' : '—');

              const bookingTimeStr = new Date(t.createdAt).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              });

              return (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-all duration-200">
                  <td className="py-4 px-4 text-center text-slate-400 font-bold text-sm w-12">{positionLabel}</td>
                  <td className="py-4 px-4 font-black text-slate-900 font-mono text-sm w-28">TKT-{cleanTktNum}</td>
                  <td className="py-4 px-4 space-y-1">
                    <div className="font-semibold text-slate-900 text-sm leading-tight">{meta.patientName}</div>
                    <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                      <span>Age {meta.patientAge}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span>{meta.patientPhone}</span>
                    </div>
                    {meta.reason && (
                      <div className="text-xs text-slate-400 italic font-normal truncate max-w-[220px]">
                        "{meta.reason}"
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-slate-700 text-xs font-semibold w-36">{deptName}</td>
                  <td className="py-4 px-4 w-28">{getStatusBadge(t.status)}</td>
                  <td className="py-4 px-4 text-slate-500 text-xs w-24">{bookingTimeStr}</td>
                  <td className="py-4 px-4 text-right pr-6 w-36 min-w-[140px] align-middle">
                    <div className="flex flex-col gap-1.5 items-end justify-center">
                      {/* Action buttons */}
                      {t.status === 'waiting' && (
                        <button
                          onClick={() => onStatusChange(t.id, 'serving', t.ticketNumber, t.departmentId)}
                          disabled={actionLoading}
                          className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 w-28 text-[11px] font-bold bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200/80 hover:border-blue-600 text-blue-700 rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50 shadow-sm shrink-0"
                        >
                          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                          Serve
                        </button>
                      )}
                      {t.status === 'serving' && (
                        <button
                          onClick={() => onStatusChange(t.id, 'completed', t.ticketNumber, t.departmentId)}
                          disabled={actionLoading}
                          className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 w-28 text-[11px] font-bold bg-teal-50 hover:bg-teal-600 hover:text-white border border-teal-200/80 hover:border-teal-600 text-teal-700 rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50 shadow-sm shrink-0"
                        >
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Complete
                        </button>
                      )}
                      {t.status !== 'completed' && t.status !== 'cancelled' && (
                        <button
                          onClick={() => onStatusChange(t.id, 'cancelled', t.ticketNumber, t.departmentId)}
                          disabled={actionLoading}
                          className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 w-28 text-[11px] font-bold bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50 shadow-sm shrink-0"
                        >
                          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QueueTable;
