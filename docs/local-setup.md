# Local setup

## 1) Install dependencies

```bash
npm install
```

## 2) Configure environment

```bash
cp .env.example .env
```

Memory mode (local/tests):
- `STORAGE_DRIVER=memory`

Supabase mode:
- `STORAGE_DRIVER=supabase`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 3) Start services

```bash
npm run dev:api
npm run dev:admin
npm run dev:passenger
```

- API: `http://localhost:3000`
- Admin: `http://localhost:4173`
- Passenger: `http://localhost:4174`

## 4) Import CSVs (optional helper)

```bash
CSV_DIR=./data/csv API_BASE_URL=http://localhost:3000 npm run import:all
```

## 5) Required manual curl checks

```bash
curl -s "http://localhost:3000/health"
curl -s "http://localhost:3000/stations/search?q=tun&limit=10"
curl -s "http://localhost:3000/stations/search?q=ham&limit=10"
curl -s "http://localhost:3000/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Hammam%20Lif&datetime=2025-09-02T05:00:00&passengers=1&offset=0&limit=5"
curl -s "http://localhost:3000/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Hammam%20Lif&datetime=2025-09-02T05:00:00&passengers=1&offset=5&limit=5"
curl -s "http://localhost:3000/journeys/search?originStationId=Ezzouhour%202&destinationStationId=Mellassine&datetime=2025-09-02T18:00:00&passengers=2&offset=0&limit=5"
```

## 6) Manual browser checks

Passenger app:
1. Set API URL if needed.
2. Type `tun`, `ham`, `mel`, `bou`, `err` and verify suggestions dropdown.
3. Search and verify direct + transfer results.
4. Use next/previous pagination buttons.
5. Open details and verify transfer station is not duplicated.

Admin app:
1. Paste or upload schedules CSV, run preview, save draft, publish.
2. Paste or upload fares CSV, run preview, save draft, publish.
3. Check active versions and history.
4. Run rollback buttons and verify active versions update.

## 7) Quality gates

```bash
npm run test -w @sncft/api
npm run test -w @sncft/import-engine
npm run check
```
