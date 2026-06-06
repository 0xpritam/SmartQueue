import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PatientNavbar from '../components/PatientNavbar';
import PatientFooter from '../components/PatientFooter';
import { 
  recommendDepartment, 
  getDepartmentRecommendationDetails, 
  MOCK_HOSPITALS, 
  getDepartmentStats 
} from '../api/mockData';

const AIAssistant = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  // Chat message stream state
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello! I am the SmartQueue Triage Assistant. Describe the symptoms you are experiencing (e.g., 'chest pain', 'skin rash', or 'tooth pain'), and I will recommend the correct medical department for your queue booking.",
      cardData: null
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Suggestion chips for testing
  const suggestionChips = [
    { label: "Chest pain", text: "I have been experiencing mild chest pain and palpitations." },
    { label: "Skin rash", text: "I have a red skin rash and itchy irritation on my arm." },
    { label: "Eye pain", text: "My left eye has sharp pain and my vision is slightly blurred." },
    { label: "Fever & Cold", text: "I have a high fever, dry cough, and general body weakness." },
    { label: "Toothache", text: "I have severe tooth pain and swelling in my lower jaw." },
    { label: "Child fever", text: "My toddler has child health concerns and a mild fever." }
  ];

  // Auto-scroll to the bottom of the chat log
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Simulates AI response generation (designed for future OpenAI API hook)
  const generateAIResponse = async (userText) => {
    setIsTyping(true);
    
    // Simulate API network latency
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const recommendedDept = recommendDepartment(userText);

    let textResponse = "";
    let cardData = null;

    if (recommendedDept) {
      const details = getDepartmentRecommendationDetails(recommendedDept);
      
      // Find hospitals that support this department
      const supportingHospitals = MOCK_HOSPITALS.filter(h => 
        h.departments.includes(recommendedDept)
      );

      // Calculate average wait time across these hospitals
      let totalWait = 0;
      supportingHospitals.forEach(h => {
        const stats = getDepartmentStats(h.id, recommendedDept);
        totalWait += stats.estWaitTime;
      });
      const avgWait = supportingHospitals.length > 0
        ? Math.round(totalWait / supportingHospitals.length)
        : 15;

      textResponse = `Based on the symptoms you described, I recommend routing your booking to the **${recommendedDept}** department. Here is the triage recommendation:`;
      
      cardData = {
        department: recommendedDept,
        reason: details.reason,
        disclaimerTip: details.disclaimerTip,
        avgWaitTime: avgWait,
        hospitals: supportingHospitals.map(h => ({ id: h.id, name: h.name, distance: h.distance }))
      };
    } else {
      textResponse = "I couldn't identify a specific clinical department for those symptoms. For general concerns, you may want to book a ticket in the **General Medicine** department, or describe your symptoms in more detail.";
    }

    setMessages(prev => [
      ...prev,
      {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: textResponse,
        cardData
      }
    ]);
    setIsTyping(false);
  };

  const handleSendMessage = (textToSend) => {
    if (!textToSend.trim()) return;

    // Add user message to log
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      cardData: null
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    // Trigger AI response
    generateAIResponse(textToSend);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleBookRedirect = (card) => {
    // Redirect to booking page, preselecting the department and the first available hospital
    const firstHospitalId = card.hospitals.length > 0 ? card.hospitals[0].id : '';
    navigate(`/book-ticket?hospital=${firstHospitalId}&department=${card.department}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <PatientNavbar />

      {/* Main chat window container */}
      <main className="max-w-3xl mx-auto px-4 py-8 flex-grow flex flex-col w-full min-h-[500px]">
        
        {/* Helper disclaimer block */}
        <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-4 mb-6 shadow-sm flex items-start gap-3">
          <div className="p-1.5 rounded bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="space-y-1 text-xs">
            <h3 className="font-bold uppercase tracking-wider text-teal-400">SmartQueue Clinical Router</h3>
            <p className="leading-relaxed text-slate-300">
              This assistant provides department recommendations only and is not a substitute for professional medical advice. If you are experiencing a medical emergency, please call emergency services or visit the nearest ER immediately.
            </p>
          </div>
        </div>

        {/* Chat Conversation Scroll Area */}
        <div className="bg-white border border-slate-200 rounded-2xl flex-grow shadow-sm flex flex-col h-[520px] overflow-hidden">
          
          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-teal-600 animate-pulse" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-.813-5.096L3 15.187m6 5.813l5.096-.813M21 3L9 15m0 0l-3-3m3 3L3 9" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">AI Triage Assistant</h2>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Clinic Pacing Guide</span>
            </div>
          </div>

          {/* Messages Log */}
          <div className="flex-grow p-6 overflow-y-auto space-y-6 bg-slate-50/50">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3.5 items-start ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* AI Avatar */}
                  {msg.sender === 'ai' && (
                    <div className="h-8 w-8 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm text-xs">
                      AI
                    </div>
                  )}

                  {/* Message bubble */}
                  <div className="space-y-3 max-w-[85%]">
                    <div className={`p-4 rounded-xl text-xs leading-relaxed font-medium shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>

                    {/* AI Recommendation Card Detail */}
                    {msg.sender === 'ai' && msg.cardData && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white border-2 border-teal-500 rounded-xl overflow-hidden shadow-md max-w-sm"
                      >
                        {/* Card Header */}
                        <div className="bg-teal-600 text-white px-4 py-3 text-xs font-bold uppercase tracking-wider flex justify-between items-center">
                          <span>Routing Recommendation</span>
                          <span className="bg-teal-700 px-2 py-0.5 rounded text-[10px]">
                            ~{msg.cardData.avgWaitTime}m Wait
                          </span>
                        </div>

                        {/* Card Contents */}
                        <div className="p-4 space-y-3.5 text-xs text-slate-700">
                          {/* Recommended Department */}
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Recommended Dept</span>
                            <span className="text-base font-black text-slate-900 leading-tight">
                              {msg.cardData.department}
                            </span>
                          </div>

                          {/* Reason */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Clinical Rationale</span>
                            <p className="leading-relaxed text-slate-600 font-semibold">{msg.cardData.reason}</p>
                          </div>

                          {/* Available Clinics */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Available Facilities</span>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {msg.cardData.hospitals.map((h, i) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-700 font-bold">
                                  {h.name} ({h.distance})
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Medical Disclaimer Tip */}
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800 leading-relaxed font-semibold">
                            ⚠️ **Important**: {msg.cardData.disclaimerTip}
                          </div>
                        </div>

                        {/* Card CTA Actions */}
                        <div className="bg-slate-50 border-t border-slate-100 p-3">
                          <button
                            onClick={() => handleBookRedirect(msg.cardData)}
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2.5 px-4 rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            Book Queue Now
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* User Avatar */}
                  {msg.sender === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 shadow-sm text-xs border border-blue-200">
                      PT
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3.5 items-start justify-start"
                >
                  <div className="h-8 w-8 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm text-xs">
                    AI
                  </div>
                  <div className="bg-white text-slate-400 border border-slate-200 p-4 rounded-xl rounded-tl-none text-xs font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions area */}
          <div className="bg-white border-t border-slate-100 px-6 py-3 overflow-x-auto flex gap-2 shrink-0 scrollbar-none">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip.text)}
                disabled={isTyping}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-full text-[10px] font-bold transition-all shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Panel */}
          <div className="bg-white border-t border-slate-200 px-6 py-4 shrink-0">
            <form onSubmit={handleFormSubmit} className="flex gap-3 items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isTyping}
                placeholder="Describe your symptoms in detail..."
                className="flex-grow bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isTyping || !inputValue.trim()}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2.5 rounded-lg text-xs transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Send
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>

        {/* Diagnostic substitute warning alert */}
        <div className="mt-4 text-center text-[10px] text-slate-400 leading-normal font-semibold">
          Disclaimer: This assistant provides department recommendations only and is not a substitute for professional medical advice. Always consult a healthcare professional before making clinical decisions.
        </div>

      </main>

      <PatientFooter />
    </div>
  );
};

export default AIAssistant;
