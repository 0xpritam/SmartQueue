const { updateProfile } = require('../controllers/user.controller');

// Mock dependencies
jest.mock('../models', () => {
  const mockUser = {
    findOne: jest.fn(),
    findByPk: jest.fn(),
  };
  return { User: mockUser };
});

const { User } = require('../models');

// Helper to build Express-like req/res
function mockReqRes(body = {}, user = { id: 'uuid-1' }) {
  const req = { body, user };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe('updateProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when name or email is missing', async () => {
    const { req, res } = mockReqRes({ email: 'a@b.com', phone: '1234567890', age: 25 });
    await updateProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Name and email are required' })
    );
  });

  it('returns 400 when age is less than or equal to 0', async () => {
    const { req, res } = mockReqRes({ name: 'Test', email: 'a@b.com', age: 0 });
    await updateProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Age must be greater than 0' })
    );
  });

  it('returns 400 when email is already registered by another user', async () => {
    User.findOne.mockResolvedValueOnce({ id: 'uuid-other', email: 'other@b.com' });
    const { req, res } = mockReqRes({ name: 'Test', email: ' OTHER@b.com ', phone: '1234567890', age: 25 });
    await updateProfile(req, res);
    expect(User.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        email: 'other@b.com'
      })
    }));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Email already registered' })
    );
  });

  it('returns 400 when phone is already registered by another user', async () => {
    User.findOne
      .mockResolvedValueOnce(null) // no duplicate email
      .mockResolvedValueOnce({ id: 'uuid-other', phone: '1234567890' }); // duplicate phone

    const { req, res } = mockReqRes({ name: 'Test', email: 'a@b.com', phone: ' 1234567890 ', age: 25 });
    await updateProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Phone number already registered' })
    );
  });

  it('returns 400 when phone number is invalid (too short)', async () => {
    const { req, res } = mockReqRes({ name: 'Test', email: 'a@b.com', phone: '44', age: 25 });
    await updateProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Phone number must be exactly 10 digits') })
    );
  });

  it('returns 400 when phone number is invalid (contains non-numeric characters)', async () => {
    const { req, res } = mockReqRes({ name: 'Test', email: 'a@b.com', phone: 'abc123', age: 25 });
    await updateProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Phone number must be exactly 10 digits') })
    );
  });

  it('returns 400 when phone number is invalid (too long)', async () => {
    const { req, res } = mockReqRes({ name: 'Test', email: 'a@b.com', phone: '123456879521365', age: 25 });
    await updateProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Phone number must be exactly 10 digits') })
    );
  });

  it('returns 400 when phone number contains leading plus sign', async () => {
    const { req, res } = mockReqRes({ name: 'Test', email: 'a@b.com', phone: '+9876543210', age: 25 });
    await updateProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Phone number must be exactly 10 digits') })
    );
  });

  it('updates the profile successfully and returns updated user details with immutability enforcement', async () => {
    User.findOne.mockResolvedValue(null); // No duplicate email or phone
    const mockUserRecord = {
      id: 'uuid-1',
      name: 'Old Name',
      email: 'old@b.com',
      phone: '0987654321',
      age: 30,
      role: 'user',
      save: jest.fn().mockResolvedValue(true)
    };
    User.findByPk.mockResolvedValue(mockUserRecord);

    const { req, res } = mockReqRes({
      name: 'New Name',
      email: ' NEW@b.com ',
      phone: ' 1234567890 ',
      age: ' 25 ',
      role: 'admin', // Attempting to escalate role
      password: 'newpassword' // Attempting to change password
    });

    await updateProfile(req, res);

    expect(User.findByPk).toHaveBeenCalledWith('uuid-1');
    expect(mockUserRecord.name).toBe('New Name');
    expect(mockUserRecord.email).toBe('new@b.com');
    expect(mockUserRecord.phone).toBe('1234567890');
    expect(mockUserRecord.age).toBe(25);
    expect(mockUserRecord.role).toBe('user'); // role must remain unchanged
    expect(mockUserRecord.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        user: expect.objectContaining({
          id: 'uuid-1',
          name: 'New Name',
          email: 'new@b.com',
          phone: '1234567890',
          age: 25,
          role: 'user'
        })
      })
    );
  });
});
