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

export interface SncftScheduleCsvRow {
  line: string;
  line_name: string;
  season: string;
  valid_from: string;
  valid_to: string;
  direction: string;
  train_number: string;
  service_code: string;
  station_order: string;
  station: string;
  arrival_time?: string;
  departure_time?: string;
  time?: string;
}

export interface NormalizedScheduleStop {
  tripKey: string;
  lineCode: string;
  lineName: string;
  season: string;
  serviceCode: string;
  direction: string;
  trainNumber: string;
  stationOrder: number;
  stationName: string;
  stationNameNormalized: string;
  arrivalDisplayTime: string;
  departureDisplayTime: string;
  arrivalMinutes: number;
  departureMinutes: number;
  dayOffset: number;
  validFrom: string;
  validTo: string;
}

export interface NormalizedTripRecord {
  externalTripId: string;
  lineCode: string;
  serviceCode: string;
  trainNumber: string;
  direction: string;
  headsign: string;
  validFrom: string;
  validTo: string;
}

export interface NormalizedStopTimeRecord {
  externalTripId: string;
  stationName: string;
  stationOrder: number;
  arrivalDisplayTime: string;
  departureDisplayTime: string;
  arrivalMinutes: number;
  departureMinutes: number;
  dayOffset: number;
}

export interface NormalizedImportOutput {
  trips: NormalizedTripRecord[];
  stopTimes: NormalizedStopTimeRecord[];
  calendars: Array<{
    serviceCode: string;
    validFrom: string;
    validTo: string;
    season: string;
  }>;
}

export interface ScheduleValidationResult {
  validRows: NormalizedScheduleStop[];
  issues: CsvIssue[];
  normalizedOutput?: NormalizedImportOutput;
}
