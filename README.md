# SNCFT Navigator (Phase 4 API Import Preview)

Current repository scope:

- API skeleton with `GET /health`
- API import preview endpoint `POST /admin/imports/schedules/preview`
- Supabase schema migration (Phase 2)
- SNCFT-style schedule CSV parsing + validation (Phase 3)
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

## API import preview (Phase 4)

Endpoint:

- `POST /admin/imports/schedules/preview`

Accepted payloads:

- `text/csv` raw request body
- `application/json` with `{ "csvText": "..." }`

Request size limits:

- JSON: `2mb`
- text/csv: `2mb`

Response fields:

- `importStatus` (`ready` | `needs_review` | `failed`)
- `summary` (`totalRows`, `tripsCount`, `stopTimesCount`, `calendarsCount`, `warningsCount`, `errorsCount`)
- `issues`
- `preview` (first 5 trips + stops)

See curl examples in `docs/api-import-preview.md`.

## Tests

Import-engine + API preview behavior tests rely on local fixtures only.

```bash
npm run test -w @sncft/import-engine
npm run test -w @sncft/api
```
