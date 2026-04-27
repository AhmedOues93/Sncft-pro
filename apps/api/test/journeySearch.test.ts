import assert from 'node:assert/strict';
import test from 'node:test';

import type { ActiveScheduleRepositoryLike, JourneyDataset } from '../src/repositories/activeScheduleRepository.js';
import { JourneySearchService } from '../src/services/journey/journeySearchService.js';

class MockActiveScheduleRepository implements ActiveScheduleRepositoryLike {
  constructor(private readonly dataset: JourneyDataset) {}

  async loadStations() {
    return this.dataset.stations;
  }

  async loadActiveJourneyDataset() {
    return this.dataset;
  }
}

const stations = [
  { id: 'st_tunis', name: 'Tunis Ville', normalizedName: 'tunis ville', aliases: [] },
  { id: 'st_erriadh', name: 'Erriadh', normalizedName: 'erriadh', aliases: [] },
  { id: 'st_hlif', name: 'Hammam Lif', normalizedName: 'hammam lif', aliases: [] },
  { id: 'st_bougatfa', name: 'Bougatfa', normalizedName: 'bougatfa', aliases: [] },
  { id: 'st_rades', name: 'Rades', normalizedName: 'rades', aliases: [] },
];

const baseDataset: JourneyDataset = {
  stations,
  trips: [
    {
      importId: 'imp1',
      externalTripId: 'trip_direct_a_1',
      lineCode: 'A',
      serviceCode: 'WKD',
      trainNumber: '104',
      direction: 'outbound',
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
    },
    {
      importId: 'imp1',
      externalTripId: 'trip_partial_a_1',
      lineCode: 'A',
      serviceCode: 'WKD',
      trainNumber: '204',
      direction: 'outbound',
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
    },
    {
      importId: 'imp1',
      externalTripId: 'trip_overnight_a_1',
      lineCode: 'A',
      serviceCode: 'WKD',
      trainNumber: '304',
      direction: 'outbound',
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
    },
    {
      importId: 'imp1',
      externalTripId: 'trip_transfer_leg1',
      lineCode: 'D',
      serviceCode: 'WKD',
      trainNumber: '401',
      direction: 'inbound',
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
    },
    {
      importId: 'imp1',
      externalTripId: 'trip_transfer_leg2',
      lineCode: 'E',
      serviceCode: 'WKD',
      trainNumber: '501',
      direction: 'outbound',
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
    },
  ],
  stopTimes: [
    // direct Tunis Ville -> Erriadh
    { importId: 'imp1', externalTripId: 'trip_direct_a_1', stationName: 'Tunis Ville', stationOrder: 1, arrivalDisplayTime: '07:10', departureDisplayTime: '07:12', arrivalMinutes: 430, departureMinutes: 432, dayOffset: 0 },
    { importId: 'imp1', externalTripId: 'trip_direct_a_1', stationName: 'Erriadh', stationOrder: 2, arrivalDisplayTime: '07:40', departureDisplayTime: '07:41', arrivalMinutes: 460, departureMinutes: 461, dayOffset: 0 },

    // partial Tunis Ville -> Hammam Lif
    { importId: 'imp1', externalTripId: 'trip_partial_a_1', stationName: 'Tunis Ville', stationOrder: 1, arrivalDisplayTime: '08:00', departureDisplayTime: '08:02', arrivalMinutes: 480, departureMinutes: 482, dayOffset: 0 },
    { importId: 'imp1', externalTripId: 'trip_partial_a_1', stationName: 'Hammam Lif', stationOrder: 2, arrivalDisplayTime: '08:25', departureDisplayTime: '08:26', arrivalMinutes: 505, departureMinutes: 506, dayOffset: 0 },

    // overnight Tunis Ville -> Erriadh
    { importId: 'imp1', externalTripId: 'trip_overnight_a_1', stationName: 'Tunis Ville', stationOrder: 1, arrivalDisplayTime: '23:30', departureDisplayTime: '23:30', arrivalMinutes: 1410, departureMinutes: 1410, dayOffset: 0 },
    { importId: 'imp1', externalTripId: 'trip_overnight_a_1', stationName: 'Erriadh', stationOrder: 2, arrivalDisplayTime: '00:11', departureDisplayTime: '00:12', arrivalMinutes: 1451, departureMinutes: 1452, dayOffset: 1 },

    // transfer Bougatfa -> Tunis Ville -> Rades
    { importId: 'imp1', externalTripId: 'trip_transfer_leg1', stationName: 'Bougatfa', stationOrder: 1, arrivalDisplayTime: '09:00', departureDisplayTime: '09:01', arrivalMinutes: 540, departureMinutes: 541, dayOffset: 0 },
    { importId: 'imp1', externalTripId: 'trip_transfer_leg1', stationName: 'Tunis Ville', stationOrder: 2, arrivalDisplayTime: '09:20', departureDisplayTime: '09:21', arrivalMinutes: 560, departureMinutes: 561, dayOffset: 0 },

    { importId: 'imp1', externalTripId: 'trip_transfer_leg2', stationName: 'Tunis Ville', stationOrder: 1, arrivalDisplayTime: '09:35', departureDisplayTime: '09:36', arrivalMinutes: 575, departureMinutes: 576, dayOffset: 0 },
    { importId: 'imp1', externalTripId: 'trip_transfer_leg2', stationName: 'Rades', stationOrder: 2, arrivalDisplayTime: '09:55', departureDisplayTime: '09:56', arrivalMinutes: 595, departureMinutes: 596, dayOffset: 0 },
  ],
  fares: [{ amount: 2, currency: 'TND' }],
  transfers: [],
};

