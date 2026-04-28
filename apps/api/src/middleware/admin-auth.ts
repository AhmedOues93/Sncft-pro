import { createClient } from '@supabase/supabase-js';
import type { NextFunction, Request, Response } from 'express';

import { config } from '../config.js';
import { ApiError } from '../errors.js';

export type AdminRole = 'viewer' | 'editor' | 'publisher' | 'superadmin';

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

function roleFromJwtPayload(token: string): string | undefined {
  const parts = token.split('.');
  if (parts.length < 2) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload.role ?? payload.app_metadata?.role ?? payload.user_metadata?.role;
  } catch {
    return undefined;
  }
}

function normalizeRole(value: unknown): AdminRole | null {
  if (!value) return null;
  const role = String(value).toLowerCase();
  if (role === 'viewer' || role === 'editor' || role === 'publisher' || role === 'superadmin') return role;
  return null;
}

async function resolveRole(token: string): Promise<AdminRole | null> {
  if (!config.supabaseUrl || (!config.supabaseAnonKey && !config.supabaseServiceRoleKey)) {
    if (config.nodeEnv !== 'production' && config.devAdminRole) {
      if (token === 'dev-token') return normalizeRole(config.devAdminRole);
      if (token.startsWith('dev-')) return normalizeRole(token.replace('dev-', ''));
    }
    return null;
  }

  const client = createClient(config.supabaseUrl, config.supabaseAnonKey || config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;

  return normalizeRole(data.user.app_metadata?.role)
    ?? normalizeRole(data.user.user_metadata?.role)
    ?? normalizeRole(roleFromJwtPayload(token));
}

export function requireAdminRole(minRole: AdminRole) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!config.adminAuthRequired) {
      if (config.nodeEnv === 'production') return next(new ApiError(500, 'ADMIN_AUTH_REQUIRED cannot be false in production'));
      return next();
    }

    const token = parseBearer(req);
    if (!token) return next(new ApiError(401, 'Missing bearer token'));

    const role = await resolveRole(token);
    if (!role) return next(new ApiError(401, 'Invalid authentication token'));

    if (roleRank[role] < roleRank[minRole]) return next(new ApiError(403, `Insufficient role: requires ${minRole}`));

    (req as Request & { adminRole?: AdminRole }).adminRole = role;
    return next();
  };
}
