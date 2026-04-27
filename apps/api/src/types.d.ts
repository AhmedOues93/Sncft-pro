declare module '@sncft/import-engine' {
  export function parseScheduleCsv(csvText: string): Array<Record<string, string>>;
  export function validateScheduleRows(rows: Array<Record<string, string>>): {
    validRows: Array<Record<string, unknown>>;
    issues: Array<{
      severity: 'error' | 'warning' | 'info';
      sourceFile: string;
      rowNumber?: number;
      fieldName?: string;
      code: string;
      message: string;
      context?: Record<string, unknown>;
    }>;
    normalizedOutput?: {
      trips: Array<{
        externalTripId: string;
        lineCode: string;
        serviceCode: string;
        trainNumber: string;
        direction: string;
        headsign: string;
        validFrom: string;
        validTo: string;
      }>;
      stopTimes: Array<{
        externalTripId: string;
        stationName: string;
        stationOrder: number;
        arrivalDisplayTime: string;
        departureDisplayTime: string;
        arrivalMinutes: number;
        departureMinutes: number;
        dayOffset: number;
      }>;
      calendars: Array<{
        serviceCode: string;
        validFrom: string;
        validTo: string;
        season: string;
      }>;
    };
  };
}
