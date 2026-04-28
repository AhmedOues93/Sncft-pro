import { normalizeStationName } from '@sncft/import-engine';

import type {
  ActiveScheduleRepositoryLike,
  JourneyDataset,
  StationRecord,
  StopTimeRecord,
  TripRecord,
} from '../../repositories/activeScheduleRepository.js';
import { FareService } from './fareService.js';

interface JourneySearchParams {
  originStationId: string;
  destinationStationId: string;
  datetime: string;
  passengers: number;
  offset: number;
  limit: number;
}

interface SegmentStop {
  stationId: string;
  stationName: string;
  stationOrder: number;
  arrivalDisplayTime: string;
  departureDisplayTime: string;
  arrivalMinutes: number;
  departureMinutes: number;
}

interface JourneySegment {
  tripId: string;
  lineCode: string;
  trainNumber: string;
  direction: string;
  originStationId: string;
  destinationStationId: string;
  originStationName: string;
  destinationStationName: string;
  departureDisplayTime: string;
  arrivalDisplayTime: string;
  departureMinutes: number;
  arrivalMinutes: number;
  stops: SegmentStop[];
}

interface BuiltJourney {
  id: string;
  type: 'direct' | 'transfer';
  departureDateTime: string;
  arrivalDateTime: string;
  durationMinutes: number;
  transferWaitMinutes: number;
  transferStationId?: string;
  transferStationName?: string;
  fare: { amount: number; currency: string; passengers: number; baseAmount: number };
  segments: JourneySegment[];
}

function toIsoFromBase(baseDate: Date, minuteOfServiceDay: number): string {
  const date = new Date(baseDate.getTime());
  date.setUTCMinutes(date.getUTCMinutes() + minuteOfServiceDay);
  return date.toISOString();
}

function journeyIdFromSegments(segments: JourneySegment[]): string {
  return Buffer.from(
    segments.map((segment) => `${segment.tripId}:${segment.originStationId}->${segment.destinationStationId}`).join('|'),
  ).toString('base64url');
}

export class JourneySearchService {
  constructor(
    private readonly repository: ActiveScheduleRepositoryLike,
    private readonly fareService = new FareService(),
  ) {}

  private resolveStationById(stations: StationRecord[], stationId: string) {
    return stations.find((station) => station.id === stationId);
  }

  private findTunisVilleStation(stations: StationRecord[]) {
    return stations.find((station) => normalizeStationName(station.name) === 'tunis ville');
  }

  private buildStationLookup(stations: StationRecord[]) {
    const byId = new Map<string, StationRecord>();
    const byNormalizedName = new Map<string, StationRecord>();

    for (const station of stations) {
      byId.set(station.id, station);
      byNormalizedName.set(normalizeStationName(station.name), station);
      for (const alias of station.aliases) {
        byNormalizedName.set(normalizeStationName(alias), station);
      }
    }

    return { byId, byNormalizedName };
  }

  private segmentFromTrip(options: {
    trip: TripRecord;
    stopTimes: StopTimeRecord[];
    originStationId: string;
    destinationStationId: string;
    stationByNormalizedName: Map<string, StationRecord>;
  }): JourneySegment | null {
    const { trip, stopTimes, originStationId, destinationStationId, stationByNormalizedName } = options;
    const ordered = stopTimes.slice().sort((a, b) => a.stationOrder - b.stationOrder);

    let originIndex = -1;
    let destinationIndex = -1;

    for (let i = 0; i < ordered.length; i += 1) {
      const station = stationByNormalizedName.get(normalizeStationName(ordered[i].stationName));
      if (!station) {
        continue;
      }
      if (originIndex === -1 && station.id === originStationId) {
        originIndex = i;
      }
      if (originIndex !== -1 && station.id === destinationStationId && i > originIndex) {
        destinationIndex = i;
        break;
      }
    }

    if (originIndex === -1 || destinationIndex === -1) {
      return null;
    }

    const originStop = ordered[originIndex];
    const destinationStop = ordered[destinationIndex];

    const timelineStops: SegmentStop[] = ordered.slice(originIndex, destinationIndex + 1).map((stop) => {
      const station = stationByNormalizedName.get(normalizeStationName(stop.stationName));
      return {
        stationId: station?.id ?? normalizeStationName(stop.stationName),
        stationName: station?.name ?? stop.stationName,
        stationOrder: stop.stationOrder,
        arrivalDisplayTime: stop.arrivalDisplayTime,
        departureDisplayTime: stop.departureDisplayTime,
        arrivalMinutes: stop.arrivalMinutes,
        departureMinutes: stop.departureMinutes,
      };
    });

    const originStation = stationByNormalizedName.get(normalizeStationName(originStop.stationName));
    const destinationStation = stationByNormalizedName.get(normalizeStationName(destinationStop.stationName));

    return {
      tripId: trip.externalTripId,
      lineCode: trip.lineCode,
      trainNumber: trip.trainNumber,
      direction: trip.direction,
      originStationId,
      destinationStationId,
      originStationName: originStation?.name ?? originStop.stationName,
      destinationStationName: destinationStation?.name ?? destinationStop.stationName,
      departureDisplayTime: originStop.departureDisplayTime,
      arrivalDisplayTime: destinationStop.arrivalDisplayTime,
      departureMinutes: originStop.departureMinutes,
      arrivalMinutes: destinationStop.arrivalMinutes,
      stops: timelineStops,
    };
  }

