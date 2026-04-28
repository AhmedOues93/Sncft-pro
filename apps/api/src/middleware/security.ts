import type { NextFunction, Request, Response } from 'express';

import { config } from '../config.js';
import { ApiError } from '../errors.js';

const buckets = new Map<string, { count: number; resetAt: number }>();

function hit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  bucket.count += 1;
  if (bucket.count > limit) return { allowed: false, remaining: 0 };
  return { allowed: true, remaining: limit - bucket.count };
}

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
  if (req.protocol === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

export function rateLimit(scope: string, customLimit?: number) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const limit = customLimit ?? config.rateLimitMax;
    const status = hit(`${scope}:${ip}`, limit, config.rateLimitWindowMs);

    if (!status.allowed) return next(new ApiError(429, 'Too many requests, please retry later'));
    return next();
  };
}
