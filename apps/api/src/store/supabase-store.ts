import { createHash } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { ImportIssue, ParsedFare, ParsedStop } from '../types.js';
import { config } from '../config.js';
import type { ActiveVersions, DraftImportRecord, ImportKind, ImportStore } from './repository.js';

interface ImportRow {
  id: string;
  kind: ImportKind;
  status: 'ready' | 'failed' | 'published';
  created_at: string;
  source_filename: string | null;
  summary: Record<string, number>;
}

interface ActiveVersionRow {
  key: string;
  import_id: string | null;
  previous_import_id: string | null;
}

function checksum(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function toDraft(row: ImportRow, payload: ParsedStop[] | ParsedFare[], issues: ImportIssue[]): DraftImportRecord {
  return {
    id: row.id,
    kind: row.kind,
    createdAt: row.created_at,
    status: row.status,
    payload,
    summary: row.summary,
    issues,
    sourceFilename: row.source_filename ?? undefined,
  };
}

export class SupabaseStore implements ImportStore {
  constructor(private readonly client: SupabaseClient) {}

  async createDraft(kind: ImportKind, payload: ParsedStop[] | ParsedFare[], summary: Record<string, number>, issues: ImportIssue[], sourceFilename?: string): Promise<DraftImportRecord> {
    const status = summary.errors_count ? 'failed' : 'ready';
    const { data: importRow, error } = await this.client
      .from('imports')
      .insert({
        kind,
        status,
        season_code: 'unknown',
        source_filename: sourceFilename ?? `${kind}.csv`,
        source_checksum_sha256: checksum(payload),
        summary,
      })
      .select('id, kind, status, created_at, source_filename, summary')
      .single<ImportRow>();

    if (error || !importRow) throw new Error(`Failed to create import draft: ${error?.message ?? 'unknown error'}`);

    if (issues.length > 0) {
      const { error: issuesError } = await this.client.from('import_issues').insert(
        issues.map((issue) => ({
          import_id: importRow.id,
          severity: issue.severity,
          source_file: issue.sourceFile,
          row_number: issue.rowNumber ?? null,
          field_name: issue.fieldName ?? null,
          code: issue.code,
          message: issue.message,
        })),
      );
      if (issuesError) throw new Error(`Failed to save import issues: ${issuesError.message}`);
    }

    const { error: payloadError } = await this.client.from('import_payloads').upsert({
      import_id: importRow.id,
      payload_json: payload,
      payload_kind: kind,
    });
    if (payloadError) throw new Error(`Failed to save import payload: ${payloadError.message}`);

    return toDraft(importRow, payload, issues);
  }

  async getDraft(id: string): Promise<DraftImportRecord | undefined> {
    const { data: importRow, error } = await this.client
      .from('imports')
      .select('id, kind, status, created_at, source_filename, summary')
      .eq('id', id)
      .maybeSingle<ImportRow>();

    if (error) throw new Error(`Failed to get import draft: ${error.message}`);
    if (!importRow) return undefined;

    const { data: payloadRow, error: payloadError } = await this.client
      .from('import_payloads')
      .select('payload_json')
      .eq('import_id', id)
      .single<{ payload_json: ParsedStop[] | ParsedFare[] }>();

    if (payloadError) throw new Error(`Failed to get import payload: ${payloadError.message}`);

    const { data: issuesRows, error: issuesError } = await this.client
      .from('import_issues')
      .select('severity, source_file, row_number, field_name, code, message')
      .eq('import_id', id);

    if (issuesError) throw new Error(`Failed to get import issues: ${issuesError.message}`);

    const issues: ImportIssue[] = (issuesRows ?? []).map((issue) => ({
      severity: issue.severity,
      sourceFile: issue.source_file,
      rowNumber: issue.row_number ?? undefined,
      fieldName: issue.field_name ?? undefined,
      code: issue.code,
      message: issue.message,
    }));

    return toDraft(importRow, payloadRow.payload_json, issues);
  }

  async publishDraft(id: string): Promise<DraftImportRecord> {
    const draft = await this.getDraft(id);
    if (!draft) throw new Error('Draft not found');
    if (draft.status === 'failed') throw new Error('Draft has errors');

    const key = draft.kind === 'schedule' ? 'schedule_active' : 'fare_active';
    const { data: current } = await this.client.from('active_versions').select('import_id').eq('key', key).maybeSingle<{ import_id: string | null }>();

    const { error: upsertError } = await this.client.from('active_versions').upsert({
      key,
      import_id: id,
      previous_import_id: current?.import_id ?? null,
    });
    if (upsertError) throw new Error(`Failed to set active version: ${upsertError.message}`);

    const { error: updateError } = await this.client.from('imports').update({ status: 'published' }).eq('id', id);
    if (updateError) throw new Error(`Failed to update import status: ${updateError.message}`);

    return { ...draft, status: 'published' };
  }

  async rollback(id: string): Promise<DraftImportRecord> {
    const draft = await this.getDraft(id);
    if (!draft) throw new Error('Draft not found');

    const key = draft.kind === 'schedule' ? 'schedule_active' : 'fare_active';
    const { data, error } = await this.client
      .from('active_versions')
      .select('previous_import_id')
      .eq('key', key)
      .single<{ previous_import_id: string | null }>();

    if (error) throw new Error(`Failed to read rollback candidate: ${error.message}`);

    const { error: updateError } = await this.client
      .from('active_versions')
      .update({ import_id: data.previous_import_id ?? null })
      .eq('key', key);

    if (updateError) throw new Error(`Failed to rollback active version: ${updateError.message}`);

    return draft;
  }

  async getPublishedStops(): Promise<ParsedStop[]> {
    const versions = await this.getActiveVersions();
    if (!versions.scheduleImportId) return [];
    const draft = await this.getDraft(versions.scheduleImportId);
    return (draft?.payload as ParsedStop[]) ?? [];
  }

  async getPublishedFares(): Promise<ParsedFare[]> {
    const versions = await this.getActiveVersions();
    if (!versions.fareImportId) return [];
    const draft = await this.getDraft(versions.fareImportId);
    return (draft?.payload as ParsedFare[]) ?? [];
  }

  async listDrafts(kind?: ImportKind): Promise<DraftImportRecord[]> {
    let query = this.client.from('imports').select('id, kind, status, created_at, source_filename, summary').order('created_at', { ascending: false });
    if (kind) query = query.eq('kind', kind);
    const { data, error } = await query;
    if (error) throw new Error(`Failed to list imports: ${error.message}`);

    const records: DraftImportRecord[] = [];
    for (const row of data ?? []) {
      const draft = await this.getDraft(row.id);
      if (draft) records.push(draft);
    }
    return records;
  }

  async getActiveVersions(): Promise<ActiveVersions> {
    const { data, error } = await this.client
      .from('active_versions')
      .select('key, import_id, previous_import_id');

    if (error) throw new Error(`Failed to list active versions: ${error.message}`);

    const rows = (data ?? []) as ActiveVersionRow[];
    const schedule = rows.find((row) => row.key === 'schedule_active');
    const fare = rows.find((row) => row.key === 'fare_active');

    return {
      scheduleImportId: schedule?.import_id ?? undefined,
      fareImportId: fare?.import_id ?? undefined,
      previousScheduleImportId: schedule?.previous_import_id ?? undefined,
      previousFareImportId: fare?.previous_import_id ?? undefined,
    };
  }
}

export function createSupabaseStore(): SupabaseStore {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for Supabase store');
  }

  const client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return new SupabaseStore(client);
}
