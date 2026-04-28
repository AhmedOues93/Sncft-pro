import { type Request, Router } from 'express';

import { asyncHandler } from '../async-handler.js';
import { ApiError } from '../errors.js';
import { requirePassengerAuth } from '../middleware/passenger-auth.js';
import { authService } from '../services/auth.js';

export const authRouter = Router();

authRouter.post('/auth/register', asyncHandler(async (req, res) => {
  const displayName = String(req.body?.displayName ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!displayName || !email || password.length < 6) throw new ApiError(400, 'displayName, email and password(min 6) are required');

  const profile = await authService.registerPassenger({ displayName, email, password });
  res.status(201).json({ id: profile.id, email: profile.email, displayName: profile.displayName, provider: profile.provider });
}));

authRouter.post('/auth/login', asyncHandler(async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!email || !password) throw new ApiError(400, 'email and password are required');

  const { token, profile } = await authService.loginPassenger(email, password);
  res.json({ accessToken: token, user: { id: profile.id, email: profile.email, displayName: profile.displayName, provider: profile.provider } });
}));

authRouter.post('/auth/logout', asyncHandler(async (req, res) => {
  const token = (req.header('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (token) await authService.logout(token);
  res.json({ ok: true });
}));

authRouter.get('/auth/me', requirePassengerAuth, asyncHandler(async (req, res) => {
  const profile = (req as Request & { passengerProfile?: unknown }).passengerProfile as { id: string; email: string; displayName: string; provider: string };
  res.json(profile);
}));