test('Tunis Ville -> Erriadh direct journey is returned', async () => {
  const service = new JourneySearchService(new MockActiveScheduleRepository(baseDataset));
  const result = await service.searchJourneys({
    originStationId: 'st_tunis',
    destinationStationId: 'st_erriadh',
    datetime: '2026-06-01T07:00:00Z',
    passengers: 1,
    offset: 0,
    limit: 5,
  });

  assert.ok(result.journeys.some((journey) => journey.type === 'direct'));
});

test('Tunis Ville -> Hammam Lif partial trip is valid', async () => {
  const service = new JourneySearchService(new MockActiveScheduleRepository(baseDataset));
  const result = await service.searchJourneys({
    originStationId: 'st_tunis',
    destinationStationId: 'st_hlif',
    datetime: '2026-06-01T07:00:00Z',
    passengers: 1,
    offset: 0,
    limit: 5,
  });

  assert.equal(result.journeys[0]?.segments[0]?.destinationStationName, 'Hammam Lif');
});

test('overnight trip keeps next-day arrival minutes', async () => {
  const service = new JourneySearchService(new MockActiveScheduleRepository(baseDataset));
  const result = await service.searchJourneys({
    originStationId: 'st_tunis',
    destinationStationId: 'st_erriadh',
    datetime: '2026-06-01T23:00:00Z',
    passengers: 1,
    offset: 0,
    limit: 5,
  });

  const overnight = result.journeys.find((journey) => journey.segments[0]?.trainNumber === '304');
  assert.ok(overnight);
  assert.equal(overnight?.durationMinutes, 41);
});

test('Bougatfa -> Rades can route via Tunis Ville transfer', async () => {
  const service = new JourneySearchService(new MockActiveScheduleRepository(baseDataset));
  const result = await service.searchJourneys({
    originStationId: 'st_bougatfa',
    destinationStationId: 'st_rades',
    datetime: '2026-06-01T08:30:00Z',
    passengers: 1,
    offset: 0,
    limit: 5,
  });

  assert.equal(result.journeys[0]?.type, 'transfer');
  assert.equal(result.journeys[0]?.transferStationName, 'Tunis Ville');
  assert.ok((result.journeys[0]?.transferWaitMinutes ?? 0) >= 5);
  assert.ok((result.journeys[0]?.transferWaitMinutes ?? 0) <= 90);
});

test('passenger count multiplies fare', async () => {
  const service = new JourneySearchService(new MockActiveScheduleRepository(baseDataset));
  const onePassenger = await service.searchJourneys({
    originStationId: 'st_tunis',
    destinationStationId: 'st_erriadh',
    datetime: '2026-06-01T07:00:00Z',
    passengers: 1,
    offset: 0,
    limit: 5,
  });
  const twoPassengers = await service.searchJourneys({
    originStationId: 'st_tunis',
    destinationStationId: 'st_erriadh',
    datetime: '2026-06-01T07:00:00Z',
    passengers: 2,
    offset: 0,
    limit: 5,
  });

  assert.equal(twoPassengers.journeys[0]?.fare.amount, (onePassenger.journeys[0]?.fare.amount ?? 0) * 2);
});
