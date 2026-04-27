# API: Journey Search (Phase 6)

## Endpoints

- `GET /stations/search?q=`
- `GET /journeys/search?originStationId=&destinationStationId=&datetime=&passengers=&offset=&limit=`
- `GET /journeys/:id` (MVP returns 501; search response contains detail payload)

## Journey search behavior

- Supports direct journeys and one-transfer journeys via **Tunis Ville**.
- Transfer wait window: **5 to 90 minutes**.
- Partial trips are valid.
- Overnight trips supported through normalized minute fields (e.g., `23:30` then `00:11` => next day minutes).
- Pagination defaults to 5 results and includes `hasEarlier`, `hasLater`, `nextOffset`, `previousOffset`.
- Fare is multiplied by passenger count.

## Example

```bash
curl 'http://localhost:3000/journeys/search?originStationId=st_tunis&destinationStationId=st_erriadh&datetime=2026-06-01T07:00:00Z&passengers=2&offset=0&limit=5'
```
