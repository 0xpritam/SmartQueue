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
        return <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold uppercase tracking-wider animate-pulse">Serving</span>;
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">Completed</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-800 text-[10px] font-bold uppercase tracking-wider">Cancelled</span>;
      case 'waiting':
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-bold uppercase tracking-wider">Waiting</span>;
    }
  };

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-xs font-semibold bg-white border border-slate-200 rounded-xl">
        No active patient records in this queue category.
      </div>
    );
  }

  // FIFO waiting order helper: only count positions for 'waiting' tickets
  const waitingTickets = tickets.filter(t => t.status === 'waiting');

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3.5 px-5">Position</th>
              <th className="py-3.5 px-5">Ticket Number</th>
              <th className="py-3.5 px-5">Patient Details</th>
              <th className="py-3.5 px-5">Department</th>
              <th className="py-3.5 px-5">Status</th>
              <th className="py-3.5 px-5">Booking Time</th>
              <th className="py-3.5 px-5 text-right">Actions</th>
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
                : (t.status === 'serving' ? 'Called' : '—');

              const bookingTimeStr = new Date(t.createdAt).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              });

              return (
                <tr key={t.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-4 px-5 text-slate-400 font-bold">{positionLabel}</td>
                  <td className="py-4 px-5 font-black text-slate-800 font-mono">TKT-{cleanTktNum}</td>
                  <td className="py-4 px-5 space-y-0.5">
                    <div className="font-bold text-slate-900">{meta.patientName}</div>
                    <div className="text-[10px] text-slate-400 font-semibold">Age {meta.patientAge} • {meta.patientPhone}</div>
                    {meta.reason && <div className="text-[10px] text-slate-500 truncate max-w-[180px]">{meta.reason}</div>}
                  </td>
                  <td className="py-4 px-5 text-slate-600 font-semibold">{deptName}</td>
                  <td className="py-4 px-5">{getStatusBadge(t.status)}</td>
                  <td className="py-4 px-5 text-slate-500">{bookingTimeStr}</td>
                  <td className="py-4 px-5 text-right space-x-1.5 shrink-0">
                    {/* Action buttons */}
                    {t.status === 'waiting' && (
                      <button
                        onClick={() => onStatusChange(t.id, 'serving', t.ticketNumber, t.departmentId)}
                        disabled={actionLoading}
                        className="text-[10px] font-bold bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 py-1 px-2.5 rounded transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Serve
                      </button>
                    )}
                    {t.status === 'serving' && (
                      <button
                        onClick={() => onStatusChange(t.id, 'completed', t.ticketNumber, t.departmentId)}
                        disabled={actionLoading}
                        className="text-[10px] font-bold bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-700 py-1 px-2.5 rounded transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Complete
                      </button>
                    )}
                    {t.status !== 'completed' && t.status !== 'cancelled' && (
                      <button
                        onClick={() => onStatusChange(t.id, 'cancelled', t.ticketNumber, t.departmentId)}
                        disabled={actionLoading}
                        className="text-[10px] font-bold bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 py-1 px-2.5 rounded transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
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
