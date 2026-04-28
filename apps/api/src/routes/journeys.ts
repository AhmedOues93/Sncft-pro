import { Router } from 'express';

import { asyncHandler } from '../async-handler.js';
import { ApiError } from '../errors.js';
import { rateLimit } from '../middleware/security.js';
import { searchJourneys } from '../services/journeys.js';
import { getImportStore } from '../store/index.js';

export const journeysRouter = Router();

journeysRouter.get('/journeys/search', rateLimit('journeys', 120), asyncHandler(async (req, res) => {
  const originStationId = String(req.query.originStationId ?? '').trim();
  const destinationStationId = String(req.query.destinationStationId ?? '').trim();
  const datetime = String(req.query.datetime ?? '').trim();
  const passengers = Number(req.query.passengers ?? 1);
  const offset = Number(req.query.offset ?? 0);
  const limit = Number(req.query.limit ?? 5);

  if (!originStationId || !destinationStationId) throw new ApiError(400, 'originStationId and destinationStationId are required');
  if (!datetime || Number.isNaN(Date.parse(datetime))) throw new ApiError(400, 'datetime must be a valid ISO datetime');

  const safePassengers = Number.isFinite(passengers) && passengers >= 1 && passengers <= 12 ? Math.trunc(passengers) : 1;
  const safeOffset = Number.isFinite(offset) && offset >= 0 ? Math.trunc(offset) : 0;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.trunc(limit), 5) : 5;

  const store = getImportStore();
  const result = searchJourneys(await store.getPublishedStops(), await store.getPublishedFares(), {
    originStationId,
    destinationStationId,
    datetime,
    passengers: safePassengers,
    offset: safeOffset,
    limit: safeLimit,
  });

  res.json({
    offset: safeOffset,
    limit: safeLimit,
    count: result.items.length,
    total: result.total,
    hasPrevious: safeOffset > 0,
    hasNext: safeOffset + safeLimit < result.total,
    previousOffset: Math.max(0, safeOffset - safeLimit),
    nextOffset: safeOffset + safeLimit < result.total ? safeOffset + safeLimit : null,
    items: result.items,
  });
}));
