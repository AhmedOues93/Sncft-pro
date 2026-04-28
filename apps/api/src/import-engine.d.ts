declare module '@sncft/import-engine' {
  export type ImportIssue = {
    severity: 'error' | 'warning';
    sourceFile?: string;
    rowNumber?: number;
    fieldName?: string;
    code?: string;
    message: string;
  };

  export type ParsedScheduleRow = Record<string, string>;

  export type NormalizedTrip = Record<string, any>;
  export type NormalizedStopTime = Record<string, any>;
  export type NormalizedCalendar = Record<string, any>;

  export function parseCsv(csvText: string): ParsedScheduleRow[];
  export function parseScheduleCsv(csvText: string): ParsedScheduleRow[];
  export function parseFareCsv(csvText: string): ParsedScheduleRow[];

  export function normalizeStationName(value: string): string;
  export function normalizeTime(value: string): number;

  export function detectOvernightStops(rows: ParsedScheduleRow[]): Record<string, any>[];

  export function validateScheduleRows(rows: ParsedScheduleRow[]): {
    validRows: Record<string, any>[];
    normalized: {
      trips: NormalizedTrip[];
      stopTimes: NormalizedStopTime[];
      calendars: NormalizedCalendar[];
    };
    normalizedOutput: {
      trips: NormalizedTrip[];
      stopTimes: NormalizedStopTime[];
      calendars: NormalizedCalendar[];
    };
    issues: ImportIssue[];
  };

  export function parseAndValidateFares(rows: ParsedScheduleRow[]): {
    fares: Record<string, any>[];
    issues: ImportIssue[];
  };
}
