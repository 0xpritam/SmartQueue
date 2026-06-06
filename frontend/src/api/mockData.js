// Fictional hospital listings with distance, available departments, and metadata
export const MOCK_HOSPITALS = [
  {
    id: 'hope-medical',
    name: 'Hope Medical Center',
    location: '45 Park Avenue, Sector 5',
    distance: '1.2 km',
    rating: 4.8,
    phone: '+1 (555) 123-4567',
    departments: ['Cardiology', 'Pediatrics', 'Orthopedics', 'General OPD', 'Radiology', 'Emergency Triage']
  },
  {
    id: 'metro-general',
    name: 'Metro General Hospital',
    location: '102 Broadway Boulevard, Midtown',
    distance: '3.4 km',
    rating: 4.6,
    phone: '+1 (555) 987-6543',
    departments: ['Cardiology', 'Pediatrics', 'Orthopedics', 'General OPD', 'Radiology']
  },
  {
    id: 'apex-health',
    name: 'Apex Health Clinic',
    location: '78 Pinecrest Road, Northside',
    distance: '4.8 km',
    rating: 4.5,
    phone: '+1 (555) 456-7890',
    departments: ['General OPD', 'Pediatrics', 'Orthopedics']
  },
  {
    id: 'valley-care',
    name: 'Valley Care Systems',
    location: '210 River Valley Rd, Greenview',
    distance: '6.5 km',
    rating: 4.7,
    phone: '+1 (555) 321-0987',
    departments: ['General OPD', 'Radiology', 'Emergency Triage']
  }
];

// Department stats per hospital to represent wait times, queue lengths, and code prefixes
export const MOCK_DEPARTMENTS_STATS = {
  Cardiology: { waitTimePerPerson: 10, baseQueue: 3, prefix: 'CAR' },
  Pediatrics: { waitTimePerPerson: 8, baseQueue: 6, prefix: 'PED' },
  Orthopedics: { waitTimePerPerson: 12, baseQueue: 2, prefix: 'ORT' },
  'General OPD': { waitTimePerPerson: 5, baseQueue: 11, prefix: 'OPD' },
  Radiology: { waitTimePerPerson: 15, baseQueue: 4, prefix: 'RAD' },
  'Emergency Triage': { waitTimePerPerson: 4, baseQueue: 1, prefix: 'EMR' }
};

// Simple symptom to department recommendation mapping
const SYMPTOM_RULES = [
  { keywords: ['chest', 'heart', 'cardiac', 'palpitations', 'pressure', 'arrhythmia', 'breathless'], department: 'Cardiology' },
  { keywords: ['child', 'baby', 'infant', 'pediatric', 'kid', 'newborn', 'vaccine child'], department: 'Pediatrics' },
  { keywords: ['bone', 'fracture', 'joint', 'back pain', 'sprain', 'knee', 'wrist', 'shoulder', 'muscle', 'ligament'], department: 'Orthopedics' },
  { keywords: ['scan', 'xray', 'x-ray', 'mri', 'ultrasound', 'imaging', 'sonography', 'ct scan'], department: 'Radiology' },
  { keywords: ['emergency', 'accident', 'trauma', 'bleeding', 'severe', 'burn', 'cut', 'chest pain emergency'], department: 'Emergency Triage' },
  { keywords: ['fever', 'cold', 'cough', 'headache', 'general', 'consultation', 'regular', 'checkup', 'throat', 'stomach', 'flu'], department: 'General OPD' }
];

/**
 * Recommends a clinical department based on symptom keywords
 * @param {string} symptomText 
 * @returns {string|null} recommended department
 */
export const recommendDepartment = (symptomText) => {
  if (!symptomText) return null;
  const cleanText = symptomText.toLowerCase();

  let bestMatch = null;
  let maxMatches = 0;

  for (const rule of SYMPTOM_RULES) {
    let matchCount = 0;
    for (const keyword of rule.keywords) {
      if (cleanText.includes(keyword)) {
        matchCount++;
      }
    }
    if (matchCount > maxMatches) {
      maxMatches = matchCount;
      bestMatch = rule.department;
    }
  }

  return bestMatch;
};

/**
 * Returns department queue length and wait time for a hospital.
 * Uses a deterministic calculation based on hospital and department names if not saved in state.
 */
