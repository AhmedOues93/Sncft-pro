import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { SupabaseLikeClient } from '../src/lib/supabase.js';
import { ImportRepository } from '../src/repositories/importRepository.js';
import { ScheduleImportService } from '../src/services/scheduleImportService.js';
import { SchedulePublishService } from '../src/services/schedulePublishService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readFixture(name: string): string {
  return fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'packages', 'import-engine', 'test', 'fixtures', name),
    'utf8',
  );
}

type Row = Record<string, unknown>;

class MockQuery {
  private op: 'select' | 'insert' | 'update' = 'select';
  private values: Row | Row[] | null = null;
  private filters: Array<{ column: string; value: unknown; negated?: boolean }> = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private rowLimit: number | null = null;

  constructor(private readonly db: Map<string, Row[]>, private readonly table: string) {}

  select(): this {
    this.op = 'select';
    return this;
  }

  insert(values: Row | Row[]): this {
    this.op = 'insert';
    this.values = values;
    return this;
  }

  update(values: Row): this {
    this.op = 'update';
    this.values = values;
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, value });
    return this;
  }

  neq(column: string, value: unknown): this {
    this.filters.push({ column, value, negated: true });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  limit(count: number): this {
    this.rowLimit = count;
    return this;
  }

  private applyFilters(rows: Row[]): Row[] {
    return rows.filter((row) =>
      this.filters.every((filter) => {
        const matched = row[filter.column] === filter.value;
        return filter.negated ? !matched : matched;
      }),
    );
  }

  private execRows(): Row[] {
    const tableRows = this.db.get(this.table) ?? [];

    if (this.op === 'insert') {
      const toInsert = (Array.isArray(this.values) ? this.values : [this.values]).filter(Boolean) as Row[];
      const prepared = toInsert.map((row) => ({ id: row.id ?? `${this.table}-${(this.db.get(this.table) ?? []).length + 1}`, ...row }));
      this.db.set(this.table, [...tableRows, ...prepared]);
      return prepared;
    }

    if (this.op === 'update') {
      const updateValues = (this.values ?? {}) as Row;
      const updated: Row[] = [];
      const merged = tableRows.map((row) => {
        const matched = this.filters.every((filter) => {
          const isMatch = row[filter.column] === filter.value;
          return filter.negated ? !isMatch : isMatch;
        });
        if (!matched) {
          return row;
        }
        const next = { ...row, ...updateValues };
        updated.push(next);
        return next;
      });
      this.db.set(this.table, merged);
      return updated;
    }

    let selected = this.applyFilters(tableRows);
    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      selected = [...selected].sort((a, b) => {
        const aValue = String(a[column] ?? '');
        const bValue = String(b[column] ?? '');
        return ascending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      });
    }
    if (this.rowLimit !== null) {
      selected = selected.slice(0, this.rowLimit);
    }
    return selected;
  }

  then(resolve: (value: { data: Row[]; error: null }) => void): void {
    resolve({ data: this.execRows(), error: null });
  }

  async single() {
    const rows = this.execRows();
    return { data: rows[0] ?? null, error: null };
  }

  async maybeSingle() {
    const rows = this.execRows();
    return { data: rows[0] ?? null, error: null };
  }
}

class MockSupabaseClient implements SupabaseLikeClient {
  private readonly db = new Map<string, Row[]>();

  from(table: string): any {
    return new MockQuery(this.db, table);
  }

  table(name: string) {
    return this.db.get(name) ?? [];
  }
}

test('persists draft import and normalized records', async () => {
  const client = new MockSupabaseClient();
  const repository = new ImportRepository(client);
  const service = new ScheduleImportService(repository);

  const result = await service.persistScheduleImport(readFixture('sncft_normal_trip.csv'), 'normal.csv');

  assert.equal(result.importStatus, 'ready');
  assert.equal(result.summary.tripsCount, 1);
  assert.equal(client.table('imports').length, 1);
  assert.equal(client.table('import_trips').length, 1);
  assert.equal(client.table('import_stop_times').length, 3);
});

test('publish safety blocks failed import without force and allows force for needs_review', async () => {
  const client = new MockSupabaseClient();
  const repository = new ImportRepository(client);
  const publishService = new SchedulePublishService(repository);

  await client.from('imports').insert({
    id: 'failed-1',
    line_code: 'A',
    season: 'SUMMER',
    status: 'failed',
    summary: { errorsCount: 1 },
    is_active: false,
    previous_active_import_id: null,
  });

  const blocked = await publishService.publishImport('failed-1');
  assert.equal(blocked.statusCode, 409);

  await client.from('imports').insert({
    id: 'review-1',
    line_code: 'A',
    season: 'SUMMER',
    status: 'needs_review',
    summary: { errorsCount: 0 },
    is_active: false,
    previous_active_import_id: null,
  });

  const blockedReview = await publishService.publishImport('review-1');
  assert.equal(blockedReview.statusCode, 409);

  const forced = await publishService.publishImport('review-1', true);
  assert.equal(forced.statusCode, 200);
});

test('rollback restores previous active import', async () => {
  const client = new MockSupabaseClient();
  const repository = new ImportRepository(client);
  const publishService = new SchedulePublishService(repository);

  await client.from('imports').insert([
    {
      id: 'old-active',
      line_code: 'A',
      season: 'SUMMER',
      status: 'published',
      summary: { errorsCount: 0 },
      is_active: false,
      previous_active_import_id: null,
    },
    {
      id: 'new-active',
      line_code: 'A',
      season: 'SUMMER',
      status: 'published',
      summary: { errorsCount: 0 },
      is_active: true,
      previous_active_import_id: 'old-active',
    },
  ]);

  const rolledBack = await publishService.rollbackImport('new-active');
  assert.equal(rolledBack.statusCode, 200);

  const imports = client.table('imports');
  const oldImport = imports.find((row) => row.id === 'old-active');
  const newImport = imports.find((row) => row.id === 'new-active');

  assert.equal(oldImport?.is_active, true);
  assert.equal(newImport?.is_active, false);
  assert.equal(newImport?.status, 'rolled_back');
});
