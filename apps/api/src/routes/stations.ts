import { Router } from 'express';

import { memoryStore } from '../store/memory-store.js';
import { normalizeStationName } from '../services/imports.js';

export const stationsRouter = Router();

stationsRouter.get('/stations/search', (req, res) => {
  const query = String(req.query.q ?? '').trim();
  if (!query) {
    res.json({ items: [] });
    return;
  }

  const normalizedQuery = normalizeStationName(query);
  const stationMap = new Map<string, string>();

  memoryStore.getPublishedStops().forEach((stop) => {
    const normalized = normalizeStationName(stop.station);
    if (!stationMap.has(normalized)) stationMap.set(normalized, stop.station);
  });

  const items = Array.from(stationMap.entries())
    .filter(([normalized]) => normalized.includes(normalizedQuery))
    .slice(0, 10)
    .map(([id, name]) => ({ id, name }));

  res.json({ items });
});
