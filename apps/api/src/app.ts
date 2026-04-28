import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';

import { config } from './config.js';
import { ApiError } from './errors.js';
import { securityHeaders } from './middleware/security.js';
import { adminImportsRouter } from './routes/admin/imports.js';
import { healthRouter } from './routes/health.js';
import { journeysRouter } from './routes/journeys.js';
import { stationsRouter } from './routes/stations.js';

export const app = express();

app.use(securityHeaders);
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((v) => v.trim()) }));
app.use(express.json({ limit: config.csvBodyLimit }));

app.use(healthRouter);
app.use(stationsRouter);
app.use(journeysRouter);
app.use(adminImportsRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: err.message, details: config.nodeEnv === 'production' ? null : (err.details ?? null) });
    return;
  }

  if (config.nodeEnv === 'production') {
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
});
