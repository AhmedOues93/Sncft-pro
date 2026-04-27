import { Router } from 'express';

import { getSupabaseServerClient } from '../../lib/supabase.js';
import { ImportRepository } from '../../repositories/importRepository.js';
import { ScheduleImportService } from '../../services/scheduleImportService.js';
import { SchedulePublishService } from '../../services/schedulePublishService.js';
import { extractCsvTextFromPayload } from '../../services/importPreview.js';

export const adminImportsRouter = Router();

function buildServices() {
  const repository = new ImportRepository(getSupabaseServerClient());
  return {
    importService: new ScheduleImportService(repository),
    publishService: new SchedulePublishService(repository),
  };
}

adminImportsRouter.post('/admin/imports/schedules', async (req: any, res: any) => {
  const csvText = extractCsvTextFromPayload(req.body);
  if (!csvText.trim()) {
    return res.status(400).json({
      error: 'CSV payload is required. Send text/csv body or JSON {"csvText":"..."}.',
    });
  }

  const sourceFilename = typeof req.query.filename === 'string' ? req.query.filename : 'uploaded_schedule.csv';

  try {
    const { importService } = buildServices();
    const created = await importService.persistScheduleImport(csvText, sourceFilename);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to persist import',
    });
  }
});

adminImportsRouter.get('/admin/imports/:id/preview', async (req: any, res: any) => {
  try {
    const { importService } = buildServices();
    const preview = await importService.getSavedImportPreview(req.params.id);
    if (!preview) {
      return res.status(404).json({ error: 'Import not found' });
    }

    return res.status(200).json(preview);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch import preview',
    });
  }
});

adminImportsRouter.post('/admin/imports/:id/publish', async (req: any, res: any) => {
  try {
    const { publishService } = buildServices();
    const force = req.body && typeof req.body === 'object' && 'force' in req.body ? Boolean((req.body as { force?: boolean }).force) : false;
    const result = await publishService.publishImport(req.params.id, force);
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to publish import',
    });
  }
});

adminImportsRouter.post('/admin/imports/:id/rollback', async (req: any, res: any) => {
  try {
    const { publishService } = buildServices();
    const result = await publishService.rollbackImport(req.params.id);
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to rollback import',
    });
  }
});
