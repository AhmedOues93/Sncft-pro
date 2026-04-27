import type { SupabaseLikeClient } from '../lib/supabase.js';

export interface StationRecord {
  id: string;
  name: string;
  normalizedName: string;
  aliases: string[];
}

export interface TripRecord {
  importId: string;
  externalTripId: string;
  lineCode: string;
  serviceCode: string;
  trainNumber: string;
  direction: string;
  validFrom: string;
  validTo: string;
}

export interface StopTimeRecord {
  importId: string;
  externalTripId: string;
  stationName: string;
  stationOrder: number;
  arrivalDisplayTime: string;
  departureDisplayTime: string;
  arrivalMinutes: number;
  departureMinutes: number;
  dayOffset: number;
}

export interface FareRecord {
  lineCode?: string;
  originStationId?: string;
  destinationStationId?: string;
  amount: number;
  currency: string;
}

export interface TransferRecord {
  fromStationId: string;
  toStationId: string;
  minTransferMinutes: number;
}

export interface JourneyDataset {
  stations: StationRecord[];
  trips: TripRecord[];
  stopTimes: StopTimeRecord[];
  fares: FareRecord[];
  transfers: TransferRecord[];
}

async function runQuery<T = unknown>(query: any, fallback: string): Promise<T> {
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || fallback);
  }
  return data as T;
}


export interface ActiveScheduleRepositoryLike {
  loadStations(): Promise<StationRecord[]>;
  loadActiveJourneyDataset(): Promise<JourneyDataset>;
}
export class ActiveScheduleRepository implements ActiveScheduleRepositoryLike {
  constructor(private readonly supabase: SupabaseLikeClient) {}

  async loadStations(): Promise<StationRecord[]> {
    const stations =
      (await runQuery<Array<{ id: string; name: string; normalized_name: string }>>(
        this.supabase.from('stations').select('id,name,normalized_name'),
        'Failed to load stations',
      )) ?? [];

    const aliases =
      (await runQuery<Array<{ station_id: string; alias: string }>>(
        this.supabase.from('station_aliases').select('station_id,alias'),
        'Failed to load station aliases',
      )) ?? [];

    const aliasMap = new Map<string, string[]>();
    for (const alias of aliases) {
      if (!aliasMap.has(alias.station_id)) {
        aliasMap.set(alias.station_id, []);
      }
      aliasMap.get(alias.station_id)?.push(alias.alias);
    }

    return stations.map((station) => ({
      id: station.id,
      name: station.name,
      normalizedName: station.normalized_name,
      aliases: aliasMap.get(station.id) ?? [],
    }));
  }

  async loadActiveJourneyDataset(): Promise<JourneyDataset> {
    const activeImports =
      (await runQuery<Array<{ id: string }>>(
        this.supabase.from('imports').select('id').eq('is_active', true),
        'Failed to load active imports',
      )) ?? [];

    const activeImportIds = new Set(activeImports.map((row) => row.id));

    const [stations, rawTrips, rawStops, fares, transfers] = await Promise.all([
      this.loadStations(),
      runQuery<Array<Record<string, unknown>>>(
        this.supabase
          .from('import_trips')
          .select('import_id,external_trip_id,line_code,service_code,train_number,direction,valid_from,valid_to'),
        'Failed to load import trips',
      ),
      runQuery<Array<Record<string, unknown>>>(
        this.supabase
          .from('import_stop_times')
          .select('import_id,external_trip_id,station_name,station_order,arrival_display_time,departure_display_time,arrival_minutes,departure_minutes,day_offset'),
        'Failed to load import stop_times',
      ),
      runQuery<Array<Record<string, unknown>>>(
        this.supabase
          .from('fares')
          .select('line_id,origin_station_id,destination_station_id,amount,currency'),
        'Failed to load fares',
      ),
      runQuery<Array<Record<string, unknown>>>(
        this.supabase
          .from('transfers')
          .select('from_station_id,to_station_id,min_transfer_minutes'),
        'Failed to load transfers',
      ),
    ]);

    const trips: TripRecord[] = (rawTrips ?? [])
      .filter((row) => activeImportIds.has(String(row.import_id)))
      .map((row) => ({
        importId: String(row.import_id),
        externalTripId: String(row.external_trip_id),
        lineCode: String(row.line_code),
        serviceCode: String(row.service_code),
        trainNumber: String(row.train_number),
        direction: String(row.direction),
        validFrom: String(row.valid_from),
        validTo: String(row.valid_to),
      }));

    const stopTimes: StopTimeRecord[] = (rawStops ?? [])
      .filter((row) => activeImportIds.has(String(row.import_id)))
      .map((row) => ({
        importId: String(row.import_id),
        externalTripId: String(row.external_trip_id),
        stationName: String(row.station_name),
        stationOrder: Number(row.station_order),
        arrivalDisplayTime: String(row.arrival_display_time),
        departureDisplayTime: String(row.departure_display_time),
        arrivalMinutes: Number(row.arrival_minutes),
        departureMinutes: Number(row.departure_minutes),
        dayOffset: Number(row.day_offset ?? 0),
      }));

    const fareRecords: FareRecord[] = (fares ?? []).map((fare) => ({
      lineCode: fare.line_id ? String(fare.line_id) : undefined,
      originStationId: fare.origin_station_id ? String(fare.origin_station_id) : undefined,
      destinationStationId: fare.destination_station_id ? String(fare.destination_station_id) : undefined,
      amount: Number(fare.amount ?? 0),
      currency: String(fare.currency ?? 'TND'),
    }));

    const transferRecords: TransferRecord[] = (transfers ?? []).map((transfer) => ({
      fromStationId: String(transfer.from_station_id),
      toStationId: String(transfer.to_station_id),
      minTransferMinutes: Number(transfer.min_transfer_minutes ?? 0),
    }));

    return {
      stations,
      trips,
      stopTimes,
      fares: fareRecords,
      transfers: transferRecords,
    };
  }
}
