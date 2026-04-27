import { Router } from 'express';

import { previewSchedulesFromPayload } from '../../services/importPreview.js';

export const importPreviewRouter = Router();

importPreviewRouter.post('/admin/imports/schedules/preview', (req, res) => {
  const result = previewSchedulesFromPayload(req.body);
  return res.status(result.statusCode).json(result.body);
});
