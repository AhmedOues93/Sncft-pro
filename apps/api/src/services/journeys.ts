import { ApiError } from '../errors.js';
import { normalizeStationName } from './imports.js';
import type { JourneyResult, JourneySegment, ParsedFare, ParsedStop, TripStop } from '../types.js';

interface Query {
  originStationId: string;
  destinationStationId: string;
  datetime: string;
  passengers: number;
  offset: number;
  limit: number;
}

interface JourneySearchResult {
  total: number;
  items: JourneyResult[];
}

function formatDisplayTime(totalMinutes: number): string {
  const minuteOfDay = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function parseQueryMinutes(datetime: string): number {
  const timeMatch = String(datetime).match(/T(\d{2}):(\d{2})/);
  if (timeMatch) {
    return Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
  }

  const parsed = new Date(datetime);
  if (Number.isNaN(parsed.getTime())) throw new ApiError(400, 'datetime must be ISO date time');
  return parsed.getUTCHours() * 60 + parsed.getUTCMinutes();
}

function buildTrips(stops: ParsedStop[]): Map<string, ParsedStop[]> {
  const tripMap = new Map<string, ParsedStop[]>();

  stops.forEach((stop) => {
    const key = `${stop.lineCode}:${stop.trainNumber}:${stop.direction}:${stop.serviceCode}:${stop.validFrom}:${stop.validTo}`;
    if (!tripMap.has(key)) tripMap.set(key, []);
    tripMap.get(key)?.push(stop);
  });

  for (const tripStops of tripMap.values()) {
    tripStops.sort((a, b) => {
      if (a.stationOrder !== b.stationOrder) return a.stationOrder - b.stationOrder;
      return a.departureMinutes - b.departureMinutes;
    });
  }

  return tripMap;
}

function stopToTripStop(stop: ParsedStop): TripStop {
  return {
    stationId: normalizeStationName(stop.station),
    stationName: stop.station,
    stopSequence: stop.stationOrder,
    arrivalTime: formatDisplayTime(stop.arrivalMinutes),
    departureTime: formatDisplayTime(stop.departureMinutes),
    arrivalMinutes: stop.arrivalMinutes,
    departureMinutes: stop.departureMinutes,
    dayOffset: stop.dayOffset,
  };
}

function dedupeStops(stops: TripStop[]): TripStop[] {
  const seen = new Set<string>();

  return stops.filter((stop) => {
    const key = `${stop.stationId}:${stop.stopSequence}:${stop.arrivalMinutes}:${stop.departureMinutes}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isNormalFare(fare: ParsedFare): boolean {
  const type = String(fare.fareType ?? 'normal').toLowerCase().trim();

  return type === 'normal'
    || type === 'normal_ticket'
    || type === 'normal-ticket'
    || type === 'standard'
    || type === 'plein tarif'
    || type === 'plein_tarif'
    || type === 'plein-tarif'
    || type === 'pleintarif';
}

function normalizeFareAmount(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;

  // SNCFT fares can be stored as millimes: 500 => 0.500 TND, 1000 => 1.000 TND.
  if (amount >= 100) return amount / 1000;

  return amount;
}

function sameStation(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return normalizeStationName(a) === normalizeStationName(b);
}


function hubEquivalent(a: string, b: string): boolean {
  const left = normalizeStationName(a);
  const right = normalizeStationName(b);

  if (left === right) return true;

  const tunisHub = new Set(['tunis', 'tunis ville']);
  return tunisHub.has(left) && tunisHub.has(right);
}

function segmentSectionCount(segment: JourneySegment): number {
  return Math.max(1, (segment.stops?.length ?? 2) - 1);
}

function fareForSegment(segment: JourneySegment, fares: ParsedFare[]): number {
  const eligible = fares.filter((fare) => {
    const sameLine = fare.lineCode === segment.lineCode || fare.lineCode === 'ALL';
    return sameLine && isNormalFare(fare);
  });

  if (!eligible.length) return 0;

  const exact = eligible.find((fare) => {
    return sameStation(fare.origin, segment.originStationId)
      && sameStation(fare.destination, segment.destinationStationId);
  });

  if (exact) return normalizeFareAmount(exact.amount);

  const reverse = eligible.find((fare) => {
    return sameStation(fare.origin, segment.destinationStationId)
      && sameStation(fare.destination, segment.originStationId);
  });

  if (reverse) return normalizeFareAmount(reverse.amount);

  const sections = segmentSectionCount(segment);
  const sectionFallback = eligible
    .filter((fare) => typeof fare.sections === 'number' && fare.sections > 0)
    .sort((a, b) => Math.abs((a.sections ?? 999) - sections) - Math.abs((b.sections ?? 999) - sections))[0];

  if (sectionFallback) return normalizeFareAmount(sectionFallback.amount);

  const lineFallback = eligible.find((fare) => !fare.origin && !fare.destination);
  if (lineFallback) return normalizeFareAmount(lineFallback.amount);

  return 0;
}

function computeFare(segments: JourneySegment[], fares: ParsedFare[], passengers: number) {
  const passengerCount = Math.max(1, Number(passengers) || 1);

  const breakdown = segments.map((segment) => ({
    lineCode: segment.lineCode,
    originStationId: segment.originStationId,
    destinationStationId: segment.destinationStationId,
    amount: Number(fareForSegment(segment, fares).toFixed(3)),
  }));

  const base = breakdown.reduce((sum, item) => sum + item.amount, 0);

  return {
    amount: Number((base * passengerCount).toFixed(3)),
    currency: 'TND',
    passengerCount,
    breakdown,
  };
}

function isReasonableJourney(durationMinutes: number): boolean {
  return Number.isFinite(durationMinutes) && durationMinutes >= 0 && durationMinutes <= 240;
}

function isValidSegment(segment: JourneySegment): boolean {
  if (segment.originStationId === segment.destinationStationId) return false;
  if (!isReasonableJourney(segment.arrivalMinutes - segment.departureMinutes)) return false;
  if (segment.stops.length < 2) return false;
  return true;
}

function createSegment(tripStops: ParsedStop[], fromIndex: number, toIndex: number): JourneySegment | null {
  const normalizedStops = dedupeStops(tripStops.map(stopToTripStop));
  const segmentStops = normalizedStops.slice(fromIndex, toIndex + 1);

  if (segmentStops.length < 2) return null;

  const segment: JourneySegment = {
    lineCode: tripStops[0].lineCode,
    trainNumber: tripStops[0].trainNumber,
    originStationId: segmentStops[0].stationId,
    destinationStationId: segmentStops[segmentStops.length - 1].stationId,
    departureTime: segmentStops[0].departureTime,
    arrivalTime: segmentStops[segmentStops.length - 1].arrivalTime,
    departureMinutes: segmentStops[0].departureMinutes,
    arrivalMinutes: segmentStops[segmentStops.length - 1].arrivalMinutes,
    stops: segmentStops,
  };

  return isValidSegment(segment) ? segment : null;
}

export function searchJourneys(stops: ParsedStop[], fares: ParsedFare[], query: Query): JourneySearchResult {
  if (!query.originStationId || !query.destinationStationId || !query.datetime) {
    throw new ApiError(400, 'originStationId, destinationStationId and datetime are required');
  }

  const targetMinutes = parseQueryMinutes(query.datetime);
  const trips = buildTrips(stops);
  const origin = normalizeStationName(query.originStationId);
  const destination = normalizeStationName(query.destinationStationId);

  const direct: JourneyResult[] = [];
  const candidatesFromOrigin: JourneySegment[] = [];
  const candidatesToDestination: JourneySegment[] = [];

  for (const tripStops of trips.values()) {
    const normalizedStops = dedupeStops(tripStops.map(stopToTripStop));
    const originIndex = normalizedStops.findIndex((stop) => stop.stationId === origin);
    const destinationIndex = normalizedStops.findIndex((stop) => stop.stationId === destination);

    if (originIndex >= 0 && destinationIndex > originIndex) {
      const segment = createSegment(tripStops, originIndex, destinationIndex);

      if (segment && segment.departureMinutes >= targetMinutes) {
        const durationMinutes = segment.arrivalMinutes - segment.departureMinutes;

        if (isReasonableJourney(durationMinutes)) {
          direct.push({
            type: 'direct',
            segments: [segment],
            departureTime: segment.departureTime,
            arrivalTime: segment.arrivalTime,
            durationMinutes,
            fare: computeFare([segment], fares, query.passengers),
          });
        }
      }
    }

    if (originIndex >= 0 && originIndex < normalizedStops.length - 1) {
      for (let i = originIndex + 1; i < normalizedStops.length; i += 1) {
        const segment = createSegment(tripStops, originIndex, i);
        if (segment && segment.departureMinutes >= targetMinutes) {
          candidatesFromOrigin.push(segment);
        }
      }
    }

    if (destinationIndex > 0) {
      for (let i = 0; i < destinationIndex; i += 1) {
        const segment = createSegment(tripStops, i, destinationIndex);
        if (segment) {
          candidatesToDestination.push(segment);
        }
      }
    }
  }

  const transfers: JourneyResult[] = [];
  const seenTransfers = new Set<string>();

  for (const left of candidatesFromOrigin) {
    for (const right of candidatesToDestination) {
      if (!hubEquivalent(left.destinationStationId, right.originStationId)) continue;

      // Do not create fake correspondence inside the same line.
      if (left.lineCode === right.lineCode) continue;

      // Do not create origin -> origin or destination -> destination pseudo transfers.
      if (left.originStationId === left.destinationStationId) continue;
      if (right.originStationId === right.destinationStationId) continue;

      const wait = right.departureMinutes - left.arrivalMinutes;
      if (wait < 5 || wait > 90) continue;

      const durationMinutes = right.arrivalMinutes - left.departureMinutes;
      if (!isReasonableJourney(durationMinutes)) continue;

      const key = `${left.lineCode}:${left.trainNumber}:${left.originStationId}:${left.destinationStationId}:${right.lineCode}:${right.trainNumber}:${right.destinationStationId}:${left.departureMinutes}:${right.departureMinutes}`;
      if (seenTransfers.has(key)) continue;
      seenTransfers.add(key);

      transfers.push({
        type: 'transfer',
        segments: [left, right],
        departureTime: left.departureTime,
        arrivalTime: right.arrivalTime,
        durationMinutes,
        transferStationId: left.destinationStationId,
        transferWaitMinutes: wait,
        fare: computeFare([left, right], fares, query.passengers),
      });
    }
  }

  const seenJourneys = new Set<string>();
  const merged = [...direct, ...transfers]
    .filter((journey) => {
      if (!isReasonableJourney(journey.durationMinutes)) return false;

      const key = journey.segments
        .map((segment) => `${segment.lineCode}:${segment.trainNumber}:${segment.originStationId}:${segment.destinationStationId}:${segment.departureMinutes}:${segment.arrivalMinutes}`)
        .join('|');

      if (seenJourneys.has(key)) return false;
      seenJourneys.add(key);
      return true;
    })
    .sort((a, b) => {
      const departureDelta = a.segments[0].departureMinutes - b.segments[0].departureMinutes;
      if (departureDelta !== 0) return departureDelta;

      const directDelta = a.segments.length - b.segments.length;
      if (directDelta !== 0) return directDelta;

      const durationDelta = a.durationMinutes - b.durationMinutes;
      if (durationDelta !== 0) return durationDelta;

      return String(a.segments[0].trainNumber).localeCompare(String(b.segments[0].trainNumber));
    });

  return {
    total: merged.length,
    items: merged.slice(query.offset, query.offset + query.limit),
  };
}
