# Local setup

## 1) Install

```bash
npm install
cp .env.example .env
```

## 2) Local auth mode

Use local fallback auth in non-production:
- `ADMIN_AUTH_REQUIRED=true`
- `SNCFT_DEV_ADMIN_ROLE=superadmin`

This enables:
- `Bearer dev-token` (superadmin)
- `Bearer dev-viewer|dev-editor|dev-publisher|dev-superadmin`

## 3) Start services

```bash
npm run dev:api
npm run dev:admin
npm run dev:passenger
```

## 4) Manual auth checks

Admin register/login:
```bash
curl -s -X POST "http://localhost:3000/admin/auth/register" -H "Content-Type: application/json" -d '{"employeeNumber":"E-1001","firstName":"Admin","lastName":"One","email":"admin1@sncft.local","password":"secret123"}'
curl -s -X POST "http://localhost:3000/admin/auth/login" -H "Content-Type: application/json" -d '{"email":"admin1@sncft.local","password":"secret123"}'
```

Passenger register/login:
```bash
curl -s -X POST "http://localhost:3000/auth/register" -H "Content-Type: application/json" -d '{"displayName":"Alice","email":"alice@sncft.local","password":"secret123"}'
curl -s -X POST "http://localhost:3000/auth/login" -H "Content-Type: application/json" -d '{"email":"alice@sncft.local","password":"secret123"}'
```

Public checks:
```bash
curl -s "http://localhost:3000/health"
curl -s "http://localhost:3000/stations/search?q=tun&limit=10"
curl -s "http://localhost:3000/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Hammam%20Lif&datetime=2025-09-02T05:00:00&passengers=1&offset=0&limit=5"
```

Admin protected check without token:
```bash
curl -i -X POST "http://localhost:3000/admin/imports/schedules/preview" -H "Content-Type: application/json" -d '{"csv":"test"}'
```

## 5) Passenger personal features

With passenger token:
- `POST /me/favorites`
- `GET /me/favorites`
- `POST /me/saved-journeys`
- `GET /me/saved-journeys`

## 6) Quality gates

```bash
npm run test -w @sncft/api
npm run test -w @sncft/import-engine
npm run check
```
