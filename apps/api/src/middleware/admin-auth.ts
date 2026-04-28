import type { NextFunction, Request, Response } from 'express';

import { config } from '../config.js';
import { ApiError } from '../errors.js';
import { authService, type AdminRole } from '../services/auth.js';

const roleRank: Record<AdminRole, number> = {
  viewer: 1,
  editor: 2,
  publisher: 3,
  superadmin: 4,
};

function parseBearer(req: Request): string | null {
  const value = req.header('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match?.[1] ?? null;
}

export function requireAdminRole(minRole: AdminRole) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!config.adminAuthRequired) {
      if (config.nodeEnv === 'production') return next(new ApiError(500, 'ADMIN_AUTH_REQUIRED cannot be false in production'));
      return next();
    }

    const token = parseBearer(req);
    if (!token) return next(new ApiError(401, 'Missing bearer token'));

    const profile = await authService.getAdminByToken(token);
    if (!profile) return next(new ApiError(401, 'Invalid authentication token'));
    if (profile.status === 'pending') return next(new ApiError(403, 'Admin account pending activation'));
    if (profile.status === 'suspended') return next(new ApiError(403, 'Admin account suspended'));

    if (roleRank[profile.role] < roleRank[minRole]) return next(new ApiError(403, `Insufficient role: requires ${minRole}`));

    (req as Request & { adminProfileId?: string; adminRole?: AdminRole }).adminProfileId = profile.id;
    (req as Request & { adminProfileId?: string; adminRole?: AdminRole }).adminRole = profile.role;
    return next();
  };
}
