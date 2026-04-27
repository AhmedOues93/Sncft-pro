export type CsvIssueSeverity = 'error' | 'warning' | 'info';

export interface CsvIssue {
  severity: CsvIssueSeverity;
  sourceFile: string;
  rowNumber?: number;
  fieldName?: string;
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface LineCsvRow {
  line_code: string;
  line_name: string;
  color?: string;
  active?: string;
}

export interface StationCsvRow {
  station_id: string;
  station_name: string;
  lat?: string;
  lon?: string;
  aliases?: string;
}

export interface ScheduleCsvRow {
  trip_id: string;
  line_code: string;
  service_id: string;
  train_number?: string;
  headsign?: string;
  direction_id?: string;
  station_id: string;
  stop_sequence: string;
  arrival_time: string;
  departure_time: string;
}

export interface FareCsvRow {
  line_code?: string;
  origin_station_id?: string;
  destination_station_id?: string;
  currency: string;
  amount: string;
  passenger_type?: string;
}

export interface NormalizedScheduleStop {
  tripId: string;
  lineCode: string;
  serviceId: string;
  stationId: string;
  stopSequence: number;
  arrivalTimeRaw: string;
  departureTimeRaw: string;
  arrivalMinutes: number;
  departureMinutes: number;
  dayOffset: number;
  trainNumber?: string;
  headsign?: string;
  directionId?: 0 | 1;
}

export interface ScheduleValidationResult {
  validRows: NormalizedScheduleStop[];
  issues: CsvIssue[];
}
