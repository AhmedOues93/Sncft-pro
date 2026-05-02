import { Router } from 'express';

import { asyncHandler } from '../../async-handler.js';
import { ApiError } from '../../errors.js';
import { requireAdminRole } from '../../middleware/admin-auth.js';
import { rateLimit } from '../../middleware/security.js';
import { ensureBodyText, previewFaresCsv, previewSchedulesCsv } from '../../services/imports.js';
import { getImportStore } from '../../store/index.js';

export const adminImportsRouter = Router();

adminImportsRouter.post('/admin/imports/schedules/preview', rateLimit('admin-write', 40), requireAdminRole('editor'), asyncHandler(async (req, res) => {
  const csv = ensureBodyText(req.body?.csv, 'csv');
  const preview = previewSchedulesCsv(csv);
  res.json(preview);
}));

adminImportsRouter.post('/admin/imports/schedules', rateLimit('admin-write', 40), requireAdminRole('editor'), asyncHandler(async (req, res) => {
  const csv = ensureBodyText(req.body?.csv, 'csv');
  const filename = typeof req.body?.filename === 'string' ? req.body.filename : 'schedules.csv';
  const preview = previewSchedulesCsv(csv);
  const store = getImportStore();
  const draft = await store.createDraft('schedule', preview.stops, preview.summary, preview.issues, filename);
  res.status(201).json({ id: draft.id, status: draft.status, summary: draft.summary, issues: draft.issues });
}));

adminImportsRouter.post('/admin/imports/fares/preview', rateLimit('admin-write', 40), requireAdminRole('editor'), asyncHandler(async (req, res) => {
  const csv = ensureBodyText(req.body?.csv, 'csv');
  const preview = previewFaresCsv(csv);
  res.json(preview);
}));

adminImportsRouter.post('/admin/imports/fares', rateLimit('admin-write', 40), requireAdminRole('editor'), asyncHandler(async (req, res) => {
  const csv = ensureBodyText(req.body?.csv, 'csv');
  const filename = typeof req.body?.filename === 'string' ? req.body.filename : 'fares.csv';
  const preview = previewFaresCsv(csv);
  const store = getImportStore();
  const draft = await store.createDraft('fare', preview.fares, preview.summary, preview.issues, filename);
  res.status(201).json({ id: draft.id, status: draft.status, summary: draft.summary, issues: draft.issues });
}));

adminImportsRouter.get('/admin/imports/:id/preview', requireAdminRole('viewer'), asyncHandler(async (req, res) => {
  const store = getImportStore();
  const draft = await store.getDraft(req.params.id);
  if (!draft) throw new ApiError(404, 'Import not found');
  res.json(draft);
}));

adminImportsRouter.post('/admin/imports/:id/publish', rateLimit('admin-write', 40), requireAdminRole('publisher'), asyncHandler(async (req, res) => {
  const store = getImportStore();
  const published = await store.publishDraft(req.params.id);
  res.json({ id: published.id, kind: published.kind, status: published.status });
}));

adminImportsRouter.post('/admin/imports/:id/rollback', rateLimit('admin-write', 40), requireAdminRole('publisher'), asyncHandler(async (req, res) => {
  const store = getImportStore();
  const rollback = await store.rollback(req.params.id);
  res.json({ id: rollback.id, kind: rollback.kind, status: rollback.status });
}));

adminImportsRouter.delete('/admin/imports/:id', rateLimit('admin-write', 40), requireAdminRole('publisher'), asyncHandler(async (req, res) => {
  const store = getImportStore();
  const active = await store.getActiveVersions();
  if (active.scheduleImportId === req.params.id || active.fareImportId === req.params.id) {
    throw new ApiError(409, 'Active imports cannot be deleted');
  }
  await store.deleteDraft(req.params.id);
  res.status(204).send();
}));

adminImportsRouter.get('/admin/imports', requireAdminRole('viewer'), asyncHandler(async (req, res) => {
  const kind = req.query.kind === 'schedule' || req.query.kind === 'fare' ? req.query.kind : undefined;
  const store = getImportStore();
  const items = await store.listDrafts(kind);
  res.json({ count: items.length, items });
}));

adminImportsRouter.get('/admin/active-versions', requireAdminRole('viewer'), asyncHandler(async (_req, res) => {
  const store = getImportStore();
  const active = await store.getActiveVersions();
  res.json(active);
}));

adminImportsRouter.get('/admin/imports/active', requireAdminRole('viewer'), asyncHandler(async (_req, res) => {
  const store = getImportStore();
  const active = await store.getActiveVersions();
  res.json(active);
}));

adminImportsRouter.post('/admin/imports/fares/:id/rollback', rateLimit('admin-write', 40), requireAdminRole('publisher'), asyncHandler(async (req, res) => {
  const store = getImportStore();
  const rollback = await store.rollback(req.params.id);
  if (rollback.kind !== 'fare') throw new ApiError(400, 'Rollback target is not a fare import');
  res.json({ id: rollback.id, kind: rollback.kind, status: rollback.status });
}));
