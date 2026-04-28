import { Router } from 'express';

import { memoryStore } from '../store/memory-store.js';
import { searchJourneys } from '../services/journeys.js';

export const journeysRouter = Router();

journeysRouter.get('/journeys/search', (req, res) => {
  const originStationId = String(req.query.originStationId ?? '');
  const destinationStationId = String(req.query.destinationStationId ?? '');
  const datetime = String(req.query.datetime ?? '');
  const passengers = Number(req.query.passengers ?? 1);
  const offset = Number(req.query.offset ?? 0);
  const limit = Math.min(Number(req.query.limit ?? 5), 5);

  const safeOffset = Number.isFinite(offset) && offset > 0 ? Math.trunc(offset) : 0;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.trunc(limit) : 5;

  const result = searchJourneys(memoryStore.getPublishedStops(), memoryStore.getPublishedFares(), {
    originStationId,
    destinationStationId,
    datetime,
    passengers: Number.isFinite(passengers) && passengers > 0 ? passengers : 1,
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
});
