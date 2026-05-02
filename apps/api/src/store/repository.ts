import type { ImportIssue, ParsedFare, ParsedStop } from '../types.js';

export type ImportKind = 'schedule' | 'fare';

export interface DraftImportRecord {
  id: string;
  kind: ImportKind;
  createdAt: string;
  status: 'ready' | 'failed' | 'published';
  payload: ParsedStop[] | ParsedFare[];
  summary: Record<string, number>;
  issues: ImportIssue[];
  sourceFilename?: string;
}

export interface ActiveVersions {
  scheduleImportId?: string;
  fareImportId?: string;
  previousScheduleImportId?: string;
  previousFareImportId?: string;
}

export interface ImportStore {
  createDraft(kind: ImportKind, payload: ParsedStop[] | ParsedFare[], summary: Record<string, number>, issues: ImportIssue[], sourceFilename?: string): Promise<DraftImportRecord>;
  getDraft(id: string): Promise<DraftImportRecord | undefined>;
  publishDraft(id: string): Promise<DraftImportRecord>;
  rollback(id: string): Promise<DraftImportRecord>;
  deleteDraft(id: string): Promise<void>;
  getPublishedStops(): Promise<ParsedStop[]>;
  getPublishedFares(): Promise<ParsedFare[]>;
  listDrafts(kind?: ImportKind): Promise<DraftImportRecord[]>;
  getActiveVersions(): Promise<ActiveVersions>;
}
