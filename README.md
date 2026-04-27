# SNCFT Navigator (Phases 1–5 Foundation)

Current repository scope:

- Monorepo foundation (apps + packages workspaces)
- API skeleton with `GET /health`
- API import preview endpoint `POST /admin/imports/schedules/preview`
- Persisted schedule import endpoints (draft, preview, publish, rollback)
- Supabase schema migrations (Phase 2 + Phase 5)
- SNCFT-style schedule CSV parsing + validation + overnight handling
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
  api-import-preview.md
  csv-import-contract.md
supabase/
  migrations/
```

## API endpoints implemented

- `GET /health`
- `POST /admin/imports/schedules/preview`
- `POST /admin/imports/schedules`
- `GET /admin/imports/:id/preview`
- `POST /admin/imports/:id/publish`
- `POST /admin/imports/:id/rollback`

## Supabase server-only env vars

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The API is the only layer that uses the service role key.

## Tests

```bash
npm run test -w @sncft/import-engine
npm run test -w @sncft/api
```
