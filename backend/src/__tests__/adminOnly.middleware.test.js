const adminOnly = require('../middleware/adminOnly');

function mockReqRes(user) {
  const req = { user };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('adminOnly middleware', () => {
  it('calls next() when user is admin', () => {
    const { req, res, next } = mockReqRes({ id: 'u1', role: 'admin' });
    adminOnly(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when user role is not admin', () => {
    const { req, res, next } = mockReqRes({ id: 'u1', role: 'user' });
    adminOnly(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Access denied. Admin only.' })
    );
  });

  it('returns 403 when req.user is undefined', () => {
    const { req, res, next } = mockReqRes(undefined);
    adminOnly(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 403 when req.user has no role', () => {
    const { req, res, next } = mockReqRes({ id: 'u1' });
    adminOnly(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
