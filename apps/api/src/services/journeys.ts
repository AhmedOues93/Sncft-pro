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

const TRANSFER_HUB = 'tunis ville';

function formatDisplayTime(totalMinutes: number): string {
  const minuteOfDay = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
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

function fareForSegment(segment: JourneySegment, fares: ParsedFare[]): number {
  const exact = fares.find((fare) =>
    (fare.lineCode === segment.lineCode || fare.lineCode === 'ALL') &&
    fare.origin === segment.originStationId &&
    fare.destination === segment.destinationStationId,
  );

  if (exact) return exact.amount;

  const lineFallback = fares.find((fare) => fare.lineCode === segment.lineCode && !fare.origin && !fare.destination);
  if (lineFallback) return lineFallback.amount;

  return 1.7;
}

function computeFare(segments: JourneySegment[], fares: ParsedFare[], passengers: number) {
  const base = segments.reduce((sum, segment) => sum + fareForSegment(segment, fares), 0);
  return {
    amount: Number((base * passengers).toFixed(3)),
    currency: 'TND',
    passengerCount: passengers,
  };
}

export function searchJourneys(stops: ParsedStop[], fares: ParsedFare[], query: Query): JourneyResult[] {
  if (!query.originStationId || !query.destinationStationId || !query.datetime) {
    throw new ApiError(400, 'originStationId, destinationStationId and datetime are required');
  }

  const targetDeparture = new Date(query.datetime);
  if (Number.isNaN(targetDeparture.getTime())) throw new ApiError(400, 'datetime must be ISO date time');
  const targetMinutes = targetDeparture.getUTCHours() * 60 + targetDeparture.getUTCMinutes();

  const trips = buildTrips(stops);
  const origin = normalizeStationName(query.originStationId);
  const destination = normalizeStationName(query.destinationStationId);

  const direct: JourneyResult[] = [];
  const toHub: JourneySegment[] = [];
  const fromHub: JourneySegment[] = [];

  for (const tripStops of trips.values()) {
    const normalizedStops = tripStops.map(stopToTripStop);
    const originIndex = normalizedStops.findIndex((s) => s.stationId === origin);
    const destinationIndex = normalizedStops.findIndex((s) => s.stationId === destination);
    const hubIndex = normalizedStops.findIndex((s) => s.stationId === TRANSFER_HUB);

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

    if (originIndex >= 0 && hubIndex > originIndex) {
      const segmentStops = normalizedStops.slice(originIndex, hubIndex + 1);
      toHub.push({
        lineCode: tripStops[0].lineCode,
        trainNumber: tripStops[0].trainNumber,
        originStationId: origin,
        destinationStationId: TRANSFER_HUB,
        departureTime: segmentStops[0].departureTime,
        arrivalTime: segmentStops[segmentStops.length - 1].arrivalTime,
        departureMinutes: segmentStops[0].departureMinutes,
        arrivalMinutes: segmentStops[segmentStops.length - 1].arrivalMinutes,
        stops: segmentStops,
      });
    }

    if (hubIndex >= 0 && destinationIndex > hubIndex) {
      const segmentStops = normalizedStops.slice(hubIndex, destinationIndex + 1);
      fromHub.push({
        lineCode: tripStops[0].lineCode,
        trainNumber: tripStops[0].trainNumber,
        originStationId: TRANSFER_HUB,
        destinationStationId: destination,
        departureTime: segmentStops[0].departureTime,
        arrivalTime: segmentStops[segmentStops.length - 1].arrivalTime,
        departureMinutes: segmentStops[0].departureMinutes,
        arrivalMinutes: segmentStops[segmentStops.length - 1].arrivalMinutes,
        stops: segmentStops,
      });
    }
  }

  const transfers: JourneyResult[] = [];
  for (const left of toHub) {
    for (const right of fromHub) {
      const wait = right.departureMinutes - left.arrivalMinutes;
      if (wait < 5 || wait > 90) continue;
      if (left.departureMinutes < targetMinutes) continue;

      transfers.push({
        type: 'transfer',
        segments: [left, right],
        departureTime: left.departureTime,
        arrivalTime: right.arrivalTime,
        durationMinutes: right.arrivalMinutes - left.departureMinutes,
        transferStationId: TRANSFER_HUB,
        transferWaitMinutes: wait,
        fare: computeFare([left, right], fares, query.passengers),
      });
    }
  }

  return [...direct, ...transfers]
    .sort((a, b) => a.segments[0].departureMinutes - b.segments[0].departureMinutes)
    .slice(query.offset, query.offset + query.limit);
}
