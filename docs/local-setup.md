# Local setup

## 1) Install dependencies

```bash
npm install
```

## 2) Configure environment

```bash
cp .env.example .env
```

Local memory + auth dev role:
- `STORAGE_DRIVER=memory`
- `ADMIN_AUTH_REQUIRED=true`
- `SNCFT_DEV_ADMIN_ROLE=superadmin`

Use `Authorization: Bearer dev-token` for admin calls in local dev.

## 3) Start services

```bash
npm run dev:api
npm run dev:admin
npm run dev:passenger
```

## 4) Required manual curl checks

Public:

```bash
curl -s "http://localhost:3000/health"
curl -s "http://localhost:3000/stations/search?q=tun&limit=10"
curl -s "http://localhost:3000/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Hammam%20Lif&datetime=2025-09-02T05:00:00&passengers=1&offset=0&limit=5"
```

Admin without token (should fail when auth required):

```bash
curl -i -X POST "http://localhost:3000/admin/imports/schedules/preview" -H "Content-Type: application/json" -d '{"csv":"test"}'
```

Admin with token (local dev):

```bash
curl -i -X POST "http://localhost:3000/admin/imports/schedules/preview" -H "Authorization: Bearer dev-token" -H "Content-Type: application/json" -d '{"csv":"line,station_order,station,time\nA,1,Tunis Ville,05:00"}'
```

## 5) Role permissions

| Role | Active/history read | Preview/save draft | Publish/Rollback |
|---|---|---|---|
| viewer | ✅ | ❌ | ❌ |
| editor | ✅ | ✅ | ❌ |
| publisher | ✅ | ✅ | ✅ |
| superadmin | ✅ | ✅ | ✅ |

## 6) Quality gates

```bash
npm run test -w @sncft/api
npm run test -w @sncft/import-engine
npm run check
```
