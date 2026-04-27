# SNCFT Navigator Pro MVP

Monorepo MVP for SNCFT Navigator Pro (API + import-engine + admin dashboard + Flutter passenger app scaffold).

## Workspaces

- `apps/api`: Express TypeScript backend
- `apps/admin`: static French admin dashboard MVP
- `apps/passenger/flutter_app`: Flutter passenger UI MVP
- `packages/import-engine`: reusable CSV parsing/validation utilities
- `supabase/migrations`: GTFS-like database schema

## Quick start

```bash
npm install
npm run dev:api
```

In another terminal:

```bash
npm run dev:admin
```

Flutter:

```bash
cd apps/passenger/flutter_app
flutter pub get
flutter analyze
flutter run
```

## API endpoints

- `GET /health`
- `GET /stations/search?q=`
- `GET /journeys/search?originStationId=&destinationStationId=&datetime=&passengers=&offset=&limit=`
- `POST /admin/imports/schedules/preview`
- `POST /admin/imports/schedules`
- `GET /admin/imports/:id/preview`
- `POST /admin/imports/:id/publish`
- `POST /admin/imports/:id/rollback`
- `POST /admin/imports/fares/preview`
- `POST /admin/imports/fares`
- `GET /admin/imports/fares/:id/preview`
- `POST /admin/imports/fares/:id/publish`

## Notes

Current persistence mode is in-memory runtime store in API (suitable for local MVP/dev). Supabase schema is ready and should be wired for production persistence.
