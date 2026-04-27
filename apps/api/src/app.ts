import cors from 'cors';
import express from 'express';

import { config } from './config.js';
import { errorHandler, notFoundHandler } from './middleware.js';
import { adminImportsRouter } from './routes/admin/imports.js';
import { healthRouter } from './routes/health.js';
import { journeysRouter } from './routes/journeys.js';
import { stationsRouter } from './routes/stations.js';

export const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '5mb' }));

app.use(healthRouter);
app.use(stationsRouter);
app.use(journeysRouter);
app.use(adminImportsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
