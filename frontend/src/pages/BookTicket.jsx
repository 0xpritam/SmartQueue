import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PatientNavbar from '../components/PatientNavbar';
import PatientFooter from '../components/PatientFooter';
import { useAuth } from '../context/AuthContext';
import { getHospitals } from '../api/hospital';
import { bookTicket } from '../api/tickets';
import { getWaitingTickets } from '../api/queues';
import { recommendDepartment } from '../api/mockData';
import { register as apiRegister } from '../api/auth';

const BookTicket = () => {
  const { token, login } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // API Data State
  const [hospitals, setHospitals] = useState([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [guestLoading, setGuestLoading] = useState(false);

  // Selected Hospital & Department State
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [availableDepartments, setAvailableDepartments] = useState([]);
  
  // Live Wait Stats State (Calculated directly from active DB tickets)
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

  // Silent Guest Authentication: ensures frictionless patient booking
  useEffect(() => {
    const ensureToken = async () => {
      if (!token && !guestLoading) {
        setGuestLoading(true);
        try {
          const guestEmail = `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}@smartqueue.demo`;
          const guestPassword = 'smartqueue_guest_pass_123';
          const guestName = 'Outpatient Guest';
          
          await apiRegister(guestName, guestEmail, guestPassword);
          await login(guestEmail, guestPassword);
        } catch (err) {
          console.error('Silent guest auth error:', err);
        } finally {
          setGuestLoading(false);
        }
      }
    };

    ensureToken();
  }, [token, login, guestLoading]);

  // Load Hospitals List on page mount
  useEffect(() => {
    const loadHospitals = async () => {
      try {
        const res = await getHospitals();
        if (res && res.success) {
          setHospitals(res.hospitals || []);
          
          // Pre-select hospital and department from query param if provided
          const hospitalQuery = searchParams.get('hospital');
          const departmentQuery = searchParams.get('department');
          if (hospitalQuery && res.hospitals.some(h => h.id === hospitalQuery)) {
            setSelectedHospitalId(hospitalQuery);
            const selectedHosp = res.hospitals.find(h => h.id === hospitalQuery);
            if (departmentQuery) {
              const deptMatch = selectedHosp.departments.find(
                d => d.id === departmentQuery || d.name.toLowerCase() === departmentQuery.toLowerCase()
              );
              if (deptMatch) {
                setSelectedDepartment(deptMatch.id);
              }
            }
          }
        } else {
          setError(res.message || 'Failed to retrieve hospitals.');
        }
      } catch (err) {
        console.error('Error loading hospitals:', err);
        setError(err.response?.data?.message || err.message || 'Failed to connect to API.');
      } finally {
        setHospitalsLoading(false);
      }
    };

    loadHospitals();
  }, [searchParams]);

  // Update available departments when hospital changes
  useEffect(() => {
    if (selectedHospitalId) {
      const hospital = hospitals.find(h => h.id === selectedHospitalId);
      if (hospital) {
        setAvailableDepartments(hospital.departments);
        // Reset department selection if not available in the new hospital
        if (!hospital.departments.some(d => d.id === selectedDepartment)) {
          setSelectedDepartment('');
          setStats({ queueLength: 0, estWaitTime: 0 });
        }
      }
    } else {
      setAvailableDepartments([]);
      setSelectedDepartment('');
      setStats({ queueLength: 0, estWaitTime: 0 });
    }
  }, [selectedHospitalId, hospitals]);

  // Load wait stats from the backend when department changes
  useEffect(() => {
    const fetchQueueStats = async () => {
      if (selectedHospitalId && selectedDepartment) {
        try {
          const res = await getWaitingTickets(selectedDepartment);
          if (res && res.success) {
            const queueLength = res.tickets ? res.tickets.length : 0;
            const estWaitTime = queueLength * 8; 
            setStats({ queueLength, estWaitTime });
          }
        } catch (err) {
          console.error('Error fetching queue stats:', err);
        }
      }
    };

    fetchQueueStats();
    // Poll stats every 8 seconds for near realtime updates
    const interval = setInterval(fetchQueueStats, 8000);
    return () => clearInterval(interval);
  }, [selectedHospitalId, selectedDepartment]);

  // Handle Form Inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormDetails(prev => ({ ...prev, [name]: value }));
  };

  // Handle Ticket Booking Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Establishing connection session. Please try again in a moment...');
      return;
    }
    if (!selectedHospitalId || !selectedDepartment) return;
    
    setBookingLoading(true);
    setError(null);
    try {
      const res = await bookTicket(selectedDepartment);
      if (res && res.success && res.ticket) {
        // Store patient metadata (not stored on backend) in localStorage mapped to the ticket UUID
        const metadata = {
          patientName: formDetails.patientName,
          patientAge: formDetails.patientAge,
          patientPhone: formDetails.patientPhone,
          reason: formDetails.reason,
          hospitalId: selectedHospitalId,
          hospitalName: hospitals.find(h => h.id === selectedHospitalId)?.name || 'SmartQueue Partner Clinic',
          departmentName: availableDepartments.find(d => d.id === selectedDepartment)?.name || 'Medical Clinic'
        };
        localStorage.setItem(`smartqueue_meta_${res.ticket.id}`, JSON.stringify(metadata));
        
        // Navigate to queue status page using the UUID returned from DB
        navigate(`/queue-status/${res.ticket.id}`);
      } else {
        setError(res.message || 'Failed to generate queue ticket.');
      }
    } catch (err) {
      console.error('Book ticket error:', err);
      setError(err.response?.data?.message || err.message || 'API request failed.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Handle Triage Symptom Check
  const handleTriageCheck = (e) => {
    e.preventDefault();
    if (!symptomInput.trim()) return;

    setIsTriageAnalyzing(true);
    setTriageRecommendation(null);

    setTimeout(() => {
      const rec = recommendDepartment(symptomInput);
      setTriageRecommendation(rec);
      setIsTriageAnalyzing(false);
    }, 800);
  };

  // Automatically select the recommended department by mapping the name back to its DB UUID
  const applyTriageSelection = (departmentName) => {
    let foundHospitalId = selectedHospitalId;
    let foundDeptId = '';

    if (selectedHospitalId) {
      const hosp = hospitals.find(h => h.id === selectedHospitalId);
      const dept = hosp?.departments.find(d => d.name === departmentName);
      if (dept) foundDeptId = dept.id;
    }

    if (!foundDeptId) {
      for (const h of hospitals) {
        const dept = h.departments.find(d => d.name === departmentName);
        if (dept) {
          foundHospitalId = h.id;
          foundDeptId = dept.id;
          break;
        }
      }
    }

    if (foundDeptId) {
      setSelectedHospitalId(foundHospitalId);
      setSelectedDepartment(foundDeptId);
    }
    
    setTriageRecommendation(null);
    setSymptomInput('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <PatientNavbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow w-full">
        {hospitalsLoading || guestLoading ? (
          /* Skeleton Loader */
          <div className="space-y-6 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-7 bg-white p-6 rounded-xl border border-slate-200 h-[400px]" />
              <div className="md:col-span-5 bg-slate-200 rounded-xl h-[400px]" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Side: Booking & Stats Column */}
            <div className="lg:col-span-7 space-y-6">
              
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Book a Queue Ticket</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your details to generate a remote queue check-in token.
                </p>
              </div>

              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex gap-3 text-xs text-red-700 animate-fadeIn font-semibold">
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>{error}</div>
                </div>
              )}

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
                      {hospitals.map((h) => (
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
                      className="input-field cursor-pointer bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {!selectedHospitalId ? 'Select hospital first...' : '-- Choose Medical Division --'}
                      </option>
                      {availableDepartments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
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
                            <span className="text-2xl font-black text-blue-700 block animate-pulse">
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
                    disabled={!selectedHospitalId || !selectedDepartment || bookingLoading}
                    className="btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {bookingLoading ? (
                      <>
                        <svg className="h-4.5 w-4.5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                        Securing queue place...
                      </>
                    ) : (
                      <>
                        Generate Queue Ticket
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Side: AI Triage Assistant Column */}
            <div className="lg:col-span-5 space-y-6">
              
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
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
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

                <div className="mt-5 pt-3 border-t border-slate-800 text-[10px] text-slate-500 leading-relaxed font-semibold">
                  ⚠️ **Disclaimer**: The Triage Helper is strictly for outpatient clinic queue routing. It does not perform diagnostic checks or recommend treatments. If you are experiencing a medical emergency, please visit the nearest hospital emergency room.
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      <PatientFooter />
    </div>
  );
};

export default BookTicket;
