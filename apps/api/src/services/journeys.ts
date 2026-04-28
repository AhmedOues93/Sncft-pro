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
    tripStops.sort((a, b) => a.stationOrder - b.stationOrder);
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

function isNormalFare(fare: ParsedFare): boolean {
  const type = String(fare.fareType ?? 'normal').toLowerCase();
  return type === 'normal' || type === 'normal_ticket' || type === 'normal-ticket' || type === 'standard';
}

function fareForSegment(segment: JourneySegment, fares: ParsedFare[]): number {
  if (fares.length === 0) return 1.7;

  const eligible = fares.filter((fare) => (fare.lineCode === segment.lineCode || fare.lineCode === 'ALL') && isNormalFare(fare));

  const exact = eligible.find((fare) => fare.origin === segment.originStationId && fare.destination === segment.destinationStationId);
  if (exact) return exact.amount;

  const reverse = eligible.find((fare) => fare.origin === segment.destinationStationId && fare.destination === segment.originStationId);
  if (reverse) return reverse.amount;

  const lineFallback = eligible.find((fare) => !fare.origin && !fare.destination);
  if (lineFallback) return lineFallback.amount;

  const sectionFallback = eligible
    .filter((fare) => typeof fare.sections === 'number' && fare.sections > 0)
    .sort((a, b) => (a.sections ?? 999) - (b.sections ?? 999))[0];
  if (sectionFallback) return sectionFallback.amount;

  return 0;
}

function computeFare(segments: JourneySegment[], fares: ParsedFare[], passengers: number) {
  const base = segments.reduce((sum, segment) => sum + fareForSegment(segment, fares), 0);
  return {
    amount: Number((base * passengers).toFixed(3)),
    currency: 'TND',
    passengerCount: passengers,
  };
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
    const normalizedStops = tripStops.map(stopToTripStop);
    const originIndex = normalizedStops.findIndex((s) => s.stationId === origin);
    const destinationIndex = normalizedStops.findIndex((s) => s.stationId === destination);

    if (originIndex >= 0 && destinationIndex > originIndex) {
      const segmentStops = normalizedStops.slice(originIndex, destinationIndex + 1);
      const segment: JourneySegment = {
        lineCode: tripStops[0].lineCode,
        trainNumber: tripStops[0].trainNumber,
        originStationId: origin,
        destinationStationId: destination,
        departureTime: segmentStops[0].departureTime,
        arrivalTime: segmentStops[segmentStops.length - 1].arrivalTime,
        departureMinutes: segmentStops[0].departureMinutes,
        arrivalMinutes: segmentStops[segmentStops.length - 1].arrivalMinutes,
        stops: segmentStops,
      };

      if (segment.departureMinutes >= targetMinutes) {
        direct.push({
          type: 'direct',
          segments: [segment],
          departureTime: segment.departureTime,
          arrivalTime: segment.arrivalTime,
          durationMinutes: segment.arrivalMinutes - segment.departureMinutes,
          fare: computeFare([segment], fares, query.passengers),
        });
      }
    }

    if (originIndex >= 0 && originIndex < normalizedStops.length - 1) {
      for (let i = originIndex + 1; i < normalizedStops.length; i += 1) {
        const segmentStops = normalizedStops.slice(originIndex, i + 1);
        candidatesFromOrigin.push({
          lineCode: tripStops[0].lineCode,
          trainNumber: tripStops[0].trainNumber,
          originStationId: origin,
          destinationStationId: segmentStops[segmentStops.length - 1].stationId,
          departureTime: segmentStops[0].departureTime,
          arrivalTime: segmentStops[segmentStops.length - 1].arrivalTime,
          departureMinutes: segmentStops[0].departureMinutes,
          arrivalMinutes: segmentStops[segmentStops.length - 1].arrivalMinutes,
          stops: segmentStops,
        });
      }
    }

    if (destinationIndex > 0) {
      for (let i = 0; i < destinationIndex; i += 1) {
        const segmentStops = normalizedStops.slice(i, destinationIndex + 1);
        candidatesToDestination.push({
          lineCode: tripStops[0].lineCode,
          trainNumber: tripStops[0].trainNumber,
          originStationId: segmentStops[0].stationId,
          destinationStationId: destination,
          departureTime: segmentStops[0].departureTime,
          arrivalTime: segmentStops[segmentStops.length - 1].arrivalTime,
          departureMinutes: segmentStops[0].departureMinutes,
          arrivalMinutes: segmentStops[segmentStops.length - 1].arrivalMinutes,
          stops: segmentStops,
        });
      }
    }
  }

  const transfers: JourneyResult[] = [];
  const seen = new Set<string>();

  for (const left of candidatesFromOrigin) {
    if (left.departureMinutes < targetMinutes) continue;

    for (const right of candidatesToDestination) {
      if (left.destinationStationId !== right.originStationId) continue;

      const wait = right.departureMinutes - left.arrivalMinutes;
      if (wait < 5 || wait > 90) continue;

      const key = `${left.trainNumber}:${left.originStationId}:${left.destinationStationId}:${right.trainNumber}:${right.destinationStationId}:${left.departureMinutes}`;
      if (seen.has(key)) continue;
      seen.add(key);

      transfers.push({
        type: 'transfer',
        segments: [left, right],
        departureTime: left.departureTime,
        arrivalTime: right.arrivalTime,
        durationMinutes: right.arrivalMinutes - left.departureMinutes,
        transferStationId: left.destinationStationId,
        transferWaitMinutes: wait,
        fare: computeFare([left, right], fares, query.passengers),
      });
    }
  }

  const merged = [...direct, ...transfers]
    .sort((a, b) => a.segments[0].departureMinutes - b.segments[0].departureMinutes || a.durationMinutes - b.durationMinutes);

  return {
    total: merged.length,
    items: merged.slice(query.offset, query.offset + query.limit),
  };
}
