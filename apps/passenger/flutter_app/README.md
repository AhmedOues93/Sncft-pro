# SNCFT Navigator Flutter App

Prototype Flutter passenger app for SNCFT Navigator Pro.

## Run locally

```bash
cd apps/passenger/flutter_app
flutter pub get
flutter analyze
flutter run
```

## Implemented MVP screens

- Splash
- Home/Search with SNCFT hero block and rounded search card
- Results list (5-card paging preview)
- Journey details timeline
- Bottom navigation with placeholders (Billets, Trajets, Profil)

## API integration

The current structure is ready for integration with:

- `GET /stations/search?q=`
- `GET /journeys/search?originStationId=&destinationStationId=&datetime=&passengers=&offset=&limit=`

Use a local config layer to switch API URL and fallback mock data.
