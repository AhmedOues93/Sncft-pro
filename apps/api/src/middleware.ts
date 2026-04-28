import type { NextFunction, Request, Response } from 'express';

import { ApiError } from './errors.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not Found' });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({ error: error.message, details: error.details });
    return;
  }

  const message = error instanceof Error ? error.message : 'Unknown server error';
  res.status(500).json({ error: 'Internal Server Error', details: message });
}
