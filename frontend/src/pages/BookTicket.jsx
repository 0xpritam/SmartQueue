import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PatientNavbar from '../components/PatientNavbar';
import PatientFooter from '../components/PatientFooter';
import { 
  MOCK_HOSPITALS, 
  getDepartmentStats, 
  recommendDepartment, 
  createTicket 
} from '../api/mockData';

const BookTicket = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Selected Hospital & Department State
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  
  // Available departments based on selected hospital
  const [availableDepartments, setAvailableDepartments] = useState([]);
  
  // Live Wait Stats State
  const [stats, setStats] = useState({ queueLength: 0, estWaitTime: 0 });

  // Patient Booking Form State
  const [formDetails, setFormDetails] = useState({
    patientName: '',
    patientPhone: '',
    patientAge: '',
    reason: ''
  });

  // AI Triage Assistant State
  const [symptomInput, setSymptomInput] = useState('');
  const [triageRecommendation, setTriageRecommendation] = useState(null);
  const [isTriageAnalyzing, setIsTriageAnalyzing] = useState(false);

  // Sync state from query parameters on load
  useEffect(() => {
    const hospitalQuery = searchParams.get('hospital');
    if (hospitalQuery && MOCK_HOSPITALS.some(h => h.id === hospitalQuery)) {
      setSelectedHospitalId(hospitalQuery);
    }
  }, [searchParams]);

  // Update available departments when hospital changes
  useEffect(() => {
    if (selectedHospitalId) {
      const hospital = MOCK_HOSPITALS.find(h => h.id === selectedHospitalId);
      if (hospital) {
        setAvailableDepartments(hospital.departments);
        // Reset department selection if it's not available in the new hospital
        if (!hospital.departments.includes(selectedDepartment)) {
          setSelectedDepartment('');
          setStats({ queueLength: 0, estWaitTime: 0 });
        }
      }
    } else {
      setAvailableDepartments([]);
      setSelectedDepartment('');
      setStats({ queueLength: 0, estWaitTime: 0 });
    }
  }, [selectedHospitalId]);

  // Load wait stats when department/hospital changes
  useEffect(() => {
    if (selectedHospitalId && selectedDepartment) {
      const dStats = getDepartmentStats(selectedHospitalId, selectedDepartment);
      setStats(dStats);
    }
  }, [selectedHospitalId, selectedDepartment]);

  // Handle Form Inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormDetails(prev => ({ ...prev, [name]: value }));
  };

  // Handle Ticket Booking Submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedHospitalId || !selectedDepartment) return;
    
    // Create the ticket in mock state (localStorage)
    const newTicket = createTicket(selectedHospitalId, selectedDepartment, formDetails);
    
    // Route to status page
    navigate(`/queue-status/${newTicket.ticketId}`);
  };

  // Handle Triage Symptom Check
  const handleTriageCheck = (e) => {
    e.preventDefault();
    if (!symptomInput.trim()) return;

    setIsTriageAnalyzing(true);
    setTriageRecommendation(null);

    // Simulate AI thinking and output recommendation
    setTimeout(() => {
      const rec = recommendDepartment(symptomInput);
      setTriageRecommendation(rec);
      setIsTriageAnalyzing(false);
    }, 800);
  };

  // Automatically select the recommended department if available
  const applyTriageSelection = (department) => {
    if (!selectedHospitalId) {
      // Pick first hospital offering this department
      const matchHospital = MOCK_HOSPITALS.find(h => h.departments.includes(department));
      if (matchHospital) {
        setSelectedHospitalId(matchHospital.id);
      }
    }
    
    setSelectedDepartment(department);
    setTriageRecommendation(null);
    setSymptomInput('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <PatientNavbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Side: Booking & Stats Column */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Book a Queue Ticket</h1>
              <p className="text-xs text-slate-500 mt-1">
                Enter your details to generate a remote queue check-in token.
              </p>
            </div>

            {/* Booking Form Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Hospital Selection */}
                <div>
                  <label htmlFor="hospitalSelect" className="input-label">Select Hospital</label>
                  <select
                    id="hospitalSelect"
                    required
                    value={selectedHospitalId}
                    onChange={(e) => setSelectedHospitalId(e.target.value)}
                    className="input-field cursor-pointer bg-white"
                  >
                    <option value="">-- Choose Partner Facility --</option>
                    {MOCK_HOSPITALS.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.distance})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department Selection */}
                <div>
                  <label htmlFor="deptSelect" className="input-label">Select Department</label>
                  <select
                    id="deptSelect"
                    required
                    disabled={!selectedHospitalId}
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="input-field cursor-pointer bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!selectedHospitalId ? 'Select hospital first...' : '-- Choose Medical Division --'}
                    </option>
                    {availableDepartments.map((dept, idx) => (
                      <option key={idx} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Animated Wait Stats Box */}
                <AnimatePresence mode="wait">
                  {selectedHospitalId && selectedDepartment && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      transition={{ type: "spring", duration: 0.4 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-4 bg-blue-50/50 border border-blue-100 rounded-lg p-4 text-center">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Estimated Wait</span>
                          <span className="text-2xl font-black text-blue-700 block">
                            {stats.estWaitTime} mins
                          </span>
                        </div>
                        <div className="space-y-1 border-l border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Patients Waiting</span>
                          <span className="text-2xl font-black text-teal-700 block">
                            {stats.queueLength} in queue
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Patient Information Form Fields */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Patient Details</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Patient Name */}
                    <div className="sm:col-span-2">
                      <label htmlFor="patientName" className="input-label">Patient Full Name</label>
                      <input
                        id="patientName"
                        name="patientName"
                        type="text"
                        required
                        value={formDetails.patientName}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        className="input-field"
                      />
                    </div>

                    {/* Patient Age */}
                    <div>
                      <label htmlFor="patientAge" className="input-label">Patient Age</label>
                      <input
                        id="patientAge"
                        name="patientAge"
                        type="number"
                        min="1"
                        max="125"
                        required
                        value={formDetails.patientAge}
                        onChange={handleInputChange}
                        placeholder="e.g. 35"
                        className="input-field"
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label htmlFor="patientPhone" className="input-label">Phone Number (For status SMS alerts)</label>
                    <input
                      id="patientPhone"
                      name="patientPhone"
                      type="tel"
                      required
                      value={formDetails.patientPhone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 000-1234"
                      className="input-field"
                    />
                  </div>

                  {/* Reason for Visit */}
                  <div>
                    <label htmlFor="reason" className="input-label">Consultation Reason (Optional)</label>
                    <textarea
                      id="reason"
                      name="reason"
                      rows={2}
                      value={formDetails.reason}
                      onChange={handleInputChange}
                      placeholder="e.g. Routine checkup, chronic back pain, annual scan..."
                      className="input-field resize-none"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={!selectedHospitalId || !selectedDepartment}
                  className="btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate Queue Ticket
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </button>
              </form>
            </div>
          </div>

          {/* Right Side: AI Triage Assistant Column */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* AI Recommendation Widget Header */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span className="p-1 rounded bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center">
                  <svg className="w-4 h-4 shrink-0 animate-pulse" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-.813-5.096L3 15.187m6 5.813l5.096-.813M21 3L9 15m0 0l-3-3m3 3L3 9" />
                  </svg>
                </span>
                AI Triage Helper
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Tell us your symptom, and we will recommend the correct medical division.
              </p>
            </div>

            {/* AI Assistant Card */}
            <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-sm relative overflow-hidden">
              {/* Soft decorative glow background */}
              <div className="absolute right-0 bottom-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <form onSubmit={handleTriageCheck} className="space-y-4 relative z-10">
                <div>
                  <label htmlFor="symptoms" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    What symptoms are you experiencing?
                  </label>
                  <textarea
                    id="symptoms"
                    rows={3}
                    required
                    value={symptomInput}
                    onChange={(e) => setSymptomInput(e.target.value)}
                    placeholder="e.g. My child has a high fever, or I have sharp joint pain in my knee..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isTriageAnalyzing || !symptomInput.trim()}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isTriageAnalyzing ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                      Analyzing symptoms...
                    </>
                  ) : (
                    <>
                      Analyze Symptoms
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              {/* Recommendation Output */}
              <AnimatePresence mode="wait">
                {triageRecommendation !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="mt-5 pt-5 border-t border-slate-800 space-y-3 relative z-10"
                  >
                    {triageRecommendation ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-teal-950/60 border border-teal-800 rounded-lg text-xs leading-normal">
                          <p className="text-teal-400 font-bold mb-1">Recommended Division:</p>
                          <p className="text-slate-100 font-medium">
                            Based on symptom matching, we recommend booking a ticket in the <span className="text-teal-300 font-bold underline">{triageRecommendation}</span> department.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => applyTriageSelection(triageRecommendation)}
                          className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs py-2 rounded transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          Select {triageRecommendation}
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 leading-normal">
                        No clear matching department found for these symptoms. Please review available divisions and select manually.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Triage Disclaimer */}
              <div className="mt-5 pt-3 border-t border-slate-800 text-[10px] text-slate-500 leading-relaxed font-semibold">
                ⚠️ **Disclaimer**: The Triage Helper is strictly for outpatient clinic queue routing. It does not perform diagnostic checks or recommend treatments. If you are experiencing a medical emergency, please visit the nearest hospital emergency room.
              </div>
            </div>
          </div>

        </div>
      </main>

      <PatientFooter />
    </div>
  );
};

export default BookTicket;
