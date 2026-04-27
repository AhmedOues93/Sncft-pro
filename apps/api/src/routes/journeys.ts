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

  const items = searchJourneys(memoryStore.getPublishedStops(), memoryStore.getPublishedFares(), {
    originStationId,
    destinationStationId,
    datetime,
    passengers: Number.isFinite(passengers) && passengers > 0 ? passengers : 1,
    offset: Number.isFinite(offset) ? offset : 0,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 5,
  });

  res.json({ offset, limit, count: items.length, items });
});
