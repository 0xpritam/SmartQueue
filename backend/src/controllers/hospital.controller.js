const { Department } = require('../models');

// GET /api/hospitals - Return fictional hospitals mapping department names to database UUIDs
const getHospitals = async (req, res) => {
  try {
    const dbDepts = await Department.findAll({ where: { status: 'active' } });
    
    // Map of name -> ID
    const deptMap = {};
    dbDepts.forEach(d => {
      deptMap[d.name] = d.id;
    });

    const hospitals = [
      {
        id: 'hope-medical',
        name: 'Hope Medical Center',
        location: '45 Park Avenue, Sector 5',
        distance: '1.2 km',
        rating: 4.8,
        phone: '+1 (555) 123-4567',
        departments: [
          { id: deptMap['Cardiology'], name: 'Cardiology' },
          { id: deptMap['Pediatrics'], name: 'Pediatrics' },
          { id: deptMap['Orthopedics'], name: 'Orthopedics' },
          { id: deptMap['General Medicine'], name: 'General Medicine' },
          { id: deptMap['Radiology'], name: 'Radiology' },
          { id: deptMap['Emergency Triage'], name: 'Emergency Triage' },
          { id: deptMap['Dermatology'], name: 'Dermatology' },
          { id: deptMap['Dental'], name: 'Dental' }
        ].filter(d => d.id)
      },
      {
        id: 'metro-general',
        name: 'Metro General Hospital',
        location: '102 Broadway Boulevard, Midtown',
        distance: '3.4 km',
        rating: 4.6,
        phone: '+1 (555) 987-6543',
        departments: [
          { id: deptMap['Cardiology'], name: 'Cardiology' },
          { id: deptMap['Pediatrics'], name: 'Pediatrics' },
          { id: deptMap['Orthopedics'], name: 'Orthopedics' },
          { id: deptMap['General Medicine'], name: 'General Medicine' },
          { id: deptMap['Radiology'], name: 'Radiology' },
          { id: deptMap['Ophthalmology'], name: 'Ophthalmology' }
        ].filter(d => d.id)
      },
      {
        id: 'apex-health',
        name: 'Apex Health Clinic',
        location: '78 Pinecrest Road, Northside',
        distance: '4.8 km',
        rating: 4.5,
        phone: '+1 (555) 456-7890',
        departments: [
          { id: deptMap['General Medicine'], name: 'General Medicine' },
          { id: deptMap['Pediatrics'], name: 'Pediatrics' },
          { id: deptMap['Orthopedics'], name: 'Orthopedics' },
          { id: deptMap['Dental'], name: 'Dental' },
          { id: deptMap['Dermatology'], name: 'Dermatology' }
        ].filter(d => d.id)
      },
      {
        id: 'valley-care',
        name: 'Valley Care Systems',
        location: '210 River Valley Rd, Greenview',
        distance: '6.5 km',
        rating: 4.7,
        phone: '+1 (555) 321-0987',
        departments: [
          { id: deptMap['General Medicine'], name: 'General Medicine' },
          { id: deptMap['Radiology'], name: 'Radiology' },
          { id: deptMap['Emergency Triage'], name: 'Emergency Triage' },
          { id: deptMap['Ophthalmology'], name: 'Ophthalmology' }
        ].filter(d => d.id)
      }
    ];

    return res.status(200).json({
      success: true,
      hospitals,
    });
  } catch (error) {
    console.error('Get hospitals error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = {
  getHospitals,
};
