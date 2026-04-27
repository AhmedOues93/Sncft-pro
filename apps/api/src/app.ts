import cors from 'cors';
import express from 'express';

import { config } from './config.js';
import { importPreviewRouter } from './routes/admin/importPreview.js';
import { adminImportsRouter } from './routes/admin/imports.js';
import { healthRouter } from './routes/health.js';
import { journeysRouter } from './routes/journeys.js';
import { stationsRouter } from './routes/stations.js';

export const app = express();

app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin,
  }),
);

// JSON and CSV upload limits for schedule endpoints.
app.use(express.json({ limit: '2mb' }));
app.use(express.text({ type: ['text/csv', 'text/plain'], limit: '2mb' }));

app.use(healthRouter);
app.use(stationsRouter);
app.use(journeysRouter);
app.use(importPreviewRouter);
app.use(adminImportsRouter);

app.use((err: any, _req: any, res: any, _next: any) => {
  return res.status(500).json({
    error: err instanceof Error ? err.message : 'Unexpected server error',
  });
});
