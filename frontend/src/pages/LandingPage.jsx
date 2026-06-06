import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MOCK_HOSPITALS, MOCK_DEPARTMENTS_STATS, getTicketDetails } from '../api/mockData'

const LandingPage = () => {
  const navigate = useNavigate()

  // Booking Search Widget State
  const [searchHospital, setSearchHospital] = useState('')
  const [searchDept, setSearchDept] = useState('')
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [bookedTicket, setBookedTicket] = useState(null)

  // Live Ticket Tracker State
  const [trackerInput, setTrackerInput] = useState('')
  const [trackedTicket, setTrackedTicket] = useState(null)
  const [trackerError, setTrackerError] = useState(null)

  // Contact Form State
  const [contactData, setContactData] = useState({
    name: '',
    email: '',
    facility: '',
    message: ''
  })
  const [contactSubmitted, setContactSubmitted] = useState(false)

  // Demo Hospitals & Departments from mock data
  const partnerHospitals = MOCK_HOSPITALS
  const departmentsList = Object.keys(MOCK_DEPARTMENTS_STATS)

  const handleBookingSubmit = (e) => {
    e.preventDefault()
    if (!searchHospital || !searchDept) return
    navigate(`/book-ticket?hospital=${searchHospital}&department=${searchDept}`)
  }

  const handleTrackerSubmit = (e) => {
    e.preventDefault()
    setTrackerError(null)
    setTrackedTicket(null)

    if (!trackerInput) return

    const cleanInput = trackerInput.trim().toUpperCase()
    const ticketDetails = getTicketDetails(cleanInput)
    if (ticketDetails) {
      navigate(`/queue-status/${cleanInput}`)
    } else {
      setTrackerError('Ticket ID not found. Verify formatting (e.g. CAR-102) or book a new ticket.')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setContactData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleContactSubmit = (e) => {
    e.preventDefault()
    setContactSubmitted(true)
    setTimeout(() => {
      setContactData({ name: '', email: '', facility: '', message: '' })
      setContactSubmitted(false)
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans scroll-smooth">
      
      {/* 1. Sticky Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-blue-700 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 block leading-tight">SmartQueue</span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Patient Platform</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <Link to="/" className="hover:text-blue-700 transition-colors">Home</Link>
            <Link to="/hospitals" className="hover:text-blue-700 transition-colors">Find Hospitals</Link>
            <Link to="/book-ticket" className="hover:text-blue-700 transition-colors">Book Queue</Link>
            <a href="#why-smartqueue" className="hover:text-blue-700 transition-colors">Why SmartQueue</a>
            <a href="#tracker" className="hover:text-blue-700 transition-colors">Track Status</a>
            <a href="#contact" className="hover:text-blue-700 transition-colors">Hospital Partnerships</a>
          </nav>

          {/* Action Button */}
          <div className="flex items-center gap-4">
            <Link to="/login" className="btn-secondary py-1.5 px-4 text-xs font-semibold">
              Staff Portal
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section: Hospital Discovery & Booking */}
      <section className="relative bg-slate-900 text-white min-h-[550px] md:min-h-[620px] flex items-center">
        {/* Background Image with Dark Blue Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/hospital_lobby_reception.png" 
            alt="Hospital Check-in lobby" 
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/95 to-slate-950/70" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Left Text */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-blue-800/80 text-blue-100 text-xs font-semibold uppercase tracking-wide border border-blue-700">
              Online Queue Token System
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white">
              Book your hospital queue online and reduce waiting time.
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              Skip the crowded waiting rooms. Search partner hospitals near you, select clinical departments, secure your digital queue ticket, and monitor your token status live on your phone.
            </p>
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-xs text-slate-400 font-medium pt-2">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Secure Queue Tracking
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                AI Department Guidance
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Verified Hospital Partners
              </span>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white text-slate-900 border border-slate-200 rounded-lg p-6 sm:p-8 shadow-xl w-full max-w-md mx-auto">
            <form onSubmit={handleBookingSubmit} className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-slate-950 tracking-tight">Book Queue Ticket</h3>
                <p className="text-xs text-slate-500 mt-0.5">Secure your digital placement at partner clinics.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="hospital" className="input-label">Select Hospital</label>
                  <select
                    id="hospital"
                    required
                    value={searchHospital}
                    onChange={(e) => setSearchHospital(e.target.value)}
                    className="input-field cursor-pointer bg-white"
                  >
                    <option value="">-- Choose Partner Facility --</option>
                    {partnerHospitals.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="department" className="input-label">Select Department</label>
                  <select
                    id="department"
                    required
                    value={searchDept}
                    onChange={(e) => setSearchDept(e.target.value)}
                    className="input-field cursor-pointer bg-white"
                  >
                    <option value="">-- Choose Medical Division --</option>
                    {departmentsList.map((d, i) => (
                      <option key={i} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-3 text-sm font-bold">
                Generate Queue Ticket
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 3. Placeholder Partner Hospitals Bar */}
      <section className="bg-slate-50 border-b border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Demo Facility Network (Placeholder Instances Only)</p>
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-2 text-sm font-bold text-slate-500">
            <span>Hope Medical Center (Demo)</span>
            <span className="text-slate-300">•</span>
            <span>Metro General Hospital (Demo)</span>
            <span className="text-slate-300">•</span>
            <span>Apex Health Clinic (Demo)</span>
            <span className="text-slate-300">•</span>
            <span>Valley Care Systems (Demo)</span>
          </div>
        </div>
      </section>

      {/* 4. Why SmartQueue (Value Proposition) */}
      <section id="why-smartqueue" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold text-blue-700 uppercase tracking-widest">Why Choose SmartQueue</h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Smarter Wait Times, Better Outpatient Care
            </p>
            <p className="text-slate-600 text-sm">
              We replace standard physical wait lists with secure, digital token streams that you can monitor from anywhere.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-slate-50 border border-slate-200 rounded-lg space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-10 w-10 bg-blue-50 text-blue-700 rounded flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-950">Zero Waiting Rooms</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Stay at home, relax in a nearby cafe, or run errands. Only arrive at the clinical department when the live ticket counter shows your turn is approaching.
              </p>
            </div>

            <div className="p-8 bg-slate-50 border border-slate-200 rounded-lg space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-10 w-10 bg-blue-50 text-blue-700 rounded flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-950">Real-time Progress Tracker</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Follow clinical wait movements instantly on your phone. Our dashboard displays the current ticket number being served and estimated consultation pacing.
              </p>
            </div>

            <div className="p-8 bg-slate-50 border border-slate-200 rounded-lg space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-10 w-10 bg-blue-50 text-blue-700 rounded flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-950">Intelligent Department Selection</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Not sure where to book? Our integrated symptom helper guides you to the correct department (such as Pediatrics or Cardiology) without diagnosing symptoms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Performance Statistics */}
      <section className="py-16 bg-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 text-center">
            <div className="space-y-2">
              <div className="text-4xl sm:text-5xl font-black text-blue-100">150,000+</div>
              <div className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Tickets Generated</div>
              <p className="text-slate-300 text-xs leading-normal max-w-xs mx-auto">Outpatients safely routed without sitting in physical lines.</p>
            </div>
            <div className="space-y-2">
              <div className="text-4xl sm:text-5xl font-black text-blue-100">50+</div>
              <div className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Hospitals Connected</div>
              <p className="text-slate-300 text-xs leading-normal max-w-xs mx-auto">Mock partner hospitals and clinics within our simulator network.</p>
            </div>
            <div className="space-y-2">
              <div className="text-4xl sm:text-5xl font-black text-blue-100">45%</div>
              <div className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Waiting Time Reduction</div>
              <p className="text-slate-300 text-xs leading-normal max-w-xs mx-auto">Average decrease in physical outpatient lobby congestion.</p>
            </div>
            <div className="space-y-2">
              <div className="text-4xl sm:text-5xl font-black text-blue-100">98.4%</div>
              <div className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Satisfaction Rate</div>
              <p className="text-slate-300 text-xs leading-normal max-w-xs mx-auto">Verified patient satisfaction score from post-visit surveys.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. How It Works (Workflow Section) */}
      <section id="workflow" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold text-blue-700 uppercase tracking-widest">Workflow</h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Booking Your Queue Token in 4 Steps
            </p>
            <p className="text-slate-600 text-sm">
              Our clinical booking platform simplifies patient check-in procedures.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">Step 01</div>
              <h3 className="text-lg font-bold text-slate-950">Find Hospital</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Search our index of verified partner hospitals and clinical centers near your current location.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">Step 02</div>
              <h3 className="text-lg font-bold text-slate-950">Choose Department</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Select the clinical department you need and check live wait statuses to select the best time.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">Step 03</div>
              <h3 className="text-lg font-bold text-slate-950">Generate Queue Ticket</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Secure your digital token instantly on your phone. No physical slips or standing in lobby lines.
              </p>
            </div>

            {/* Step 4 */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">Step 04</div>
              <h3 className="text-lg font-bold text-slate-950">Arrive Just-In-Time</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Monitor live queue pacing from anywhere and walk into the examination room exactly when your token is called.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SmartQueue AI Triage Assistant Section (Symptom Department Guidance Focus) */}
      <section id="ai-assistant" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* Text Left */}
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-teal-50 text-teal-800 text-xs font-semibold uppercase tracking-wide border border-teal-100">
              Department & Queue Assistant
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              SmartQueue AI Assistant: Your Department & Queue Guide
            </h3>
            <p className="text-slate-600 text-base leading-relaxed">
              Need help finding the right department or checking queue availability? The SmartQueue AI Assistant helps guide you to the correct department (e.g., matching common queries like skin irritation to *Dermatology* or joint pain to *Orthopedics*) and assists with hospital discovery and ticket status checks. **It is not a medical diagnosis tool.**
            </p>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 font-medium">
              ⚠️ **General Platform Notice**: The AI assistant is configured strictly for clinic routing, hospital discovery, and queue status checks. It does not provide medical diagnoses, clinical opinions, treatments, or prescription recommendations. For any medical emergency or diagnostic needs, please consult a healthcare professional.
            </div>
            <ul className="space-y-2.5 text-slate-700 text-sm font-medium">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-700 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Find correct medical division instantly
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-700 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Track live department wait times
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-700 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Locate nearest placeholder clinic supporting your concerns
              </li>
            </ul>
          </div>

          {/* Chat Mockup Right */}
          <div className="lg:col-span-6 bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm max-w-md mx-auto w-full">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-xs">
              {/* Header */}
              <div className="bg-slate-900 px-4 py-3 text-white flex justify-between items-center">
                <span className="font-bold uppercase tracking-wider">Queue & Department Guide (Demo)</span>
                <span className="text-[10px] text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded">Queue Assistant</span>
              </div>
              {/* Chat Area */}
              <div className="p-4 space-y-4">
                <div className="flex gap-2.5 items-start">
                  <div className="h-7 w-7 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0">AI</div>
                  <div className="bg-slate-100 text-slate-700 p-3 rounded-r-lg rounded-bl-lg max-w-[85%] leading-relaxed font-medium">
                    Hello! I can help you find partner hospitals, identify the correct department for booking, and check active wait list statistics. How can I assist you with your queue query today?
                  </div>
                </div>
                <div className="flex gap-2.5 items-start justify-end">
                  <div className="bg-blue-600 text-white p-3 rounded-l-lg rounded-br-lg max-w-[85%] leading-relaxed font-medium">
                    I have joint pain and need to check a doctor. Which department should I book a slot in?
                  </div>
                  <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0">PT</div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <div className="h-7 w-7 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0">AI</div>
                  <div className="bg-slate-100 text-slate-700 p-3 rounded-r-lg rounded-bl-lg max-w-[85%] leading-relaxed font-medium space-y-2">
                    <p>For joint-related queries, you should book a ticket in the **Orthopedics** department.</p>
                    <p>I found **Hope Medical Center (Demo)** nearby. There are currently 2 patients in the Orthopedics queue. The estimated wait is 15 minutes. Would you like to generate a queue ticket?</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Live Queue Status Tracker Showcase */}
      <section id="tracker" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* Left: Interactive Tracker Form */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-sm max-w-sm mx-auto w-full order-2 lg:order-1">
            <form onSubmit={handleTrackerSubmit} className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-950">Live Token Tracker</h3>
                <p className="text-xs text-slate-500">Input your Ticket ID to check queue status.</p>
              </div>

              <div>
                <label htmlFor="trackerInput" className="input-label">Ticket ID</label>
                <input
                  id="trackerInput"
                  type="text"
                  required
                  value={trackerInput}
                  onChange={(e) => setTrackerInput(e.target.value)}
                  className="input-field"
                  placeholder="e.g. CARD-109, PEDI-112"
                />
              </div>

              {trackerError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-100 p-2.5 rounded font-medium">{trackerError}</div>
              )}

              <button type="submit" className="btn-primary w-full py-2.5 text-xs font-semibold">
                Track Ticket Status
              </button>
            </form>

            {/* Tracker Result Output */}
            {trackedTicket && (
              <div className="mt-5 pt-5 border-t border-slate-100 space-y-3 text-xs leading-normal animate-fadeIn">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Hospital</span>
                  <span className="text-slate-950 font-bold">{trackedTicket.hospital}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Department</span>
                  <span className="text-slate-950 font-bold">{trackedTicket.department}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Your Token No.</span>
                  <span className="text-blue-700 font-black">{trackedTicket.ticketId}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Currently Serving</span>
                  <span className="text-slate-900 font-bold">{trackedTicket.servingNumber}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Est. Wait Time</span>
                  <span className="text-slate-900 font-bold">{trackedTicket.estWait}</span>
                </div>
                <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded text-center font-bold">
                  {trackedTicket.status}
                </div>
              </div>
            )}
          </div>

          {/* Right: Explanatory text + mockup */}
          <div className="lg:col-span-7 space-y-5 order-1 lg:order-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              Track Wait Status Live on Your Mobile Device
            </h3>
            <p className="text-slate-600 text-base leading-relaxed">
              Once you book a digital queue token on SmartQueue, you can access your wait progress dashboard in real time. We log doctor check-ins, room transitions, and patient calling sequences automatically to estimate precise arrival times.
            </p>
            <div className="p-5 bg-white border border-slate-200 rounded-lg flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-700 rounded">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Example Live Ticket</div>
                  <div className="text-sm font-bold text-slate-900">CAR-109 (Cardiology)</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Est. Wait</div>
                <div className="text-sm font-bold text-blue-700">12 minutes</div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* 9. Departments Showcase */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold text-blue-700 uppercase tracking-widest">Clinical Support</h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Clinical Department Availability
            </p>
            <p className="text-slate-600 text-sm">
              We coordinate queue tickets for all major clinical specialties.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg space-y-2 hover:border-slate-300 transition-colors">
              <h4 className="text-base font-bold text-slate-950">Cardiology & Vascular</h4>
              <p className="text-slate-500 text-xs leading-relaxed">Book outpatient ECG/doctor consult lists. Queue priority configured dynamically.</p>
            </div>
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg space-y-2 hover:border-slate-300 transition-colors">
              <h4 className="text-base font-bold text-slate-950">Pediatric Care</h4>
              <p className="text-slate-500 text-xs leading-relaxed">Integrated sibling booking features and check-in parameters for infant care rooms.</p>
            </div>
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg space-y-2 hover:border-slate-300 transition-colors">
              <h4 className="text-base font-bold text-slate-950">Radiology Imaging</h4>
              <p className="text-slate-500 text-xs leading-relaxed">Track scan-room pacing (MRI/CT scans) and arrive when machine is ready.</p>
            </div>
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg space-y-2 hover:border-slate-300 transition-colors">
              <h4 className="text-base font-bold text-slate-950">General OPD</h4>
              <p className="text-slate-500 text-xs leading-relaxed">Standard consultation queues for primary medical consultations and prescriptions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Patient Testimonials */}
      <section className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-blue-700 uppercase tracking-widest">Patient Reviews</h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">Saving Hours in the Waiting Room</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-8 text-left space-y-4 shadow-sm max-w-2xl mx-auto">
            <p className="text-slate-600 text-base leading-relaxed italic">
              "SmartQueue completely changed my hospital visit. Instead of sitting for 2 hours in a packed lobby, I booked my token from home, followed the wait tracker on my phone, and arrived 5 minutes before my appointment. I was seen immediately."
            </p>
            <div>
              <h4 className="font-bold text-slate-950 text-sm">Sunita Mukherjee</h4>
              <p className="text-slate-500 text-xs">Patient at Hope Medical Center (Demo Site)</p>
            </div>
          </div>
        </div>
      </section>

      {/* 11. Hospital Partnerships (Contact Form) */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-xs font-bold text-blue-700 uppercase tracking-widest">Clinic Partnerships</h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Integrate SmartQueue in Your Facility
            </p>
            <p className="text-slate-600 text-sm max-w-xl mx-auto">
              Are you a hospital director or clinic IT administrator? Partner with SmartQueue to reduce waiting congestion and optimize physician workflows.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 sm:p-10 shadow-sm">
            {contactSubmitted ? (
              <div className="p-8 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-center space-y-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-emerald-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-bold">Inquiry Transmitted Successfully</h3>
                <p className="text-sm">A SmartQueue systems engineer will contact your clinical IT department shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="input-label">Clinical Contact Name</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={contactData.name}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="Dr. Amit Sen"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="input-label">Hospital Email Address</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={contactData.email}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="a.sen@hospital-network.org"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="facility" className="input-label">Hospital / Clinic Facility Name</label>
                  <input
                    id="facility"
                    name="facility"
                    type="text"
                    required
                    value={contactData.facility}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Grand Central Hospital, OPD Desk"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="input-label">Operational Inquiry Message</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    required
                    value={contactData.message}
                    onChange={handleInputChange}
                    className="input-field resize-none"
                    placeholder="Detail your queue requirements, patient flow volumes, or current check-in issues…"
                  />
                </div>

                <button type="submit" className="btn-primary w-full py-3 text-base">
                  Request Partnership Callback
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 12. Institutional Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
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
              Enterprise clinical patient flow routing and queue status logistics software built for high-capacity medical nodes.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[10px]">Staff Links</h4>
            <ul className="space-y-2 text-[11px]">
              <li><Link to="/login" className="hover:text-white transition-colors">Clinical Portal Login</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Register Clinic Node</Link></li>
              <li><a href="#workflow" className="hover:text-white transition-colors">Workflow Structure</a></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[10px]">Clinics Serviced</h4>
            <ul className="space-y-2 text-[11px] text-slate-500">
              <li>Emergency Trauma Triage</li>
              <li>Cardiology Consulting Rooms</li>
              <li>Pediatrics & Neonatal divisions</li>
              <li>Radiology Imaging Worklists</li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[10px]">Compliance Certifications</h4>
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500">
                Patient records transmission utilizes SSL cryptographic handshakes matching HIPAA guidelines.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700 text-[9px] uppercase">HIPAA Compliant</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700 text-[9px] uppercase">ISO 27001 Certified</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700 text-[9px] uppercase">SSL SECURE</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-center text-slate-600 text-[11px] flex flex-col sm:flex-row justify-between items-center gap-4">
          <span>&copy; {new Date().getFullYear()} SmartQueue Systems. All Rights Reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">Facility Privacy SLA</a>
            <a href="#" className="hover:text-white">Hospital Data Agreement</a>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default LandingPage
