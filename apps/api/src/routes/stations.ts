import { Router } from 'express';

import { asyncHandler } from '../async-handler.js';
import { normalizeStationName } from '../services/imports.js';
import { getImportStore } from '../store/index.js';

export const stationsRouter = Router();

stationsRouter.get('/stations/search', asyncHandler(async (req, res) => {
  const query = String(req.query.q ?? '').trim();
  const limitRaw = Number(req.query.limit ?? 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.trunc(limitRaw), 20) : 10;

  if (!query) {
    res.json({ count: 0, items: [] });
    return;
  }

  const normalizedQuery = normalizeStationName(query);
  const stationMap = new Map<string, string>();

  const store = getImportStore();
  (await store.getPublishedStops()).forEach((stop) => {
    const normalized = normalizeStationName(stop.station);
    if (!stationMap.has(normalized)) stationMap.set(normalized, stop.station);
  });

  const ranked = Array.from(stationMap.entries())
    .map(([id, name]) => ({ id, name, normalized: normalizeStationName(name) }))
    .filter((station) => station.normalized.includes(normalizedQuery))
    .sort((a, b) => {
      const aStarts = a.normalized.startsWith(normalizedQuery) ? 0 : 1;
      const bStarts = b.normalized.startsWith(normalizedQuery) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.name.localeCompare(b.name, 'fr');
    });

  const items = ranked.slice(0, limit).map(({ id, name }) => ({ id, name }));

  res.json({ count: items.length, items });
}));
