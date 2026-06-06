import React from 'react';
import { Link } from 'react-router-dom';

const PatientFooter = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs py-12 border-t border-slate-800 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Col 1 */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-white">
            <div className="h-8 w-8 rounded bg-blue-700 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight">SmartQueue</span>
          </div>
          <p className="leading-relaxed text-[11px] text-slate-500">
            Fictional patient queue management & clinical routing portal. Designed for testing real-time queue pacing and just-in-time outpatient arrivals.
          </p>
        </div>

        {/* Col 2 */}
        <div className="space-y-3">
          <h4 className="font-semibold text-white uppercase tracking-wider text-[10px]">Patient Portal</h4>
          <ul className="space-y-2 text-[11px]">
            <li><Link to="/hospitals" className="hover:text-white transition-colors">Find Fictional Hospitals</Link></li>
            <li><Link to="/book-ticket" className="hover:text-white transition-colors">Book a Ticket</Link></li>
            <li><Link to="/" className="hover:text-white transition-colors">Home Page</Link></li>
          </ul>
        </div>

        {/* Col 3 */}
        <div className="space-y-3">
          <h4 className="font-semibold text-white uppercase tracking-wider text-[10px]">Clinical Divisions</h4>
          <ul className="space-y-2 text-[11px] text-slate-500">
            <li>Cardiology Consultation</li>
            <li>Pediatric Care</li>
            <li>Orthopedics Clinic</li>
            <li>Radiology Worklists</li>
          </ul>
        </div>

        {/* Col 4 */}
        <div className="space-y-3">
          <h4 className="font-semibold text-white uppercase tracking-wider text-[10px]">Security & Pacing</h4>
          <div className="space-y-2">
            <p className="text-[11px] text-slate-500">
              Architecture prepared for WebSocket updates and HIPAA-compliant patient token structures.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700 text-[8px] uppercase">HIPAA Ready</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700 text-[8px] uppercase">WebSockets Ready</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-slate-800 text-center text-slate-600 text-[11px] flex flex-col sm:flex-row justify-between items-center gap-4">
        <span>&copy; {new Date().getFullYear()} SmartQueue. Simulator Mode.</span>
        <div className="flex gap-4">
          <Link to="/login" className="hover:text-white transition-colors">Staff Portal Login</Link>
          <span className="text-slate-700">|</span>
          <Link to="/register" className="hover:text-white transition-colors">Register Clinic</Link>
        </div>
      </div>
    </footer>
  );
};

export default PatientFooter;
