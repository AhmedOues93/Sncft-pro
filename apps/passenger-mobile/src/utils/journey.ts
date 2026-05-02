import type {
  FavoriteJourneySnapshot,
  Journey,
  JourneyResponse,
  SearchContext,
  TripHistoryEntry,
} from '../types';
import { formatLongDate } from './date';
import { titleCase } from './station';

export function formatFare(journey: Journey): string {
  const amount = Number(journey.fare?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Tarif indisponible';
  }
  return `${amount.toFixed(3)} ${journey.fare?.currency || 'TND'}`;
}

export function journeyTypeLabel(journey: Journey): string {
  if (journey.type === 'transfer' || journey.segments.length > 1) {
    const transfers = Math.max(1, journey.segments.length - 1);
    return `${transfers} correspondance${transfers > 1 ? 's' : ''}`;
  }
  return 'Direct';
}

export function trainSummary(journey: Journey): string {
  return journey.segments.map((segment) => segment.trainNumber).filter(Boolean).join(' + ');
}

export function journeyKey(journey: Journey): string {
  const segmentKey = journey.segments
    .map(
      (segment) =>
        `${segment.lineCode}-${segment.trainNumber}-${segment.originStationId}-${segment.destinationStationId}`,
    )
    .join('|');

  return `${segmentKey}:${journey.departureTime}:${journey.arrivalTime}`;
}

export function createFavoriteSnapshot(
  journey: Journey,
  searchContext: SearchContext,
): FavoriteJourneySnapshot {
  const first = journey.segments[0];
  const last = journey.segments[journey.segments.length - 1];

  return {
    key: journeyKey(journey),
    originId: first?.originStationId || searchContext.origin.id,
    destinationId: last?.destinationStationId || searchContext.destination.id,
    originName: titleCase(first?.stops?.[0]?.stationName || searchContext.origin.name),
    destinationName: titleCase(
      last?.stops?.[last.stops.length - 1]?.stationName || searchContext.destination.name,
    ),
    departureTime: journey.departureTime,
    arrivalTime: journey.arrivalTime,
    durationMinutes: journey.durationMinutes,
    fareLabel: formatFare(journey),
    trainLabel: trainSummary(journey),
    typeLabel: journeyTypeLabel(journey),
    lineCodes: journey.segments.map((segment) => segment.lineCode),
    passengers: searchContext.passengers,
    datetime: searchContext.originalDatetime,
  };
}

export function createTripHistoryEntry(
  searchContext: SearchContext,
  response: JourneyResponse,
): TripHistoryEntry {
  return {
    id: `${searchContext.origin.id}-${searchContext.destination.id}-${searchContext.originalDatetime}`,
    originId: searchContext.origin.id,
    destinationId: searchContext.destination.id,
    originName: searchContext.origin.name,
    destinationName: searchContext.destination.name,
    passengers: searchContext.passengers,
    originalDatetime: searchContext.originalDatetime,
    effectiveDatetime: searchContext.effectiveDatetime,
    resultCount: response.count || 0,
    createdAt: new Date().toISOString(),
  };
}

export function formatSearchMeta(searchContext: SearchContext): string {
  return `${titleCase(searchContext.origin.name)} vers ${titleCase(
    searchContext.destination.name,
  )} · ${formatLongDate(searchContext.originalDatetime)} · ${searchContext.passengers} passager${
    searchContext.passengers > 1 ? 's' : ''
  }`;
}
