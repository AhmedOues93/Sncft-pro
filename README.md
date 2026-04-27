# SNCFT Navigator (Phase 3 Import Engine)

Current repository scope:

- API skeleton with `GET /health`
- Supabase schema migration (Phase 2)
- Real SNCFT-style schedule CSV parsing + validation (Phase 3)
- Shared import contracts and import-engine tests

## Structure

```text
apps/
  api/
  passenger/        # placeholder only
  admin/            # placeholder only
packages/
  shared-types/
  import-engine/
docs/
  csv-import-contract.md
supabase/
  migrations/
```

## Phase 3 import behavior

Implemented in `packages/import-engine`:

- parse SNCFT schedule CSV rows
- normalize station names
- normalize times to minutes
- detect overnight continuation (`23:30` -> `00:11` => next-day minutes)
- validate required fields/date range/station order/time/chronology
- output normalized `trips`, `stopTimes`, and `calendars` insertion shapes

## Tests

Fixtures and tests cover:

- Tunis Ville -> Erriadh normal trip
- Tunis Ville 23:30 -> Erriadh 00:11 overnight trip
- Tunis Ville -> Hammam Lif partial trip

Run:

```bash
npm run test -w @sncft/import-engine
```
