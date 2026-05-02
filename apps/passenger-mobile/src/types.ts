export type PassengerTabKey = 'search' | 'favorites' | 'trips' | 'profile';

export interface StationItem {
  id: string;
  name: string;
}

export interface StationFieldValue {
  query: string;
  selected: StationItem | null;
  suggestions: StationItem[];
  loading: boolean;
  error: string;
}

export interface JourneyStop {
  stationId: string;
  stationName: string;
  stopSequence: number;
  arrivalTime?: string;
  departureTime?: string;
  arrivalMinutes?: number;
  departureMinutes?: number;
  dayOffset?: number;
}

export interface JourneySegment {
  lineCode: string;
  trainNumber: string;
  originStationId: string;
  destinationStationId: string;
  departureTime: string;
  arrivalTime: string;
  departureMinutes?: number;
  arrivalMinutes?: number;
  stops: JourneyStop[];
}

export interface JourneyFare {
  amount: number;
  currency: string;
  passengerCount: number;
}

export interface Journey {
  type: 'direct' | 'transfer';
  segments: JourneySegment[];
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  transferStationId?: string;
  transferWaitMinutes?: number;
  fare?: JourneyFare;
}

export interface JourneyResponse {
  offset: number;
  limit: number;
  count: number;
  total: number;
  hasPrevious: boolean;
  hasNext: boolean;
  previousOffset: number;
  nextOffset: number;
  items: Journey[];
}

export interface SearchContext {
  origin: StationItem;
  destination: StationItem;
  passengers: number;
  originalDatetime: string;
  effectiveDatetime: string;
  offset: number;
}

export interface FavoriteJourneySnapshot {
  key: string;
  originId: string;
  originName: string;
  destinationId: string;
  destinationName: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  fareLabel: string;
  trainLabel: string;
  typeLabel: string;
  lineCodes: string[];
  passengers: number;
  datetime: string;
}

export interface TripHistoryEntry {
  id: string;
  originId: string;
  originName: string;
  destinationId: string;
  destinationName: string;
  passengers: number;
  originalDatetime: string;
  effectiveDatetime: string;
  resultCount: number;
  createdAt: string;
}

export interface Account {
  matricule: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  createdAt: string;
}
