export interface JourneySearchQuery {
  originStationId: string;
  destinationStationId: string;
  datetime: string;
  passengers: number;
  offset: number;
  limit: number;
}

export interface JourneySegmentResponse {
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
}

export interface JourneyCardResponse {
  id: string;
  type: 'direct' | 'transfer';
  departureDateTime: string;
  arrivalDateTime: string;
  durationMinutes: number;
  transferWaitMinutes: number;
  transferStationId?: string;
  transferStationName?: string;
  fare: {
    amount: number;
    currency: string;
    passengers: number;
    baseAmount: number;
  };
  segments: JourneySegmentResponse[];
}
