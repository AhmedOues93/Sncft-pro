# SNCFT Navigator Pro (Phases 1–9 MVP)

Monorepo for SNCFT schedule import, admin workflow, and passenger journey search.

## Implemented phases

- ✅ Phase 1: monorepo foundation, API skeleton, health endpoint.
- ✅ Phase 2: GTFS-like schema + CSV import contract docs.
- ✅ Phase 3: import-engine parse/validate/normalize + overnight + partial trips.
- ✅ Phase 4: API preview endpoint.
- ✅ Phase 5: persisted draft imports + publish/rollback workflow.
- ✅ Phase 6: journey search API (`stations/search`, `journeys/search`) with direct + Tunis Ville transfer.
- ✅ Phase 7: admin dashboard MVP scaffold (API-only workflow).
- ✅ Phase 8: passenger app MVP scaffold (API-only journey cards).
- ✅ Phase 9: hardening baseline docs + request validation + CORS config + error middleware.
- ⏳ Phase 10: ZIP creation is prepared but not executed (run only when requested).

## Repository layout

```text
apps/
  api/
  admin/
  passenger/
packages/
  import-engine/
  shared-types/
docs/
supabase/migrations/
```

## API endpoints

- `GET /health`
- `GET /stations/search?q=`
- `GET /journeys/search?originStationId=&destinationStationId=&datetime=&passengers=&offset=&limit=`
- `GET /journeys/:id` (MVP returns 501; search payload includes details)
- `POST /admin/imports/schedules/preview`
- `POST /admin/imports/schedules`
- `GET /admin/imports/:id/preview`
- `POST /admin/imports/:id/publish`
- `POST /admin/imports/:id/rollback`

## Environment variables

See `.env.example` for placeholders.

Required for API persistence/search:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Also used:

- `PORT`
- `NODE_ENV`
- `CORS_ORIGIN`

## Run locally

```bash
npm run dev -w @sncft/api
npm run dev -w @sncft/admin
npm run dev -w @sncft/passenger
```

## Tests / checks

```bash
npm run test -w @sncft/import-engine
npm run test -w @sncft/api
npm run check -w @sncft/api
```

## Production notes

- API is the only layer using service-role key.
- Frontends do not connect to Supabase directly.
- Keep `.env`, secrets, caches, build outputs, and node_modules out of git.

## Final status checklist before ZIP

- [ ] Confirm no `.env` file committed
- [ ] Confirm no `node_modules` committed
- [ ] Confirm docs are complete
- [ ] Confirm tests are included and runnable
- [ ] Confirm branch is up to date

See:

- `docs/journey-search-api.md`
- `docs/api-import-preview.md`
- `docs/csv-import-contract.md`
- `docs/deployment-and-security.md`
