import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PatientNavbar from '../components/PatientNavbar';
import PatientFooter from '../components/PatientFooter';
import { getHospitals } from '../api/hospital';

const Hospitals = () => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchHospitalsList = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHospitals();
      if (data && data.success) {
        setHospitals(data.hospitals || []);
      } else {
        setError(data.message || 'Failed to fetch hospital records.');
      }
    } catch (err) {
      console.error('Fetch hospitals error:', err);
      setError(err.response?.data?.message || err.message || 'Connection to backend API failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitalsList();
  }, []);

  // Filter hospitals based on search input (name or location)
  const filteredHospitals = hospitals.filter(hospital =>
    hospital.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hospital.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper to calculate total active queue size and average wait time for a hospital
  const calculateHospitalStats = (hospital) => {
    let totalQueue = 0;
    let totalWait = 0;

    hospital.departments.forEach(dept => {
      // Deterministic mock calculations based on department name length to look realistic
      const nameLength = dept.name.length;
      const queueLength = (nameLength % 5) + 2; 
      const estWaitTime = queueLength * 8;
      totalQueue += queueLength;
      totalWait += estWaitTime;
    });

    const avgWait = hospital.departments.length > 0
      ? Math.round(totalWait / hospital.departments.length)
      : 0;

    return { totalQueue, avgWait };
  };

  const handleBookClick = (hospitalId) => {
    navigate(`/book-ticket?hospital=${hospitalId}`);
  };

  // Framer Motion Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <PatientNavbar />

      {/* Hero Section / Page Header */}
      <section className="bg-slate-900 text-white py-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-teal-500 opacity-80" />
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-blue-800/80 text-blue-100 text-xs font-semibold uppercase tracking-wide border border-blue-700">
            SmartQueue Fictional Network
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Select a Partner Hospital
          </h1>
          <p className="text-slate-300 max-w-xl mx-auto text-sm">
            Discover clinical centers in your network, review live wait times, and reserve your queue slot remotely.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto pt-2">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by hospital name or location..."
                disabled={loading || error}
                className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 shadow-sm disabled:opacity-50"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hospital Listings Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow w-full">
        
        {loading ? (
          /* Animated Skeleton Loader Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map(idx => (
              <div 
                key={idx} 
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row animate-pulse"
              >
                <div className="md:w-1/3 bg-slate-200 min-h-[160px]" />
                <div className="p-6 flex-grow space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                  <div className="h-10 bg-slate-100 rounded w-full" />
                  <div className="space-y-1.5">
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                    <div className="flex gap-1.5 flex-wrap">
                      <div className="h-5 bg-slate-100 rounded w-14" />
                      <div className="h-5 bg-slate-100 rounded w-16" />
                      <div className="h-5 bg-slate-100 rounded w-12" />
                    </div>
                  </div>
                  <div className="h-8 bg-slate-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* API Connection Error State */
          <div className="text-center py-12 bg-white rounded-lg border border-red-200 shadow-sm max-w-md mx-auto p-8 space-y-4">
            <div className="h-12 w-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto text-red-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Failed to Load Clinics</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{error}</p>
            <button 
              onClick={fetchHospitalsList} 
              className="btn-primary py-2 px-6 text-xs font-semibold cursor-pointer shadow-sm"
            >
              Retry Connection
            </button>
          </div>
        ) : filteredHospitals.length === 0 ? (
          /* Empty Search State */
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200 shadow-sm max-w-md mx-auto p-8 space-y-3">
            <svg className="w-12 h-12 text-slate-300 mx-auto" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-sm font-bold text-slate-900">No Hospitals Found</h3>
            <p className="text-xs text-slate-500">Try adjusting your search criteria or review spelling.</p>
          </div>
        ) : (
          /* Hospitals Grid */
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {filteredHospitals.map((hospital) => {
              const { totalQueue, avgWait } = calculateHospitalStats(hospital);
              return (
                <motion.div
                  key={hospital.id}
                  variants={cardVariants}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row animate-fadeIn"
                >
                  {/* CSS Hospital Thumbnail / Graphic */}
                  <div className="md:w-1/3 bg-slate-900 relative min-h-[160px] flex items-center justify-center p-6 text-white shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-800 to-teal-700 opacity-80" />
                    <div className="relative z-10 text-center space-y-2">
                      <div className="h-12 w-12 rounded bg-white/10 border border-white/20 flex items-center justify-center mx-auto shadow">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-bold tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded">
                        {hospital.rating} ★ Rating
                      </span>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-6 flex-grow flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Hospital Name & Location */}
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
                          {hospital.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {hospital.location}
                        </p>
                      </div>

                      {/* Distance, Queue, Wait metrics - supporting future API integration */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-center">
                        <div className="space-y-1">
                          <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Distance</div>
                          <div className="text-xs font-bold text-slate-700 flex items-center justify-center gap-0.5">
                            <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            {hospital.distance}
                          </div>
                        </div>
                        <div className="space-y-1 border-x border-slate-200">
                          <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Active Queue</div>
                          <div className="text-xs font-bold text-slate-700 flex items-center justify-center gap-0.5">
                            <svg className="w-3 h-3 text-teal-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {totalQueue}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Avg Wait</div>
                          <div className="text-xs font-bold text-slate-700 flex items-center justify-center gap-0.5">
                            <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {avgWait}m
                          </div>
                        </div>
                      </div>

                      {/* Available Departments tags */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Departments Available</span>
                        <div className="flex flex-wrap gap-1.5">
                          {hospital.departments.map((dept) => (
                            <span 
                              key={dept.id} 
                              className="px-2 py-0.5 bg-slate-100 text-[10px] text-slate-600 font-semibold rounded border border-slate-200 hover:bg-slate-200 transition-colors"
                            >
                              {dept.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Book Action Button */}
                    <div className="pt-6 mt-auto">
                      <button
                        onClick={() => handleBookClick(hospital.id)}
                        className="btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 group cursor-pointer"
                      >
                        Book Queue Slot
                        <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>

      <PatientFooter />
    </div>
  );
};

export default Hospitals;
