# API: Schedule Import Preview

## Endpoint

`POST /admin/imports/schedules/preview`

## Content types supported

Production-friendly baseline for Phase 4:

1. `text/csv` (raw body)
2. `application/json` with shape `{ "csvText": "..." }`

## Request size limits

The API applies request body limits suitable for schedule CSV uploads:

- JSON body limit: `2mb`
- Text (`text/csv` / `text/plain`) body limit: `2mb`

## Response shape

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
  "preview": [
    {
      "externalTripId": "A|104|WKD|outbound|2026-06-01|2026-09-30",
      "lineCode": "A",
      "trainNumber": "104",
      "direction": "outbound",
      "serviceCode": "WKD",
      "stops": []
    }
  ]
}
```

- `importStatus`: `ready` | `needs_review` | `failed`
- `preview`: first 5 trips with stop preview

## curl examples

### Raw CSV upload

```bash
curl -X POST http://localhost:3000/admin/imports/schedules/preview \
  -H 'Content-Type: text/csv' \
  --data-binary @packages/import-engine/test/fixtures/sncft_normal_trip.csv
```

### JSON payload

```bash
curl -X POST http://localhost:3000/admin/imports/schedules/preview \
  -H 'Content-Type: application/json' \
  -d '{"csvText":"line,line_name,season,valid_from,valid_to,direction,train_number,service_code,station_order,station,arrival_time,departure_time,time\nA,Ligne A,SUMMER,2026-06-01,2026-09-30,outbound,104,WKD,1,Tunis Ville,07:10,07:12,"}'
```
