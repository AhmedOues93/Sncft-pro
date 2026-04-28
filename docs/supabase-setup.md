# Supabase setup

## 1) Configure API persistence
Set:
- `STORAGE_DRIVER=supabase`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

## 2) Configure auth
- Enable Supabase Auth users for admins.
- Put role in user app metadata, e.g. `role: "viewer"|"editor"|"publisher"|"superadmin"`.
- Keep `ADMIN_AUTH_REQUIRED=true` in production.
- Do **not** use `SNCFT_DEV_ADMIN_ROLE` fallback in production.

## 3) Protected endpoints
All `/admin/*` endpoints require bearer auth and role checks.
Public endpoints remain:
- `GET /health`
- `GET /stations/search`
- `GET /journeys/search`

## 4) Token usage
Admin dashboard now accepts token input and sends:
`Authorization: Bearer <token>`
