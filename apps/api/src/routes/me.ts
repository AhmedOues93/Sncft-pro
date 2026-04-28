import { type Request, Router } from 'express';

import { asyncHandler } from '../async-handler.js';
import { ApiError } from '../errors.js';
import { requirePassengerAuth } from '../middleware/passenger-auth.js';
import { authService } from '../services/auth.js';

export const meRouter = Router();

meRouter.get('/me/favorites', requirePassengerAuth, asyncHandler(async (req, res) => {
  const passengerId = (req as Request & { passengerId?: string }).passengerId;
  if (!passengerId) throw new ApiError(401, 'Unauthorized');
  const items = await authService.listFavorites(passengerId);
  res.json({ count: items.length, items });
}));

meRouter.post('/me/favorites', requirePassengerAuth, asyncHandler(async (req, res) => {
  const passengerId = (req as Request & { passengerId?: string }).passengerId;
  if (!passengerId) throw new ApiError(401, 'Unauthorized');

  const originStationId = String(req.body?.originStationId ?? '').trim();
  const destinationStationId = String(req.body?.destinationStationId ?? '').trim();
  const label = typeof req.body?.label === 'string' ? req.body.label : undefined;
  if (!originStationId || !destinationStationId) throw new ApiError(400, 'originStationId and destinationStationId are required');

  const favorite = await authService.addFavorite({ passengerId, originStationId, destinationStationId, label });
  res.status(201).json(favorite);
}));

meRouter.delete('/me/favorites/:id', requirePassengerAuth, asyncHandler(async (req, res) => {
  const passengerId = (req as Request & { passengerId?: string }).passengerId;
  if (!passengerId) throw new ApiError(401, 'Unauthorized');

  await authService.deleteFavorite(passengerId, req.params.id);
  res.json({ ok: true });
}));

meRouter.get('/me/saved-journeys', requirePassengerAuth, asyncHandler(async (req, res) => {
  const passengerId = (req as Request & { passengerId?: string }).passengerId;
  if (!passengerId) throw new ApiError(401, 'Unauthorized');

  const items = await authService.listSavedJourneys(passengerId);
  res.json({ count: items.length, items });
}));

meRouter.post('/me/saved-journeys', requirePassengerAuth, asyncHandler(async (req, res) => {
  const passengerId = (req as Request & { passengerId?: string }).passengerId;
  if (!passengerId) throw new ApiError(401, 'Unauthorized');

  const originStationId = String(req.body?.originStationId ?? '').trim();
  const destinationStationId = String(req.body?.destinationStationId ?? '').trim();
  const departureTime = String(req.body?.departureTime ?? '').trim();
  const arrivalTime = String(req.body?.arrivalTime ?? '').trim();
  const trainNumbers = Array.isArray(req.body?.trainNumbers) ? req.body.trainNumbers.map((value: unknown) => String(value)) : [];
  const journeyPayload = req.body?.journeyPayload ?? {};
  const travelDate = String(req.body?.travelDate ?? '').trim();

  if (!originStationId || !destinationStationId || !departureTime || !arrivalTime || !travelDate) {
    throw new ApiError(400, 'originStationId, destinationStationId, departureTime, arrivalTime, travelDate are required');
  }

  const item = await authService.addSavedJourney({
    passengerId,
    originStationId,
    destinationStationId,
    departureTime,
    arrivalTime,
    trainNumbers,
    journeyPayload,
    travelDate,
  });

  res.status(201).json(item);
}));

meRouter.delete('/me/saved-journeys/:id', requirePassengerAuth, asyncHandler(async (req, res) => {
  const passengerId = (req as Request & { passengerId?: string }).passengerId;
  if (!passengerId) throw new ApiError(401, 'Unauthorized');

  await authService.deleteSavedJourney(passengerId, req.params.id);
  res.json({ ok: true });
}));
