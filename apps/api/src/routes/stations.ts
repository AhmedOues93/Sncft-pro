import { Router } from 'express';

import { getSupabaseServerClient } from '../lib/supabase.js';
import { ActiveScheduleRepository } from '../repositories/activeScheduleRepository.js';
import { StationSearchService } from '../services/journey/stationSearchService.js';

export const stationsRouter = Router();

stationsRouter.get('/stations/search', async (req: any, res: any) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  try {
    const repository = new ActiveScheduleRepository(getSupabaseServerClient());
    const service = new StationSearchService(repository);
    const stations = await service.searchStations(q);

    return res.status(200).json({ query: q, count: stations.length, stations });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to search stations',
    });
  }
});
