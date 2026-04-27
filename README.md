# SNCFT Navigator (Phase 2 Foundation)

Monorepo scaffold for SNCFT Navigator Pro with:

- API skeleton (Node.js + Express + TypeScript)
- Supabase/Postgres migration schema (GTFS-like core tables)
- CSV import contract documentation
- Import-engine normalization/validation skeleton and tests

## Structure

```text
apps/
  api/
  passenger/        # placeholder only (not implemented yet)
  admin/            # placeholder only (not implemented yet)
packages/
  shared-types/
  import-engine/
docs/
  csv-import-contract.md
supabase/
  migrations/
```

## Implemented API endpoint (current)

- `GET /health`

## Database schema (Phase 2)

Migration file:

- `supabase/migrations/20260427_000001_phase2_schema.sql`

Tables included:

- `lines`
- `stations`
- `station_aliases`
- `trips`
- `stop_times`
- `calendars`
- `fares`
- `transfers`
- `imports`
- `import_issues`

## CSV contract docs

See:

- `docs/csv-import-contract.md`

## Import engine skeleton

Functions included:

- `parseScheduleCsv`
- `validateScheduleRows`
- `normalizeStationName`
- `normalizeTime`
- `detectOvernightStops`

Tests cover:

- overnight time normalization (`23:30` -> `00:11` next day)
- partial trips validity

Run import-engine tests:

```bash
npm run test -w @sncft/import-engine
```

## Security

- No secrets committed.
- API is intended to be the only layer using Supabase service-role key.
- Passenger/Admin frontends must call API, not Supabase directly.
