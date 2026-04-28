import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '../errors.js';
import { authService } from '../services/auth.js';

function parseBearer(req: Request): string | null {
  const value = req.header('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match?.[1] ?? null;
}

export async function requirePassengerAuth(req: Request, _res: Response, next: NextFunction) {
  const token = parseBearer(req);
  if (!token) return next(new ApiError(401, 'Missing bearer token'));

  const profile = await authService.getPassengerByToken(token);
  if (!profile) return next(new ApiError(401, 'Invalid passenger authentication token'));

  (req as Request & { passengerId?: string; passengerProfile?: unknown }).passengerId = profile.id;
  (req as Request & { passengerId?: string; passengerProfile?: unknown }).passengerProfile = profile;
  return next();
}
