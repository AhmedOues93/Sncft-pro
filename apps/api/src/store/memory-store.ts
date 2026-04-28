import { randomUUID } from 'node:crypto';

import type { ImportIssue, ParsedFare, ParsedStop } from '../types.js';
import type { ActiveVersions, DraftImportRecord, ImportKind, ImportStore } from './repository.js';

class MemoryStore implements ImportStore {
  drafts = new Map<string, DraftImportRecord>();
  published: ActiveVersions = {};

  async createDraft(kind: ImportKind, payload: ParsedStop[] | ParsedFare[], summary: Record<string, number>, issues: ImportIssue[], sourceFilename?: string): Promise<DraftImportRecord> {
    const id = randomUUID();
    const status = summary.errors_count ? 'failed' : 'ready';
    const record: DraftImportRecord = { id, kind, createdAt: new Date().toISOString(), status, payload, summary, issues, sourceFilename };
    this.drafts.set(id, record);
    return record;
  }

  async getDraft(id: string): Promise<DraftImportRecord | undefined> {
    return this.drafts.get(id);
  }

  async publishDraft(id: string): Promise<DraftImportRecord> {
    const draft = this.drafts.get(id);
    if (!draft) throw new Error('Draft not found');
    if (draft.status === 'failed') throw new Error('Draft has errors');

    if (draft.kind === 'schedule') {
      this.published.previousScheduleImportId = this.published.scheduleImportId;
      this.published.scheduleImportId = id;
    }

    if (draft.kind === 'fare') {
      this.published.previousFareImportId = this.published.fareImportId;
      this.published.fareImportId = id;
    }

    draft.status = 'published';
    return draft;
  }

  async rollback(id: string): Promise<DraftImportRecord> {
    const draft = this.drafts.get(id);
    if (!draft) throw new Error('Draft not found');

    if (draft.kind === 'schedule' && this.published.previousScheduleImportId) {
      this.published.scheduleImportId = this.published.previousScheduleImportId;
    }

    if (draft.kind === 'fare' && this.published.previousFareImportId) {
      this.published.fareImportId = this.published.previousFareImportId;
    }

    draft.status = 'ready';
    return draft;
  }

  async getPublishedStops(): Promise<ParsedStop[]> {
    if (!this.published.scheduleImportId) return [];
    const schedule = this.drafts.get(this.published.scheduleImportId);
    return (schedule?.payload as ParsedStop[]) ?? [];
  }

  async getPublishedFares(): Promise<ParsedFare[]> {
    if (!this.published.fareImportId) return [];
    const fare = this.drafts.get(this.published.fareImportId);
    return (fare?.payload as ParsedFare[]) ?? [];
  }

  async listDrafts(kind?: ImportKind): Promise<DraftImportRecord[]> {
    const items = Array.from(this.drafts.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return kind ? items.filter((item) => item.kind === kind) : items;
  }

  async getActiveVersions(): Promise<ActiveVersions> {
    return { ...this.published };
  }
}

export const memoryStore = new MemoryStore();
