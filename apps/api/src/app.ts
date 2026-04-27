import cors from 'cors';
import express from 'express';

import { importPreviewRouter } from './routes/admin/importPreview.js';
import { healthRouter } from './routes/health.js';

export const app = express();

app.use(cors());

// JSON and CSV upload limits for schedule preview endpoint.
app.use(express.json({ limit: '2mb' }));
app.use(express.text({ type: ['text/csv', 'text/plain'], limit: '2mb' }));

app.use(healthRouter);
app.use(importPreviewRouter);
