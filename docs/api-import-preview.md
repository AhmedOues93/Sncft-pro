# API: Schedule Import Preview + Persistence

## Preview endpoint (Phase 4)

`POST /admin/imports/schedules/preview`

### Content types supported

1. `text/csv` (raw body)
2. `application/json` with shape `{ "csvText": "..." }`

### Request size limits

- JSON body limit: `2mb`
- Text (`text/csv` / `text/plain`) body limit: `2mb`

### Response shape

```json
{
  "importStatus": "ready",
  "summary": {
    "totalRows": 3,
    "tripsCount": 1,
    "stopTimesCount": 3,
    "calendarsCount": 1,
    "warningsCount": 0,
    "errorsCount": 0
  },
  "issues": [],
  "preview": []
}
```

## Persist + publish endpoints (Phase 5)

- `POST /admin/imports/schedules`
- `GET /admin/imports/:id/preview`
- `POST /admin/imports/:id/publish`
- `POST /admin/imports/:id/rollback`

`POST /admin/imports/schedules` accepts the same payload styles as preview and stores draft data (`imports`, `import_issues`, `import_trips`, `import_stop_times`, `import_calendars`) for publish/rollback workflows.

### Publish safety rules

- Cannot publish imports with `status=failed`
- Cannot publish imports with `summary.errorsCount > 0`
- `status=needs_review` requires explicit `force=true`

## curl examples

### Raw CSV preview

```bash
curl -X POST http://localhost:3000/admin/imports/schedules/preview \
  -H 'Content-Type: text/csv' \
  --data-binary @packages/import-engine/test/fixtures/sncft_normal_trip.csv
```

### Persist draft import

```bash
curl -X POST 'http://localhost:3000/admin/imports/schedules?filename=summer_a.csv' \
  -H 'Content-Type: text/csv' \
  --data-binary @packages/import-engine/test/fixtures/sncft_normal_trip.csv
```

### Preview saved import

```bash
curl http://localhost:3000/admin/imports/<import-id>/preview
```

### Publish saved import

```bash
curl -X POST http://localhost:3000/admin/imports/<import-id>/publish \
  -H 'Content-Type: application/json' \
  -d '{"force":true}'
```

### Rollback published import

```bash
curl -X POST http://localhost:3000/admin/imports/<import-id>/rollback
```
