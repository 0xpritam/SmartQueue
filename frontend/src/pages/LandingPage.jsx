import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const LandingPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    facility: '',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)

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

  // Animation Variants (Subtle, Clean Clinical Easing)
  const fadeInUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } // standard clinical ease-in-out
    }
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  }

  const cardHover = {
    y: -3,
    borderColor: '#cbd5e1', // slate-300
    boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.04)'
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans scroll-smooth">
      
      {/* 1. Sticky Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">SmartQueue</span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Clinical Workflow</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#departments" className="hover:text-blue-600 transition-colors">Departments</a>
            <a href="#workflow" className="hover:text-blue-600 transition-colors">Triage Workflow</a>
            <a href="#showcase" className="hover:text-blue-600 transition-colors">Console Preview</a>
            <a href="#contact" className="hover:text-blue-600 transition-colors">Inquiries</a>
          </nav>

          {/* Action Button */}
          <div className="flex items-center gap-4">
            <Link to="/login" className="btn-secondary hidden sm:inline-flex py-2">
              Staff Portal
            </Link>
            <motion.div whileTap={{ scale: 0.98 }}>
              <Link to="/login" className="btn-primary py-2 px-4.5">
                Access SmartQueue
              </Link>
            </motion.div>
          </div>
        </div>
      </header>

      {/* 2. Hero Section (Soft Healthcare Gradient Background) */}
      <section className="relative bg-gradient-to-b from-blue-50/40 via-white to-slate-50 border-b border-slate-200 py-20 md:py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* Left Text */}
          <motion.div 
            className="lg:col-span-6 space-y-6 text-center lg:text-left"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wide">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
              Enterprise Hospital Technology
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Intelligent Outpatient Flow for Modern Hospitals
            </h1>
            <p className="text-slate-600 text-lg leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Streamline patient triage, automate clinic assignment, and decrease patient friction. Built for clinical operators, receptionists, and physicians.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <motion.div whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <Link to="/login" className="btn-primary w-full sm:w-auto px-8 py-3 text-base">
                  Clinical Sign In
                </Link>
              </motion.div>
              <motion.div whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <Link to="/register" className="btn-secondary w-full sm:w-auto px-8 py-3 text-base">
                  Register New Facility
                </Link>
              </motion.div>
            </div>
            <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-x-8 gap-y-3 justify-center lg:justify-start text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                HIPAA Certified Database
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                HL7 / FHIR Integrated
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ISO 27001 Infrastructure
              </span>
            </div>
          </motion.div>

          {/* Right Mockup Display (Subtle Entrance) */}
          <motion.div 
            className="lg:col-span-6 bg-slate-100 border border-slate-200 rounded-xl p-5 shadow-sm max-w-lg mx-auto w-full"
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              {/* Fake Patient Screen Header */}
              <div className="bg-slate-900 px-4 py-3 flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-bold uppercase tracking-wider">Outpatient Status Monitor</span>
                </div>
                <span className="text-xs text-slate-400">Cardiology & Medicine</span>
              </div>
              {/* Fake Patient List Display Table */}
              <div className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-medium border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                        <th className="py-2.5">Ticket</th>
                        <th className="py-2.5">Physician</th>
                        <th className="py-2.5">Room</th>
                        <th className="py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-3 font-bold text-blue-600">C-102</td>
                        <td className="py-3">Dr. Priya Sharma</td>
                        <td className="py-3">Room 4</td>
                        <td className="py-3 text-right">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">Calling</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 font-bold text-blue-600">C-103</td>
                        <td className="py-3">Dr. A. Chowdhury</td>
                        <td className="py-3">Room 2</td>
                        <td className="py-3 text-right">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">In Progress</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 font-bold text-blue-600">C-104</td>
                        <td className="py-3">Dr. Priya Sharma</td>
                        <td className="py-3">Room 4</td>
                        <td className="py-3 text-right">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium">Waiting (3m)</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 font-bold text-blue-600">M-215</td>
                        <td className="py-3">Dr. Sarah Jacob</td>
                        <td className="py-3">Room 7</td>
                        <td className="py-3 text-right">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium">Waiting (8m)</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. Features Section (Smooth Reveal) */}
      <motion.section 
        id="features" 
        className="py-24 border-b border-slate-200"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-120px" }}
        variants={fadeInUp}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Platform Core Features</h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Orchestrate Outpatient Flows Seamlessly
            </p>
            <p className="text-slate-600 text-sm max-w-2xl mx-auto">
              SmartQueue is designed directly around typical clinical triage and facility scheduling structures, offering clean controls and total data auditability.
            </p>
          </div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={staggerContainer}
          >
            {/* Feature 1 */}
            <motion.div 
              className="card-container flex flex-col justify-between"
              variants={fadeInUp}
              whileHover={cardHover}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-4">
                <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Dynamic Patient Routing</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Automatically allocate arrived patients to matching triage departments and assign rooms relative to current physician pacing.
                </p>
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              className="card-container flex flex-col justify-between"
              variants={fadeInUp}
              whileHover={cardHover}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-4">
                <div className="h-10 w-10 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Clinical Wait-Board Screens</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Provide crisp, clear queue calls on television displays in waiting lounges, keeping patients informed without exposing HIPAA-protected names.
                </p>
              </div>
            </motion.div>

            {/* Feature 3 */}
            <motion.div 
              className="card-container flex flex-col justify-between"
              variants={fadeInUp}
              whileHover={cardHover}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-4">
                <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Hospital Load Analytics</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Identify bottle-neck clinics, analyze average consultation times, and adjust clinic staffing dynamically during peak patient loads.
                </p>
              </div>
            </motion.div>

            {/* Feature 4 */}
            <motion.div 
              className="card-container flex flex-col justify-between"
              variants={fadeInUp}
              whileHover={cardHover}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-4">
                <div className="h-10 w-10 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Audit-Ready Compliance</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Keep clinical data isolated and secure. Access logs are continuously recorded to exceed facility information hygiene standards.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* 4. Departments Section (Subtle Scroll Reveal) */}
      <motion.section 
        id="departments" 
        className="py-24 bg-white border-b border-slate-200"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-120px" }}
        variants={fadeInUp}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Departmental Load</h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Pre-Configured Medical Division Templates
            </p>
            <p className="text-slate-600 text-sm">
              Deploy custom, configured triage prioritization settings across common clinic setups.
            </p>
          </div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"
            variants={staggerContainer}
          >
            {/* Card 1 */}
            <motion.div 
              className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
              variants={fadeInUp}
              whileHover={cardHover}
              transition={{ duration: 0.2 }}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded">High Load</span>
              <h4 className="text-base font-bold text-slate-900 pt-1">Cardiology</h4>
              <p className="text-slate-500 text-xs leading-normal">Integrated ECG status routing with prioritize-first patient profiles.</p>
              <div className="text-xs font-semibold text-slate-700 pt-2 border-t border-slate-200 flex justify-between">
                <span>Avg. Visit:</span>
                <span className="text-blue-600">18 min</span>
              </div>
            </motion.div>

            {/* Card 2 */}
            <motion.div 
              className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
              variants={fadeInUp}
              whileHover={cardHover}
              transition={{ duration: 0.2 }}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">Stable</span>
              <h4 className="text-base font-bold text-slate-900 pt-1">Pediatrics</h4>
              <p className="text-slate-500 text-xs leading-normal">Child-friendly monitor layouts with automated siblings grouping features.</p>
              <div className="text-xs font-semibold text-slate-700 pt-2 border-t border-slate-200 flex justify-between">
                <span>Avg. Visit:</span>
                <span className="text-blue-600">12 min</span>
              </div>
            </motion.div>

            {/* Card 3 */}
            <motion.div 
              className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
              variants={fadeInUp}
              whileHover={cardHover}
              transition={{ duration: 0.2 }}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded">High Load</span>
              <h4 className="text-base font-bold text-slate-900 pt-1">Radiology</h4>
              <p className="text-slate-500 text-xs leading-normal">Linked MRI/CT scans wait tracking integrated directly with imaging technicians.</p>
              <div className="text-xs font-semibold text-slate-700 pt-2 border-t border-slate-200 flex justify-between">
                <span>Avg. Visit:</span>
                <span className="text-blue-600">22 min</span>
              </div>
            </motion.div>

            {/* Card 4 */}
            <motion.div 
              className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
              variants={fadeInUp}
              whileHover={cardHover}
              transition={{ duration: 0.2 }}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">Stable</span>
              <h4 className="text-base font-bold text-slate-900 pt-1">Pharmacy</h4>
              <p className="text-slate-500 text-xs leading-normal">Prescription verification workflows with rapid ticket calling for medicine collection.</p>
              <div className="text-xs font-semibold text-slate-700 pt-2 border-t border-slate-200 flex justify-between">
                <span>Avg. Visit:</span>
                <span className="text-blue-600">4 min</span>
              </div>
            </motion.div>

            {/* Card 5 */}
            <motion.div 
              className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
              variants={fadeInUp}
              whileHover={cardHover}
              transition={{ duration: 0.2 }}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">Optimal</span>
              <h4 className="text-base font-bold text-slate-900 pt-1">General Medicine</h4>
              <p className="text-slate-500 text-xs leading-normal">Optimized patient triage mapping matching doctor specialists with primary diagnoses.</p>
              <div className="text-xs font-semibold text-slate-700 pt-2 border-t border-slate-200 flex justify-between">
                <span>Avg. Visit:</span>
                <span className="text-blue-600">10 min</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* 5. How It Works Section */}
      <motion.section 
        id="workflow" 
        className="py-24 border-b border-slate-200"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-120px" }}
        variants={fadeInUp}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Triage Flow</h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Operational Patient Flow in 3 Steps
            </p>
            <p className="text-slate-600 text-sm">
              Standard clinical procedure simplified to prevent queues and optimize check-in.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="space-y-4 text-center md:text-left">
              <div className="h-10 w-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg mx-auto md:mx-0 shadow-sm shadow-blue-500/10">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900">Arrive & Register</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                The receptionist inputs the patient's ID and clinical division. Triage prioritization is assigned by emergency parameters.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-4 text-center md:text-left">
              <div className="h-10 w-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg mx-auto md:mx-0 shadow-sm shadow-blue-500/10">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900">Dynamic Queue Allocation</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                The core queue engine reviews doctor queues, pacing, and assigns the patient to the optimal wait room, printing a secure ticket number.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-4 text-center md:text-left">
              <div className="h-10 w-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg mx-auto md:mx-0 shadow-sm shadow-blue-500/10">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900">Direct Physician Call</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                The doctor calls the next patient via their console. The waiting lounge board displays the ticket number, guiding the patient to the room.
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 6. Queue Console Showcase Section (Premium Layout Upgrade) */}
      <motion.section 
        id="showcase" 
        className="py-24 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-120px" }}
        variants={fadeInUp}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Clinical Dashboard</h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              A Dashboard Made for Daily Practice
            </p>
            <p className="text-slate-600 text-sm">
              Intuitive controls, high visibility, and fast operations. Real interface preview designed for medical staff.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Console Preview */}
            <div className="lg:col-span-8 bg-slate-100 border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm flex flex-col justify-between">
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-sm flex-grow">
                {/* Fake Dashboard Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">Queue Management Console</h3>
                    <p className="text-xs text-slate-500">Facility: Peerless Central Ward - Cardiology Division</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      Database Connected
                    </span>
                  </div>
                </div>

                {/* Fake Queue Table */}
                <div className="p-6 overflow-x-auto">
                  <table className="w-full text-left font-medium border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-xs">
                        <th className="py-3 font-semibold">Triage No.</th>
                        <th className="py-3 font-semibold">Patient Name</th>
                        <th className="py-3 font-semibold">Triage Priority</th>
                        <th className="py-3 font-semibold">Assigned Room</th>
                        <th className="py-3 font-semibold">Allocated Doctor</th>
                        <th className="py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                      <tr>
                        <td className="py-4 font-bold text-blue-600">CARD-109</td>
                        <td className="py-4 font-semibold text-slate-900">Amrita Sen</td>
                        <td className="py-4">
                          <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-100 font-bold text-[10px] uppercase">Emergency</span>
                        </td>
                        <td className="py-4 font-semibold text-slate-900">Room 1</td>
                        <td className="py-4">Dr. Priya Sharma</td>
                        <td className="py-4 text-right">
                          <button className="px-2.5 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-600 rounded border border-blue-100 transition-colors">Route Room</button>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-4 font-bold text-blue-600">CARD-110</td>
                        <td className="py-4 font-semibold text-slate-900">Ramesh Chandra</td>
                        <td className="py-4">
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-bold text-[10px] uppercase">Urgent</span>
                        </td>
                        <td className="py-4 font-semibold text-slate-900">Room 3</td>
                        <td className="py-4">Dr. A. Chowdhury</td>
                        <td className="py-4 text-right">
                          <button className="px-2.5 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-600 rounded border border-blue-100 transition-colors">Route Room</button>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-4 font-bold text-blue-600">CARD-111</td>
                        <td className="py-4 font-semibold text-slate-900">Shikha Banerjee</td>
                        <td className="py-4">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-bold text-[10px] uppercase">Routine</span>
                        </td>
                        <td className="py-4 font-semibold text-slate-900">Room 4</td>
                        <td className="py-4">Dr. Priya Sharma</td>
                        <td className="py-4 text-right">
                          <span className="text-xs text-slate-400 font-medium">Auto Routing…</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Flow Chart / Analytics Mock (Premium Upgrade) */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Hourly Clinic Pacing</h3>
                  <p className="text-xs text-slate-500">Wait times representation for cardiologist sessions.</p>
                </div>
                {/* SVG clinical line graph mockup */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="h-32 w-full flex items-end justify-between gap-2 pt-4">
                    <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full bg-blue-500/20 hover:bg-blue-500/35 rounded-t h-[40%] transition-colors duration-200"></div>
                      <span className="text-[9px] text-slate-400 font-bold">09:00</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full bg-blue-500/20 hover:bg-blue-500/35 rounded-t h-[75%] transition-colors duration-200"></div>
                      <span className="text-[9px] text-slate-400 font-bold">11:00</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full bg-blue-600 rounded-t h-[95%] transition-colors duration-200"></div>
                      <span className="text-[9px] text-slate-400 font-bold">13:00</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full bg-blue-500/20 hover:bg-blue-500/35 rounded-t h-[30%] transition-colors duration-200"></div>
                      <span className="text-[9px] text-slate-400 font-bold">15:00</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 text-xs leading-normal">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Busiest Hour</span>
                    <span className="text-slate-950 font-bold">12:30 - 13:30</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Peak Patients load</span>
                    <span className="text-slate-950 font-bold">42 Arrivals / hr</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500 font-medium">Resolution speed</span>
                    <span className="text-emerald-600 font-bold">98.4% within SLA</span>
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-100">
                <Link to="/login" className="btn-primary w-full py-2 text-xs">
                  Access Portal
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 7. Contact Section */}
      <motion.section 
        id="contact" 
        className="py-24 border-b border-slate-200"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-120px" }}
        variants={fadeInUp}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Enterprise Inquiries</h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Partner with SmartQueue
            </p>
            <p className="text-slate-600 text-sm max-w-xl mx-auto">
              Request a formal system walkthrough, obtain deployment pricing, or coordinate secure server setups for your clinical facilities.
            </p>
          </div>

          <div className="card-container">
            {submitted ? (
              <div className="p-8 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center space-y-3 animate-fadeIn">
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
                    <label htmlFor="name" className="input-label">Clinical Coordinator Name</label>
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
                    <label htmlFor="email" className="input-label">Hospital Email Address</label>
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
                  <label htmlFor="facility" className="input-label">Hospital / Healthcare Facility Name</label>
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
                  <label htmlFor="message" className="input-label">Operational Inquiry Message</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    required
                    value={formData.message}
                    onChange={handleInputChange}
                    className="input-field resize-none"
                    placeholder="Please detail your queue requirements, patient flow bottlenecks, or database synchronization concerns…"
                  />
                </div>

                <motion.div whileTap={{ scale: 0.98 }}>
                  <button type="submit" className="btn-primary w-full py-3 text-base">
                    Submit Formal Request
                  </button>
                </motion.div>
              </form>
            )}
          </div>
        </div>
      </motion.section>

      {/* 8. Footer Section */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Col 1 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <span className="text-base font-bold tracking-tight">SmartQueue</span>
            </div>
            <p className="leading-relaxed text-[11px] text-slate-500">
              Enterprise patient flow routing and queue status logistics software built for major clinical healthcare nodes.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[10px]">Staff Links</h4>
            <ul className="space-y-2 text-[11px]">
              <li><Link to="/login" className="hover:text-white transition-colors">Clinical Portal Sign In</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Register Clinic Node</Link></li>
              <li><a href="#showcase" className="hover:text-white transition-colors">Active Console Demo</a></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[10px]">Medical Divisions</h4>
            <ul className="space-y-2 text-[11px] text-slate-500">
              <li>Cardiology Unit</li>
              <li>Pediatrics & Neonatal</li>
              <li>Emergency Trauma Triage</li>
              <li>Radiology & Imaging Worklists</li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[10px]">Security Compliance</h4>
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500">
                All patient data transmission utilizes cryptographic protocols matching security guidelines set by institutional boards.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700 text-[9px] uppercase">HIPAA Compliant</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700 text-[9px] uppercase">ISO 27001</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700 text-[9px] uppercase">SSL SECURE</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-center text-slate-600 text-[11px] flex flex-col sm:flex-row justify-between items-center gap-4">
          <span>&copy; {new Date().getFullYear()} SmartQueue Systems. All Rights Reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">Facility Privacy Policy</a>
            <a href="#" className="hover:text-white">System Service Level Agreement (SLA)</a>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default LandingPage
