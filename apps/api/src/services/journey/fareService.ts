import type { FareRecord } from '../../repositories/activeScheduleRepository.js';

export class FareService {
  calculateFare(options: {
    fares: FareRecord[];
    lineCode: string;
    originStationId?: string;
    destinationStationId?: string;
    passengers: number;
  }) {
    const { fares, lineCode, originStationId, destinationStationId, passengers } = options;

    const exact = fares.find(
      (fare) =>
        fare.originStationId === originStationId &&
        fare.destinationStationId === destinationStationId &&
        (!fare.lineCode || fare.lineCode === lineCode),
    );

    const lineDefault = fares.find((fare) => !fare.originStationId && !fare.destinationStationId && (!fare.lineCode || fare.lineCode === lineCode));

    const selected = exact ?? lineDefault;
    const baseAmount = selected?.amount ?? 1.5;
    const currency = selected?.currency ?? 'TND';

    return {
      amount: Number((baseAmount * passengers).toFixed(3)),
      currency,
      passengers,
      baseAmount,
    };
  }
}
