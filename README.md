# SNCFT Navigator Pro

Production-focused SNCFT Navigator monorepo.

## Implemented in this phase

- Patch 7 API behavior stabilized:
  - station suggestions
  - chronological direct + transfer journey search
  - pagination metadata
  - normal-ticket fare behavior
- Admin import API workflow:
  - schedule/fare preview
  - save draft
  - publish
  - rollback
  - import history
  - active versions
- Storage abstraction:
  - memory store (tests/local)
  - Supabase store (persistent)
  - production guard: API throws at startup if `NODE_ENV=production` and `STORAGE_DRIVER!=supabase`
- Supabase SQL additions under `apps/api/supabase/`.
- `import:all` CLI script for batch schedule/fare import + publish.

## Environment

Copy `.env.example` to `.env` and configure:

- `API_PORT`
- `CORS_ORIGIN`
- `STORAGE_DRIVER=memory|supabase`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY` (optional)
- `API_BASE_URL` and `CSV_DIR` for import script

## Run

```bash
npm install
npm run dev:api
npm run dev:admin
npm run dev:passenger
```

Default local URLs:
- API: `http://127.0.0.1:3000`
- Admin: `http://127.0.0.1:4170`
- Passenger: `http://127.0.0.1:5175`

## Tests / quality gates

```bash
npm run test -w @sncft/api
npm run test -w @sncft/import-engine
npm run check
```

## Batch import all CSV files

```bash
SNCFT_DEV_ADMIN_ROLE=superadmin ADMIN_TOKEN=dev-token CSV_DIR=./data/csv API_BASE_URL=http://127.0.0.1:3000 npm run import:all
```

Expected file patterns inside `CSV_DIR`:

- `schedules_*.csv`
- `fares_*.csv`

## Manual verification curl commands

```bash
curl -s "http://localhost:3000/health"
curl -s "http://localhost:3000/stations/search?q=tun&limit=10"
curl -s "http://localhost:3000/stations/search?q=ham&limit=10"
curl -s "http://localhost:3000/stations/search?q=mel&limit=10"
curl -s "http://localhost:3000/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Hammam%20Lif&datetime=2025-09-02T05:00:00&passengers=1&offset=0&limit=5"
curl -s "http://localhost:3000/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Hammam%20Lif&datetime=2025-09-02T05:00:00&passengers=1&offset=5&limit=5"
curl -s "http://localhost:3000/journeys/search?originStationId=Ezzahra&destinationStationId=Mellassine&datetime=2025-09-02T18:00:00&passengers=1&offset=0&limit=5"
curl -s "http://localhost:3000/journeys/search?originStationId=Ezzahra&destinationStationId=Mellassine&datetime=2025-09-02T18:00:00&passengers=2&offset=0&limit=5"
```

## Notes

- Service role key is API-only and must never be exposed in frontend apps.
- Passenger/Admin UI integration can consume current API routes without direct Supabase access.
- Passenger/Admin static servers now serve common image formats so official SNCFT assets can be dropped into `apps/*/assets` and loaded directly.


Admin URL: http://127.0.0.1:4170
Passenger URL: http://127.0.0.1:5175


## Admin auth hardening

- Admin endpoints require bearer auth when `ADMIN_AUTH_REQUIRED=true`.
- Local dev fallback token: `dev-token` with `SNCFT_DEV_ADMIN_ROLE` (non-production only).
- Public endpoints remain `/health`, `/stations/search`, `/journeys/search`.


## Real authentication flows

- Admin auth endpoints: `/admin/auth/register`, `/admin/auth/login`, `/admin/auth/me`, `/admin/users`, role/status patches.
- Passenger auth endpoints: `/auth/register`, `/auth/login`, `/auth/me`.
- Passenger personal endpoints: `/me/favorites`, `/me/saved-journeys`.
- Payment and real QR ticket generation are intentionally NOT implemented in this PR.
