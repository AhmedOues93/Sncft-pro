import { Router } from 'express';

import { ApiError } from '../../errors.js';
import { previewFaresCsv, previewSchedulesCsv, ensureBodyText } from '../../services/imports.js';
import { memoryStore } from '../../store/memory-store.js';

export const adminImportsRouter = Router();

adminImportsRouter.post('/admin/imports/schedules/preview', (req, res) => {
  const csv = ensureBodyText(req.body?.csv, 'csv');
  const preview = previewSchedulesCsv(csv);
  res.json(preview);
});

adminImportsRouter.post('/admin/imports/schedules', (req, res) => {
  const csv = ensureBodyText(req.body?.csv, 'csv');
  const preview = previewSchedulesCsv(csv);
  const draft = memoryStore.createDraft('schedule', preview.stops, preview.summary, preview.issues);
  res.status(201).json({ id: draft.id, status: draft.status, summary: preview.summary, issues: preview.issues });
});

adminImportsRouter.get('/admin/imports/:id/preview', (req, res) => {
  const draft = memoryStore.getDraft(req.params.id);
  if (!draft) throw new ApiError(404, 'Import not found');

  res.json({
    id: draft.id,
    kind: draft.kind,
    status: draft.status,
    summary: draft.summary,
    issues: draft.issues,
    preview: Array.isArray(draft.payload) ? draft.payload.slice(0, 5) : [],
  });
});

adminImportsRouter.post('/admin/imports/:id/publish', (req, res) => {
  const published = memoryStore.publishDraft(req.params.id);
  res.json({ id: published.id, status: published.status, publishedAt: new Date().toISOString() });
});

adminImportsRouter.post('/admin/imports/:id/rollback', (req, res) => {
  const rolledBack = memoryStore.rollback(req.params.id);
  res.json({ id: rolledBack.id, status: rolledBack.status, rolledBackAt: new Date().toISOString() });
});

adminImportsRouter.post('/admin/imports/fares/preview', (req, res) => {
  const csv = ensureBodyText(req.body?.csv, 'csv');
  const preview = previewFaresCsv(csv);
  res.json(preview);
});

adminImportsRouter.post('/admin/imports/fares', (req, res) => {
  const csv = ensureBodyText(req.body?.csv, 'csv');
  const preview = previewFaresCsv(csv);
  const draft = memoryStore.createDraft('fare', preview.fares, preview.summary, preview.issues);
  res.status(201).json({ id: draft.id, status: draft.status, summary: preview.summary, issues: preview.issues });
});

adminImportsRouter.get('/admin/imports/fares/:id/preview', (req, res) => {
  const draft = memoryStore.getDraft(req.params.id);
  if (!draft || draft.kind !== 'fare') throw new ApiError(404, 'Fare import not found');

  res.json({
    id: draft.id,
    kind: draft.kind,
    status: draft.status,
    summary: draft.summary,
    issues: draft.issues,
    preview: Array.isArray(draft.payload) ? draft.payload.slice(0, 5) : [],
  });
});

adminImportsRouter.post('/admin/imports/fares/:id/publish', (req, res) => {
  const published = memoryStore.publishDraft(req.params.id);
  res.json({ id: published.id, status: published.status, publishedAt: new Date().toISOString() });
});
