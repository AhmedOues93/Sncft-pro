export type LineCode = 'A' | 'D' | 'E';

export interface Station {
  id: string;
  name: string;
  lineCode: LineCode;
}

export * from './imports/csv-contracts';

export * from './journeys';