  private findDirectSegments(
    dataset: JourneyDataset,
    originStationId: string,
    destinationStationId: string,
    requestedMinute: number,
  ): JourneySegment[] {
    const stationLookup = this.buildStationLookup(dataset.stations);

    const stopTimesByTrip = new Map<string, StopTimeRecord[]>();
    for (const stopTime of dataset.stopTimes) {
      const key = `${stopTime.importId}|${stopTime.externalTripId}`;
      if (!stopTimesByTrip.has(key)) {
        stopTimesByTrip.set(key, []);
      }
      stopTimesByTrip.get(key)?.push(stopTime);
    }

    const segments: JourneySegment[] = [];

    for (const trip of dataset.trips) {
      const key = `${trip.importId}|${trip.externalTripId}`;
      const segment = this.segmentFromTrip({
        trip,
        stopTimes: stopTimesByTrip.get(key) ?? [],
        originStationId,
        destinationStationId,
        stationByNormalizedName: stationLookup.byNormalizedName,
      });

      if (!segment) {
        continue;
      }

      if (segment.departureMinutes >= requestedMinute) {
        segments.push(segment);
      }
    }

    return segments;
  }

  async searchJourneys(params: JourneySearchParams) {
    const requestedDate = new Date(params.datetime);
    if (Number.isNaN(requestedDate.getTime())) {
      throw new Error('Invalid datetime; expected ISO datetime');
    }

    const baseDate = new Date(Date.UTC(requestedDate.getUTCFullYear(), requestedDate.getUTCMonth(), requestedDate.getUTCDate(), 0, 0, 0));
    const requestedMinute = requestedDate.getUTCHours() * 60 + requestedDate.getUTCMinutes();

    const dataset = await this.repository.loadActiveJourneyDataset();
    const originStation = this.resolveStationById(dataset.stations, params.originStationId);
    const destinationStation = this.resolveStationById(dataset.stations, params.destinationStationId);

    if (!originStation || !destinationStation) {
      throw new Error('originStationId or destinationStationId not found');
    }

    const directSegments = this.findDirectSegments(dataset, params.originStationId, params.destinationStationId, requestedMinute);

    const journeys: BuiltJourney[] = directSegments.map((segment) => ({
      id: journeyIdFromSegments([segment]),
      type: 'direct',
      departureDateTime: toIsoFromBase(baseDate, segment.departureMinutes),
      arrivalDateTime: toIsoFromBase(baseDate, segment.arrivalMinutes),
      durationMinutes: segment.arrivalMinutes - segment.departureMinutes,
      transferWaitMinutes: 0,
      fare: this.fareService.calculateFare({
        fares: dataset.fares,
        lineCode: segment.lineCode,
        originStationId: params.originStationId,
        destinationStationId: params.destinationStationId,
        passengers: params.passengers,
      }),
      segments: [segment],
    }));

    const tunisVille = this.findTunisVilleStation(dataset.stations);

    if (tunisVille && params.originStationId !== tunisVille.id && params.destinationStationId !== tunisVille.id) {
      const firstLegs = this.findDirectSegments(dataset, params.originStationId, tunisVille.id, requestedMinute);
      const secondLegs = this.findDirectSegments(dataset, tunisVille.id, params.destinationStationId, requestedMinute);

      for (const firstLeg of firstLegs) {
        for (const secondLeg of secondLegs) {
          const wait = secondLeg.departureMinutes - firstLeg.arrivalMinutes;
          if (wait < 5 || wait > 90) {
            continue;
          }

          journeys.push({
            id: journeyIdFromSegments([firstLeg, secondLeg]),
            type: 'transfer',
            departureDateTime: toIsoFromBase(baseDate, firstLeg.departureMinutes),
            arrivalDateTime: toIsoFromBase(baseDate, secondLeg.arrivalMinutes),
            durationMinutes: secondLeg.arrivalMinutes - firstLeg.departureMinutes,
            transferWaitMinutes: wait,
            transferStationId: tunisVille.id,
            transferStationName: tunisVille.name,
            fare: {
              amount: Number((
                this.fareService.calculateFare({
                  fares: dataset.fares,
                  lineCode: firstLeg.lineCode,
                  originStationId: params.originStationId,
                  destinationStationId: tunisVille.id,
                  passengers: params.passengers,
                }).amount +
                this.fareService.calculateFare({
                  fares: dataset.fares,
                  lineCode: secondLeg.lineCode,
                  originStationId: tunisVille.id,
                  destinationStationId: params.destinationStationId,
                  passengers: params.passengers,
                }).amount
              ).toFixed(3)),
              currency: 'TND',
              passengers: params.passengers,
              baseAmount: 0,
            },
            segments: [firstLeg, secondLeg],
          });
        }
      }
    }

    journeys.sort((a, b) => a.departureDateTime.localeCompare(b.departureDateTime));

    const offset = Math.max(0, params.offset);
    const limit = Math.max(1, params.limit || 5);

    const paged = journeys.slice(offset, offset + limit);

    return {
      query: {
        originStationId: params.originStationId,
        destinationStationId: params.destinationStationId,
        datetime: params.datetime,
        passengers: params.passengers,
        offset,
        limit,
      },
      pagination: {
        total: journeys.length,
        hasEarlier: offset > 0,
        hasLater: offset + limit < journeys.length,
        nextOffset: offset + limit < journeys.length ? offset + limit : null,
        previousOffset: offset > 0 ? Math.max(0, offset - limit) : null,
      },
      journeys: paged,
      note: 'Use GET /journeys/search response payload for MVP journey details.',
    };
  }
}