export const getDepartmentStats = (hospitalId, department) => {
  const hospital = MOCK_HOSPITALS.find(h => h.id === hospitalId);
  if (!hospital || !hospital.departments.includes(department)) {
    return { queueLength: 0, estWaitTime: 0 };
  }

  const deptData = MOCK_DEPARTMENTS_STATS[department] || { waitTimePerPerson: 10, baseQueue: 5, prefix: 'GEN' };
  
  // Create slightly different base counts depending on the hospital to simulate realistic differences
  const hospitalModifier = hospitalId.length % 3 - 1; // -1, 0, or 1
  const queueLength = Math.max(1, deptData.baseQueue + hospitalModifier);
  const estWaitTime = queueLength * deptData.waitTimePerPerson;

  return {
    queueLength,
    estWaitTime,
    prefix: deptData.prefix
  };
};

/**
 * Ticket structure:
 * {
 *   ticketId: 'CAR-105',
 *   tokenNumber: 105,
 *   hospitalId: 'hope-medical',
 *   hospitalName: 'Hope Medical Center',
 *   department: 'Cardiology',
 *   patientName: 'John Doe',
 *   patientAge: 32,
 *   patientPhone: '+1 (555) 000-1111',
 *   reason: 'Routine ECG Check',
 *   bookingTime: Date.now(),
 *   initialWaitTime: 40,
 *   currentServingToken: 102,
 *   status: 'Waiting' // 'Waiting', 'Called', 'Completed'
 * }
 */

// Helper to load tickets
export const getTickets = () => {
  const raw = localStorage.getItem('smartqueue_tickets');
  return raw ? JSON.parse(raw) : [];
};

// Helper to save tickets
export const saveTickets = (tickets) => {
  localStorage.setItem('smartqueue_tickets', JSON.stringify(tickets));
};

// Helper to generate a new ticket
export const createTicket = (hospitalId, department, formDetails) => {
  const tickets = getTickets();
  const hospital = MOCK_HOSPITALS.find(h => h.id === hospitalId);
  const stats = getDepartmentStats(hospitalId, department);

  // Determine token numbering
  const deptTickets = tickets.filter(t => t.hospitalId === hospitalId && t.department === department);
  let nextTokenNumber = 101;
  if (deptTickets.length > 0) {
    const maxToken = Math.max(...deptTickets.map(t => t.tokenNumber));
    nextTokenNumber = maxToken + 1;
  } else {
    // Generate a random starting token number to look professional
    nextTokenNumber = Math.floor(Math.random() * 200) + 101;
  }

  const ticketId = `${stats.prefix}-${nextTokenNumber}`;
  const currentServingToken = nextTokenNumber - stats.queueLength > 100 
    ? nextTokenNumber - stats.queueLength 
    : nextTokenNumber - 2;

  const newTicket = {
    ticketId,
    tokenNumber: nextTokenNumber,
    hospitalId,
    hospitalName: hospital ? hospital.name : 'Unknown Hospital',
    department,
    patientName: formDetails.patientName,
    patientAge: formDetails.patientAge,
    patientPhone: formDetails.patientPhone,
    reason: formDetails.reason || '',
    bookingTime: Date.now(),
    initialWaitTime: stats.estWaitTime,
    currentServingToken: Math.max(100, currentServingToken),
    status: 'Waiting'
  };

  tickets.push(newTicket);
  saveTickets(tickets);
  return newTicket;
};

// Get single ticket details
export const getTicketDetails = (ticketId) => {
  const tickets = getTickets();
  return tickets.find(t => t.ticketId === ticketId.toUpperCase()) || null;
};

// Update a ticket's status or current serving token
export const updateTicket = (ticketId, updatedFields) => {
  const tickets = getTickets();
  const idx = tickets.findIndex(t => t.ticketId === ticketId.toUpperCase());
  if (idx === -1) return null;

  tickets[idx] = { ...tickets[idx], ...updatedFields };
  saveTickets(tickets);
  return tickets[idx];
};

// Advance the queue for demo purposes
export const advanceQueueForTicket = (ticketId) => {
  const ticket = getTicketDetails(ticketId);
  if (!ticket || ticket.status === 'Completed') return ticket;

  let nextServing = ticket.currentServingToken;
  let nextStatus = ticket.status;

  if (nextServing < ticket.tokenNumber) {
    nextServing += 1;
  }

  if (nextServing === ticket.tokenNumber) {
    nextStatus = 'Called';
  } else if (nextServing > ticket.tokenNumber || ticket.status === 'Called') {
    nextStatus = 'Completed';
  }

  const updated = updateTicket(ticketId, {
    currentServingToken: nextServing,
    status: nextStatus
  });

  return updated;
};
