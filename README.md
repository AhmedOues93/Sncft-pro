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

## Tests / quality gates

```bash
npm run test -w @sncft/api
npm run test -w @sncft/import-engine
npm run check
```

## Batch import all CSV files

```bash
CSV_DIR=./data/csv API_BASE_URL=http://localhost:3000 npm run import:all
```

Expected file patterns inside `CSV_DIR`:

- `schedules_*.csv`
- `fares_*.csv`

## Manual verification curl commands

```bash
curl -s "http://localhost:3000/health"
curl -s "http://localhost:3000/stations/search?q=tun&limit=10"
curl -s "http://localhost:3000/stations/search?q=ham&limit=10"
curl -s "http://localhost:3000/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Hammam%20Lif&datetime=2025-09-02T05:00:00&passengers=1&offset=0&limit=5"
curl -s "http://localhost:3000/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Hammam%20Lif&datetime=2025-09-02T05:00:00&passengers=1&offset=5&limit=5"
curl -s "http://localhost:3000/journeys/search?originStationId=Ezzouhour%202&destinationStationId=Mellassine&datetime=2025-09-02T18:00:00&passengers=2&offset=0&limit=5"
```

## Notes

- Service role key is API-only and must never be exposed in frontend apps.
- Passenger/Admin UI integration can consume current API routes without direct Supabase access.


Admin URL: http://localhost:4173
Passenger URL: http://localhost:4174
