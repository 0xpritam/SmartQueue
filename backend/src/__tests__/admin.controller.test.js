const bcrypt = require('bcrypt');
const {
  getDashboardStats,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  getPatients,
  getPatientDetails,
  getSystemStatistics
} = require('../controllers/admin.controller');
const { User, Department, Ticket } = require('../models');

jest.mock('../models', () => {
  const mockSequelize = {
    options: { dialect: 'sqlite' },
    fn: jest.fn((fnName, col) => `${fnName}(${col})`),
    col: jest.fn((colName) => colName),
    literal: jest.fn((expr) => expr)
  };
  return {
    sequelize: mockSequelize,
    User: {
      count: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findAndCountAll: jest.fn()
    },
    Department: {
      count: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn()
    },
    Ticket: {
      count: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn()
    }
  };
});

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('mocked-hash')
}));

function mockReqRes(user = { id: 'admin-1', role: 'admin' }, params = {}, query = {}, body = {}) {
  const req = {
    user,
    params,
    query,
    body,
    app: {
      get: jest.fn().mockReturnValue({
        emit: jest.fn()
      })
    }
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return { req, res };
}

describe('Admin Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dashboard Statistics', () => {
    it('returns overall counts and wait times', async () => {
      User.count.mockResolvedValueOnce(50); // totalPatients
      User.count.mockResolvedValueOnce(10); // totalStaff
      Department.count.mockResolvedValue(5);
      Ticket.count.mockResolvedValueOnce(2); // activeQueues
      Ticket.count.mockResolvedValueOnce(3); // waitingTickets
      Ticket.count.mockResolvedValueOnce(1); // servingTickets
      Ticket.count.mockResolvedValueOnce(12); // completedToday
      Ticket.count.mockResolvedValueOnce(4); // cancelledToday
      Ticket.findOne.mockResolvedValue({ avgWait: 600 }); // averageWaitTime in seconds (10 min)

      const { req, res } = mockReqRes();
      await getDashboardStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalPatients: 50,
            totalStaff: 10,
            totalDepartments: 5,
            activeQueues: 2,
            waitingTickets: 3,
            servingTickets: 1,
            completedToday: 12,
            cancelledToday: 4,
            averageWaitTime: 10
          })
        })
      );
    });
  });

  describe('Department Management', () => {
    it('fetches all departments ordered by name', async () => {
      const mockDepts = [{ id: '1', name: 'Cardiology' }, { id: '2', name: 'Dental' }];
      Department.findAll.mockResolvedValue(mockDepts);

      const { req, res } = mockReqRes();
      await getDepartments(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          departments: mockDepts
        })
      );
    });

    it('creates a department after unique name check', async () => {
      Department.findOne.mockResolvedValue(null);
      const mockDept = { id: '3', name: 'Neurology', description: 'Brain Clinic' };
      Department.create.mockResolvedValue(mockDept);

      const { req, res } = mockReqRes(
        { id: 'admin-1', role: 'admin' },
        {},
        {},
        { name: 'Neurology', description: 'Brain Clinic' }
      );
      await createDepartment(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Department created successfully',
          department: mockDept
        })
      );
    });

    it('returns 400 when creating a department with duplicate name', async () => {
      Department.findOne.mockResolvedValue({ id: '1', name: 'Cardiology' });

      const { req, res } = mockReqRes(
        { id: 'admin-1', role: 'admin' },
        {},
        {},
        { name: 'Cardiology' }
      );
      await createDepartment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Department name must be unique'
        })
      );
    });

    it('prevents deactivation of a department if it has active tickets or active staff', async () => {
      const mockDept = { id: '1', name: 'Cardiology', status: 'active', save: jest.fn() };
      Department.findByPk.mockResolvedValue(mockDept);
      Department.findOne.mockResolvedValue(null);

      // 1. Block due to waiting tickets
      Ticket.count.mockResolvedValueOnce(2); // waiting tickets
      const { req: req1, res: res1 } = mockReqRes(
        { id: 'admin-1', role: 'admin' },
        { id: '1' },
        {},
        { name: 'Cardiology', status: 'inactive' }
      );
      await updateDepartment(req1, res1);
      expect(res1.status).toHaveBeenCalledWith(400);
      expect(res1.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Cannot deactivate department with waiting tickets.'
        })
      );

      // 2. Block due to active staff
      Ticket.count.mockResolvedValueOnce(0); // waiting
      Ticket.count.mockResolvedValueOnce(0); // serving
      User.count.mockResolvedValueOnce(1); // active staff
      const { req: req2, res: res2 } = mockReqRes(
        { id: 'admin-1', role: 'admin' },
        { id: '1' },
        {},
        { name: 'Cardiology', status: 'inactive' }
      );
      await updateDepartment(req2, res2);
      expect(res2.status).toHaveBeenCalledWith(400);
      expect(res2.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Cannot deactivate department with active staff members currently assigned.'
        })
      );
    });
  });

  describe('Staff Management', () => {
    it('creates staff account successfully', async () => {
      User.findOne.mockResolvedValue(null); // email unique check
      Department.findByPk.mockResolvedValue({ id: 'dept-1', status: 'active' });

      const mockStaffUser = {
        id: 'staff-1',
        name: 'John Doe',
        email: 'john@hospital.org',
        role: 'staff',
        status: 'active',
        departmentId: 'dept-1',
        toJSON: function() { return this; }
      };
      User.create.mockResolvedValue(mockStaffUser);

      const { req, res } = mockReqRes(
        { id: 'admin-1', role: 'admin' },
        {},
        {},
        {
          name: 'John Doe',
          email: 'john@hospital.org',
          password: 'password123',
          phone: '1234567890',
          departmentId: 'dept-1'
        }
      );
      await createStaff(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          staff: expect.objectContaining({
            id: 'staff-1',
            email: 'john@hospital.org'
          })
        })
      );
    });

    it('soft deletes (deactivates) a staff account instead of purging it', async () => {
      const mockStaff = { id: 'staff-1', role: 'staff', status: 'active', save: jest.fn() };
      User.findOne.mockResolvedValueOnce(mockStaff); // find staff for delete
      User.findOne.mockResolvedValueOnce({ ...mockStaff, status: 'inactive' }); // return profile

      const { req, res } = mockReqRes({ id: 'admin-1', role: 'admin' }, { id: 'staff-1' });
      await deleteStaff(req, res);

      expect(mockStaff.status).toBe('inactive');
      expect(mockStaff.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Staff account deactivated successfully'
        })
      );
    });
  });

  describe('Patient Management', () => {
    it('retrieves paginated and filtered patient list', async () => {
      const mockPatients = [
        { id: 'p-1', name: 'Patient One', email: 'p1@test.com' },
        { id: 'p-2', name: 'Patient Two', email: 'p2@test.com' }
      ];
      User.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockPatients
      });

      const { req, res } = mockReqRes({ id: 'admin-1', role: 'admin' }, {}, { page: 1, limit: 10, search: 'Patient' });
      await getPatients(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          patients: mockPatients,
          pagination: expect.objectContaining({
            totalItems: 2,
            totalPages: 1,
            currentPage: 1
          })
        })
      );
    });

    it('shows details of patient including history details but prevents deletion', async () => {
      const mockPatient = { id: 'p-1', name: 'Patient One', role: 'user' };
      User.findOne.mockResolvedValue(mockPatient);
      Ticket.findAll.mockResolvedValueOnce([{ id: 't-active', status: 'waiting' }]);
      Ticket.findAll.mockResolvedValueOnce([{ id: 't-completed', status: 'completed' }]);
      Ticket.findAll.mockResolvedValueOnce([]); // cancelled

      const { req, res } = mockReqRes({ id: 'admin-1', role: 'admin' }, { id: 'p-1' });
      await getPatientDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          patient: mockPatient,
          history: expect.objectContaining({
            activeTickets: expect.any(Array),
            completedVisits: expect.any(Array),
            cancelledAppointments: expect.any(Array)
          })
        })
      );
    });
  });

  describe('Extended Analytics', () => {
    it('retrieves aggregate statistics for today, week, and month', async () => {
      Ticket.count.mockResolvedValueOnce(5); // today
      Ticket.count.mockResolvedValueOnce(20); // week
      Ticket.count.mockResolvedValueOnce(80); // month
      Ticket.findAll.mockResolvedValueOnce([
        { departmentId: 'dept-1', count: 12, 'department.name': 'Cardiology' }
      ]); // department counts
      Ticket.findOne.mockResolvedValueOnce({ avgWait: 300 }); // wait time
      Ticket.findOne.mockResolvedValueOnce({ avgService: 600 }); // service time
      Ticket.findAll.mockResolvedValueOnce([
        { hour: '09', count: 15 }
      ]); // peak hours

      const { req, res } = mockReqRes();
      await getSystemStatistics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            appointmentsToday: 5,
            appointmentsThisWeek: 20,
            appointmentsThisMonth: 80,
            mostActiveDepartment: 'Cardiology',
            averageWaitingTime: 5,
            averageServiceTime: 10
          })
        })
      );
    });
  });
});
