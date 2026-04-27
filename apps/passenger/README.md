# SNCFT Passenger MVP (Phase 8 scaffold)

This repository includes a lightweight passenger web scaffold that calls backend API endpoints.

## Why not full Flutter yet?

A full Flutter generation would add significant tooling/boilerplate in this environment. For now, this scaffold proves API integration and journey card UX while documenting Flutter follow-up.

## Features covered

- Origin station id input
- Destination station id input
- Date/time selection
- Passenger count
- Calls `GET /journeys/search`
- Shows up to 5 results (API limit)
- Buttons: `Plus tôt`, `Maintenant`, `Plus tard`
- Displays journey cards with times, duration, trains, transfer info, fare

## Run

```bash
npm run dev -w @sncft/passenger
```

Open `http://localhost:5175`.

## TODO for full Flutter app

1. Generate Flutter project in `apps/passenger/flutter_app`.
2. Replace station-id inputs with station search autocomplete via `GET /stations/search`.
3. Implement journey detail page using selected result payload.
4. Add app-level state management + localization FR/AR.
