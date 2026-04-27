import { randomUUID } from 'node:crypto';

import type { ParsedFare, ParsedStop } from '../types.js';

interface DraftImport {
  id: string;
  kind: 'schedule' | 'fare';
  createdAt: string;
  status: 'ready' | 'failed' | 'published';
  payload: unknown;
  summary: Record<string, number>;
  issues: unknown[];
}

interface PublishedState {
  scheduleImportId?: string;
  fareImportId?: string;
  previousScheduleImportId?: string;
  previousFareImportId?: string;
}

class MemoryStore {
  drafts = new Map<string, DraftImport>();
  published: PublishedState = {};

  createDraft(kind: DraftImport['kind'], payload: ParsedStop[] | ParsedFare[], summary: Record<string, number>, issues: unknown[]): DraftImport {
    const id = randomUUID();
    const status = summary.errors_count ? 'failed' : 'ready';
    const record: DraftImport = { id, kind, createdAt: new Date().toISOString(), status, payload, summary, issues };
    this.drafts.set(id, record);
    return record;
  }

  getDraft(id: string): DraftImport | undefined {
    return this.drafts.get(id);
  }

  publishDraft(id: string): DraftImport {
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

  rollback(id: string): DraftImport {
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

  getPublishedStops(): ParsedStop[] {
    if (!this.published.scheduleImportId) return [];
    const schedule = this.drafts.get(this.published.scheduleImportId);
    return (schedule?.payload as ParsedStop[]) ?? [];
  }

  getPublishedFares(): ParsedFare[] {
    if (!this.published.fareImportId) return [];
    const fare = this.drafts.get(this.published.fareImportId);
    return (fare?.payload as ParsedFare[]) ?? [];
  }
}

export const memoryStore = new MemoryStore();
