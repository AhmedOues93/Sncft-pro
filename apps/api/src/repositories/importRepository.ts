import type { SupabaseLikeClient } from '../lib/supabase.js';

interface ImportIssueRecord {
  severity: 'error' | 'warning' | 'info';
  sourceFile: string;
  rowNumber?: number;
  fieldName?: string;
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

interface DraftPayload {
  lineCode: string;
  season: string;
  sourceFilename: string;
  sourceChecksumSha256: string;
  status: 'ready' | 'needs_review' | 'failed';
  summary: Record<string, unknown>;
  issues: ImportIssueRecord[];
  trips: Array<Record<string, unknown>>;
  stopTimes: Array<Record<string, unknown>>;
  calendars: Array<Record<string, unknown>>;
}

async function runQuery<T = unknown>(query: any, fallback: string): Promise<T> {
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || fallback);
  }
  return data as T;
}

export class ImportRepository {
  constructor(private readonly supabase: SupabaseLikeClient) {}

  async createDraftImport(payload: DraftPayload) {
    const importRow = await runQuery<{ id: string; line_code: string; season: string; status: string; summary: Record<string, unknown>; previous_active_import_id: string | null }>(
      this.supabase
        .from('imports')
        .insert({
          line_code: payload.lineCode,
          season: payload.season,
          season_code: payload.season,
          source_filename: payload.sourceFilename,
          source_checksum_sha256: payload.sourceChecksumSha256,
          status: payload.status,
          summary: payload.summary,
          is_active: false,
        })
        .select('id,line_code,season,status,summary,previous_active_import_id')
        .single(),
      'Failed to insert import row',
    );

    if (payload.issues.length > 0) {
      await runQuery(
        this.supabase.from('import_issues').insert(
          payload.issues.map((issue) => ({
            import_id: importRow.id,
            severity: issue.severity,
            source_file: issue.sourceFile,
            row_number: issue.rowNumber,
            field_name: issue.fieldName,
            code: issue.code,
            message: issue.message,
            context: issue.context ?? {},
          })),
        ),
        'Failed to persist import issues',
      );
    }

    if (payload.calendars.length > 0) {
      await runQuery(
        this.supabase.from('import_calendars').insert(
          payload.calendars.map((calendar) => ({
            import_id: importRow.id,
            ...calendar,
          })),
        ),
        'Failed to persist import calendars',
      );
    }

    if (payload.trips.length > 0) {
      await runQuery(
        this.supabase.from('import_trips').insert(
          payload.trips.map((trip) => ({
            import_id: importRow.id,
            ...trip,
          })),
        ),
        'Failed to persist import trips',
      );
    }

    if (payload.stopTimes.length > 0) {
      await runQuery(
        this.supabase.from('import_stop_times').insert(
          payload.stopTimes.map((stopTime) => ({
            import_id: importRow.id,
            ...stopTime,
          })),
        ),
        'Failed to persist import stop times',
      );
    }

    return importRow;
  }

  async getImportById(importId: string) {
    return runQuery<{ id: string; line_code: string; season: string; status: string; summary: Record<string, unknown>; is_active: boolean; previous_active_import_id: string | null } | null>(
      this.supabase
        .from('imports')
        .select('id,line_code,season,status,summary,is_active,previous_active_import_id')
        .eq('id', importId)
        .maybeSingle(),
      'Failed to fetch import',
    );
  }

  async getImportIssues(importId: string) {
    return runQuery<Array<Record<string, unknown>>>(
      this.supabase
        .from('import_issues')
        .select('severity,source_file,row_number,field_name,code,message,context')
        .eq('import_id', importId),
      'Failed to fetch import issues',
    );
  }

  async getImportPreviewTrips(importId: string, limit = 5) {
    const trips = await runQuery<Array<Record<string, unknown>>>(
      this.supabase
        .from('import_trips')
        .select('external_trip_id,line_code,train_number,direction,service_code')
        .eq('import_id', importId)
        .order('external_trip_id', { ascending: true })
        .limit(limit),
      'Failed to fetch import trips',
    );

    const stops = await runQuery<Array<Record<string, unknown>>>(
      this.supabase
        .from('import_stop_times')
        .select('external_trip_id,station_order,station_name,arrival_display_time,departure_display_time,day_offset')
        .eq('import_id', importId)
        .order('station_order', { ascending: true }),
      'Failed to fetch import stop times',
    );

    return { trips: trips ?? [], stops: stops ?? [] };
  }

  async getActiveImportByLineSeason(lineCode: string, season: string, excludingImportId?: string) {
    let query = this.supabase.from('imports').select('id').eq('line_code', lineCode).eq('season', season).eq('is_active', true);

    if (excludingImportId) {
      query = query.neq('id', excludingImportId);
    }

    return runQuery<{ id: string } | null>(query.maybeSingle(), 'Failed to fetch active import');
  }

  async publishImport(importId: string, previousActiveImportId: string | null) {
    await runQuery(
      this.supabase
        .from('imports')
        .update({
          status: 'published',
          is_active: true,
          published_at: new Date().toISOString(),
          previous_active_import_id: previousActiveImportId,
        })
        .eq('id', importId),
      'Failed to publish import',
    );

    if (previousActiveImportId) {
      await runQuery(
        this.supabase
          .from('imports')
          .update({
            is_active: false,
          })
          .eq('id', previousActiveImportId),
        'Failed to deactivate previous active import',
      );
    }
  }

  async rollbackImport(importId: string, previousActiveImportId: string) {
    await runQuery(
      this.supabase
        .from('imports')
        .update({
          status: 'rolled_back',
          is_active: false,
          rolled_back_at: new Date().toISOString(),
        })
        .eq('id', importId),
      'Failed to mark import as rolled back',
    );

    await runQuery(
      this.supabase
        .from('imports')
        .update({
          status: 'published',
          is_active: true,
          previous_active_import_id: null,
        })
        .eq('id', previousActiveImportId),
      'Failed to restore previous active import',
    );
  }
}
