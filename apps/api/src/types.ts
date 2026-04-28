export type Severity = 'error' | 'warning' | 'info';

export interface ImportIssue {
  severity: Severity;
  sourceFile: string;
  rowNumber?: number;
  fieldName?: string;
  code: string;
  message: string;
}

export interface ParsedStop {
  lineCode: string;
  lineName: string;
  season: string;
  validFrom: string;
  validTo: string;
  direction: string;
  trainNumber: string;
  serviceCode: string;
  stationOrder: number;
  station: string;
  arrivalTime: string;
  departureTime: string;
  arrivalMinutes: number;
  departureMinutes: number;
  dayOffset: number;
}

export interface ParsedFare {
  lineCode: string;
  origin: string;
  destination: string;
  amount: number;
  currency: string;
  fareType?: string;
}

export interface TripStop {
  stationId: string;
  stationName: string;
  stopSequence: number;
  arrivalTime: string;
  departureTime: string;
  arrivalMinutes: number;
  departureMinutes: number;
  dayOffset: number;
}

export interface JourneySegment {
  lineCode: string;
  trainNumber: string;
  originStationId: string;
  destinationStationId: string;
  departureTime: string;
  arrivalTime: string;
  departureMinutes: number;
  arrivalMinutes: number;
  stops: TripStop[];
}

export interface JourneyResult {
  type: 'direct' | 'transfer';
  segments: JourneySegment[];
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  transferStationId?: string;
  transferWaitMinutes?: number;
  fare: {
    amount: number;
    currency: string;
    passengerCount: number;
  };
}
