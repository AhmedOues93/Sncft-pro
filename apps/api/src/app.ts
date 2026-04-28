import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';

import { ApiError } from './errors.js';
import { healthRouter } from './routes/health.js';
import { journeysRouter } from './routes/journeys.js';
import { stationsRouter } from './routes/stations.js';

export const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '5mb' }));

app.use(healthRouter);
app.use(stationsRouter);
app.use(journeysRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
});
