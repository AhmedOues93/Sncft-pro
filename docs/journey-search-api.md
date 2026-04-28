# Journey search API

## GET /journeys/search

Query params:
- `originStationId`
- `destinationStationId`
- `datetime` (ISO)
- `passengers` (default 1)
- `offset` (default 0)
- `limit` (max 5)

Supports:
- direct journeys
- one transfer via Tunis Ville
- transfer wait 5-90 min
- stop-by-stop response
- fare multiplier by passenger count
