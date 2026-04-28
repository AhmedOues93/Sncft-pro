import { Router } from 'express';

import { asyncHandler } from '../../async-handler.js';
import { ApiError } from '../../errors.js';
import { requireAdminRole } from '../../middleware/admin-auth.js';
import { authService, type AdminRole, type AdminStatus } from '../../services/auth.js';

export const adminAuthRouter = Router();

adminAuthRouter.post('/admin/auth/register', asyncHandler(async (req, res) => {
  const employeeNumber = String(req.body?.employeeNumber ?? '').trim();
  const firstName = String(req.body?.firstName ?? '').trim();
  const lastName = String(req.body?.lastName ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!employeeNumber || !firstName || !lastName || !email || password.length < 6) {
    throw new ApiError(400, 'employeeNumber, firstName, lastName, email and password(min 6) are required');
  }

  const profile = await authService.registerAdmin({ employeeNumber, firstName, lastName, email, password });
  res.status(201).json({ id: profile.id, status: profile.status, role: profile.role, email: profile.email, employeeNumber: profile.employeeNumber });
}));

adminAuthRouter.post('/admin/auth/login', asyncHandler(async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!email || !password) throw new ApiError(400, 'email and password are required');

  const { token, profile } = await authService.loginAdmin(email, password);
  if (profile.status === 'pending') throw new ApiError(403, 'Admin account pending activation');
  if (profile.status === 'suspended') throw new ApiError(403, 'Admin account suspended');

  res.json({ accessToken: token, admin: { id: profile.id, email: profile.email, firstName: profile.firstName, lastName: profile.lastName, role: profile.role, status: profile.status } });
}));

adminAuthRouter.post('/admin/auth/logout', asyncHandler(async (req, res) => {
  const bearer = req.header('authorization') ?? '';
  const token = bearer.replace(/^Bearer\s+/i, '');
  if (token) await authService.logout(token);
  res.json({ ok: true });
}));

adminAuthRouter.get('/admin/auth/me', requireAdminRole('viewer'), asyncHandler(async (req, res) => {
  const token = (req.header('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const profile = await authService.getAdminByToken(token);
  if (!profile) throw new ApiError(401, 'Invalid authentication token');
  res.json({ id: profile.id, employeeNumber: profile.employeeNumber, firstName: profile.firstName, lastName: profile.lastName, email: profile.email, role: profile.role, status: profile.status });
}));

adminAuthRouter.get('/admin/users', requireAdminRole('superadmin'), asyncHandler(async (_req, res) => {
  const users = await authService.listAdmins();
  res.json({ count: users.length, items: users.map((user) => ({ id: user.id, employeeNumber: user.employeeNumber, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, status: user.status })) });
}));

adminAuthRouter.patch('/admin/users/:id/role', requireAdminRole('superadmin'), asyncHandler(async (req, res) => {
  const role = String(req.body?.role ?? '') as AdminRole;
  if (!['viewer', 'editor', 'publisher', 'superadmin'].includes(role)) throw new ApiError(400, 'Invalid role');
  const user = await authService.updateAdminRole(req.params.id, role);
  res.json({ id: user.id, role: user.role, status: user.status });
}));

adminAuthRouter.patch('/admin/users/:id/status', requireAdminRole('superadmin'), asyncHandler(async (req, res) => {
  const status = String(req.body?.status ?? '') as AdminStatus;
  if (!['pending', 'active', 'suspended'].includes(status)) throw new ApiError(400, 'Invalid status');
  const user = await authService.updateAdminStatus(req.params.id, status);
  res.json({ id: user.id, role: user.role, status: user.status });
}));
