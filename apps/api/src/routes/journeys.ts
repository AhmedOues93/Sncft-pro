import { Router } from 'express';

import { getSupabaseServerClient } from '../lib/supabase.js';
import { ActiveScheduleRepository } from '../repositories/activeScheduleRepository.js';
import { JourneySearchService } from '../services/journey/journeySearchService.js';

export const journeysRouter = Router();

function parseInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

journeysRouter.get('/journeys/search', async (req: any, res: any) => {
  const originStationId = typeof req.query.originStationId === 'string' ? req.query.originStationId : '';
  const destinationStationId = typeof req.query.destinationStationId === 'string' ? req.query.destinationStationId : '';
  const datetime = typeof req.query.datetime === 'string' ? req.query.datetime : '';
  const passengers = parseInteger(req.query.passengers, 1);
  const offset = parseInteger(req.query.offset, 0);
  const limit = parseInteger(req.query.limit, 5);

  if (!originStationId || !destinationStationId || !datetime) {
    return res.status(400).json({
      error: 'originStationId, destinationStationId and datetime are required query params',
    });
  }

  if (passengers <= 0) {
    return res.status(400).json({ error: 'passengers must be >= 1' });
  }

  try {
    const repository = new ActiveScheduleRepository(getSupabaseServerClient());
    const service = new JourneySearchService(repository);

    const result = await service.searchJourneys({
      originStationId,
      destinationStationId,
      datetime,
      passengers,
      offset,
      limit,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to search journeys',
    });
  }
});

journeysRouter.get('/journeys/:id', (_req: any, res: any) => {
  return res.status(501).json({
    error: 'GET /journeys/:id is not implemented in MVP. Use GET /journeys/search response journey details.',
  });
});
