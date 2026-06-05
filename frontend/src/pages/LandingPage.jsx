import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const LandingPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    facility: '',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const specialists = [
    {
      name: 'Dr. Amit Sharma',
      qualifications: 'MBBS, MD, DM (Cardiology)',
      specialty: 'Cardiology',
      experience: '18+ Years',
      image: '/doctor_portrait_male.png'
    },
    {
      name: 'Dr. Priya Sen',
      qualifications: 'MBBS, MD (Pediatrics)',
      specialty: 'Pediatrics',
      experience: '12+ Years',
      image: '/doctor_portrait_female.png'
    },
    {
      name: 'Dr. Rajesh Gupta',
      qualifications: 'MBBS, MS, MCh (Orthopedics)',
      specialty: 'Orthopedics',
      experience: '15+ Years',
      image: '/doctor_portrait_male.png'
    },
    {
      name: 'Dr. Sarah Jacob',
      qualifications: 'MBBS, MD, DM (Neurology)',
      specialty: 'Neurology',
      experience: '14+ Years',
      image: '/doctor_portrait_female.png'
    },
    {
      name: 'Dr. Ananya Roy',
      qualifications: 'MBBS, MD, DM (Nephrology)',
      specialty: 'Nephrology',
      experience: '10+ Years',
      image: '/doctor_portrait_female.png'
    },
    {
      name: 'Dr. Vikram Malhotra',
      qualifications: 'MBBS, MD, DM (Gastroenterology)',
      specialty: 'Gastroenterology',
      experience: '16+ Years',
      image: '/doctor_portrait_male.png'
    }
  ]

  const handleNext = () => {
    if (currentIndex < specialists.length - 4) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleContactSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => {
      setFormData({ name: '', email: '', facility: '', message: '' })
      setSubmitted(false)
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
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Hospital Systems</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#" className="hover:text-blue-700 transition-colors">Home</a>
            <a href="#why-choose-us" className="hover:text-blue-700 transition-colors">Why SmartQueue</a>
            <a href="#features" className="hover:text-blue-700 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-blue-700 transition-colors">Workflow</a>
            <a href="#departments" className="hover:text-blue-700 transition-colors">Departments</a>
            <a href="#contact" className="hover:text-blue-700 transition-colors">Contact</a>
          </nav>

          {/* Action Button */}
          <div className="flex items-center gap-4">
            <Link to="/login" className="btn-secondary py-1.5 px-4 text-xs font-semibold">
              Staff Login
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Full-Width Hero Banner */}
      <section className="relative bg-slate-900 text-white min-h-[500px] md:min-h-[580px] flex items-center">
        {/* Background Image with Dark Blue Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/hospital_lobby_reception.png" 
            alt="Hospital Reception" 
            className="w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-16 md:py-24">
          <div className="max-w-2xl space-y-6 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-blue-800/80 text-blue-100 text-xs font-semibold uppercase tracking-wide border border-blue-700">
              Clinical Flow Optimization
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white">
              Smarter Patient Queue Management
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              SmartQueue is an enterprise queue logistics engine built for high-capacity hospitals. Reduce lobby crowding, automate patient routing, and improve receptionist workflows.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <a href="#contact" className="btn-primary w-full sm:w-auto px-8 py-3 text-base">
                Book Demo
              </a>
              <Link to="/login" className="btn-secondary bg-transparent hover:bg-white/10 text-white border-white/30 w-full sm:w-auto px-8 py-3 text-base">
                Staff Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Why SmartQueue (Why Choose Us) */}
      <section id="why-choose-us" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold text-blue-700 uppercase tracking-widest">Why SmartQueue</h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              An Institutional Focus on Care Delivery
            </p>
            <p className="text-slate-600 text-sm">
              We design our software around traditional medical protocols, ensuring clinical security and auditability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white border border-slate-200 rounded-lg p-8 space-y-4 shadow-sm">
              <div className="h-10 w-10 bg-blue-50 text-blue-700 rounded flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-950">Patient Care Quality</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Keep patients relaxed with transparent, dynamic wait-time displays in waiting lounges and automated updates sent to family members.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-8 space-y-4 shadow-sm">
              <div className="h-10 w-10 bg-blue-50 text-blue-700 rounded flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-950">Resource Optimization</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Intelligently allocate patients to examination rooms and physicians dynamically to avoid clinic congestion during peak operational hours.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-8 space-y-4 shadow-sm">
              <div className="h-10 w-10 bg-blue-50 text-blue-700 rounded flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-950">HIPAA Compliant Security</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Ensure patient privacy and absolute security. Data transmission meets FHIR/HL7 guidelines, isolating clinical logs on secure host servers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Features Section */}
      <section id="features" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold text-blue-700 uppercase tracking-widest">Platform Core Features</h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Hospital-Grade Queue Logistics
            </p>
            <p className="text-slate-600 text-sm">
              A comprehensive system built for hospital administrators, receptionists, and medical practitioners.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card-container flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-10 w-10 bg-blue-50 text-blue-700 rounded flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-950">Central Reception Intake</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Fast patient registration and triage assessment interface designed for emergency and general OPD desk receptionists.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="card-container flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-10 w-10 bg-blue-50 text-blue-700 rounded flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-950">Triage Prioritization</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Configure custom priority tags (Emergency, Urgent, Routine) to automatically route critical patients to the front of check-in lists.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="card-container flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-10 w-10 bg-blue-50 text-blue-700 rounded flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-950">Analytics & SLA Reports</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Monitor patient dwell times, physician consultation speeds, and general department performance to meet hospital SLA metrics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Alternating Layout Section A: Clinic Technology */}
      <section className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* Image Left */}
          <div className="lg:col-span-6">
            <img 
              src="/doctor_reviewing_data.png" 
              alt="Doctor Reviewing Intake Details" 
              className="w-full h-auto rounded-lg border border-slate-200 shadow-sm object-cover max-h-[380px]"
            />
          </div>
          {/* Text Right */}
          <div className="lg:col-span-6 space-y-5">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              Clinically Integrated Doctor Terminals
            </h3>
            <p className="text-slate-600 text-base leading-relaxed">
              Our software links receptionist intake desks with physician consulting rooms. Doctors receive real-time, triaged list notifications directly on their secure console, allowing them to mark patient consults and call next appointments instantly.
            </p>
            <ul className="space-y-2.5 text-slate-700 text-sm font-medium">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Direct EHR data handshake
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Simple, single-click "Call Next Patient" operation
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Auditable consultation and session duration logs
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 6. Alternating Layout Section B: Patient Self Check-in */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* Text Left */}
          <div className="lg:col-span-6 space-y-5 order-2 lg:order-1">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              Self-Service Hospital Check-in Kiosks
            </h3>
            <p className="text-slate-600 text-base leading-relaxed">
              Empower patients to check in themselves upon arrival using clinical barcode scanners or registration terminals. The kiosk auto-syncs with the central server to print queue slips containing secure room assignment numbers.
            </p>
            <ul className="space-y-2.5 text-slate-700 text-sm font-medium">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Scan prescription bar-codes for rapid routing
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Clear, high-contrast instructions for clinical accessibility
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Reduces receptionist check-in bottlenecks by up to 50%
              </li>
            </ul>
          </div>
          {/* Image Right */}
          <div className="lg:col-span-6 order-1 lg:order-2">
            <img 
              src="/patient_self_checkin.png" 
              alt="Patient Checking in at self service kiosk" 
              className="w-full h-auto rounded-lg border border-slate-200 shadow-sm object-cover max-h-[380px]"
            />
          </div>
        </div>
      </section>

      {/* 7. Patient Queue Workflow Process */}
      <section id="workflow" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold text-blue-700 uppercase tracking-widest">Process Flow</h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Patient Queue Workflow
            </p>
            <p className="text-slate-600 text-sm">
              How SmartQueue structures outpatient flow during doctor consultations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Step 1 */}
            <div className="space-y-4 text-left">
              <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">Step 01</div>
              <h3 className="text-xl font-bold text-slate-950">Intake & Check-In</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Patient checks in at reception or kiosk. Receptionist logs patient ID, selects OPD department, and inputs vital parameters or emergency level.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-4 text-left">
              <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">Step 02</div>
              <h3 className="text-xl font-bold text-slate-950">Queue Allocation</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                SmartQueue algorithm reviews doctor load, typical patient pacing, and allocates patient to wait list, displaying anonymous ticket numbers on TV screens.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-4 text-left">
              <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">Step 03</div>
              <h3 className="text-xl font-bold text-slate-950">Consultation Call</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                The clinical doctor clicks "Next Patient" on their terminal. Waiting room displays audio-visually trigger to direct the patient to the matching room.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Department Showcase */}
      <section id="departments" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold text-blue-700 uppercase tracking-widest">Division Management</h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Clinical Department Integrations
            </p>
            <p className="text-slate-600 text-sm">
              Custom configurations templates matching special clinic setups.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <h4 className="text-base font-bold text-slate-950">Emergency & Triage</h4>
              <p className="text-slate-500 text-xs leading-relaxed">Prioritizes emergency cases immediately to the top of routing lists for first available physician.</p>
            </div>
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <h4 className="text-base font-bold text-slate-950">Cardiology & Medicine</h4>
              <p className="text-slate-500 text-xs leading-relaxed">Includes average check-in buffers for ECG processing before directing to consultation.</p>
            </div>
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <h4 className="text-base font-bold text-slate-950">Radiology & Labs</h4>
              <p className="text-slate-500 text-xs leading-relaxed">Tracks imaging machine pacing and coordinates waiting seats based on machine availability.</p>
            </div>
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <h4 className="text-base font-bold text-slate-950">OPD Pharmacy</h4>
              <p className="text-slate-500 text-xs leading-relaxed">Fast-moving medicine ticket checkouts linking counters with prescription database verification.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Meet Our Medical Specialists Section */}
      <section className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-blue-700 uppercase tracking-widest">Medical Excellence</h2>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight">Meet Our Medical Specialists</p>
              <p className="text-slate-600 text-sm">Dedicated physicians managing complex patient care and queue pacing across divisions.</p>
            </div>
            {/* Carousel Buttons (Visible on desktop) */}
            <div className="hidden md:flex items-center gap-3">
              <button 
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="h-10 w-10 rounded border border-slate-300 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Previous specialists"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button 
                type="button"
                onClick={handleNext}
                disabled={currentIndex >= specialists.length - 4}
                className="h-10 w-10 rounded border border-slate-300 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Next specialists"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Desktop Grid Layout (4 visible) */}
          <div className="hidden md:grid grid-cols-4 gap-6">
            {specialists.slice(currentIndex, currentIndex + 4).map((doc, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded p-5 flex flex-col justify-between shadow-sm hover:shadow hover:-translate-y-1 hover:border-slate-300 transition-all duration-200">
                <div className="space-y-4">
                  <img 
                    src={doc.image} 
                    alt={doc.name} 
                    className="w-full h-48 object-cover rounded bg-slate-100"
                  />
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full inline-block uppercase tracking-wider">{doc.specialty}</span>
                    <h3 className="font-bold text-slate-900 text-base leading-tight">{doc.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{doc.qualifications}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Experience:</span>
                  <span className="text-slate-900">{doc.experience}</span>
                </div>
                <a href="#contact" className="btn-secondary py-1.5 w-full text-xs font-semibold mt-4 text-center">
                  Book Appointment
                </a>
              </div>
            ))}
          </div>

          {/* Mobile / Tablet Scrollable Layout */}
          <div className="flex md:hidden overflow-x-auto pb-4 gap-6 scrollbar-none snap-x snap-mandatory">
            {specialists.map((doc, idx) => (
              <div key={idx} className="min-w-[280px] snap-start bg-white border border-slate-200 rounded p-5 flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                  <img 
                    src={doc.image} 
                    alt={doc.name} 
                    className="w-full h-48 object-cover rounded bg-slate-100"
                  />
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full inline-block uppercase tracking-wider">{doc.specialty}</span>
                    <h3 className="font-bold text-slate-900 text-base leading-tight">{doc.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{doc.qualifications}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Experience:</span>
                  <span className="text-slate-900">{doc.experience}</span>
                </div>
                <a href="#contact" className="btn-secondary py-1.5 w-full text-xs font-semibold mt-4 text-center">
                  Book Appointment
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Operational Statistics (Apollo / Peerless Style) */}
      <section className="py-20 bg-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="space-y-2">
              <div className="text-4xl sm:text-5xl font-extrabold text-blue-100">45%</div>
              <div className="text-sm font-semibold text-blue-200 uppercase tracking-wider">Average Wait-Time Reduction</div>
              <p className="text-slate-300 text-xs leading-normal max-w-xs mx-auto">Verified average patient dwell reduction after clinical site deployment.</p>
            </div>
            <div className="space-y-2">
              <div className="text-4xl sm:text-5xl font-extrabold text-blue-100">10,000+</div>
              <div className="text-sm font-semibold text-blue-200 uppercase tracking-wider">Patients Routed Daily</div>
              <p className="text-slate-300 text-xs leading-normal max-w-xs mx-auto">Active check-ins managed smoothly across partner clinical facilities.</p>
            </div>
            <div className="space-y-2">
              <div className="text-4xl sm:text-5xl font-extrabold text-blue-100">99.8%</div>
              <div className="text-sm font-semibold text-blue-200 uppercase tracking-wider">Routing Accuracy Rate</div>
              <p className="text-slate-300 text-xs leading-normal max-w-xs mx-auto">Accurate patient file assignments to scheduled clinical doctors.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Clinical Testimonials */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-xs font-bold text-blue-700 uppercase tracking-widest">Institutional Reviews</h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Trusted by Healthcare Professionals
            </p>
          </div>

          <div className="space-y-8">
            <div className="p-8 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
              <p className="text-slate-600 text-base leading-relaxed italic">
                "SmartQueue completely changed our OPD floor management. Patient wait-room crowding has declined by 50%, and our doctors can pacing consultations without any receptionist interference."
              </p>
              <div className="flex justify-between items-center text-sm">
                <div>
                  <h4 className="font-bold text-slate-950">Dr. Ranjan Sengupta</h4>
                  <p className="text-slate-500 text-xs">Medical Director, Central Cardiology Unit</p>
                </div>
                <span className="text-xs font-bold text-blue-700">Fortis Partner Site</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. Contact / Demo Booking Section */}
      <section id="contact" className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-xs font-bold text-blue-700 uppercase tracking-widest">Inquiries & Demonstrations</h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Request a Clinical Consultation
            </p>
            <p className="text-slate-600 text-sm max-w-xl mx-auto">
              Coordinate with a SmartQueue implementation engineer to evaluate your facility check-in requirements and request pricing models.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-8 sm:p-10 shadow-sm">
            {submitted ? (
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
                    <label htmlFor="name" className="input-label"> Clinical Coordinator Name </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="Dr. Amit Sen"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="input-label"> Hospital Email Address </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="a.sen@peerlesshospital.org"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="facility" className="input-label"> Hospital / Healthcare Facility Name </label>
                  <input
                    id="facility"
                    name="facility"
                    type="text"
                    required
                    value={formData.facility}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Peerless Central Hospital, Kolkata"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="input-label"> Operational Inquiry Message </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    required
                    value={formData.message}
                    onChange={handleInputChange}
                    className="input-field resize-none"
                    placeholder="Please detail your clinic queue bottlenecks, integration concerns, or database synchronization concerns…"
                  />
                </div>

                <button type="submit" className="btn-primary w-full py-3 text-base">
                  Submit Formal Demonstration Request
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 12. Professional Footer */}
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
              <span className="text-base font-bold tracking-tight">SmartQueue Systems</span>
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
