# Supabase auth/accounts setup

## Required env
- `STORAGE_DRIVER=supabase`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `ADMIN_AUTH_REQUIRED=true`

> In `NODE_ENV=production`, the API rejects memory driver startup and requires `STORAGE_DRIVER=supabase`.

## Migrations
Apply:
- `supabase/migrations/20260427_000001_phase2_schema.sql`
- `apps/api/supabase/20260428_000002_patch7_persistence.sql`
- `apps/api/supabase/20260428_000003_auth_accounts_foundations.sql`

## New tables
- `admin_profiles`
- `passenger_profiles`
- `passenger_favorites`
- `saved_journeys`
- `tickets` (placeholder for future payment/QR phase)

Persistence behavior:
- schedule/fare drafts are stored in `imports` + `import_payloads`
- active schedule/fare pointers are stored in `active_versions`
- published search/station endpoints read from active persisted payloads
- data remains available after API restart

## Role/status model
Admin roles:
- viewer, editor, publisher, superadmin

Admin status:
- pending, active, suspended

## OAuth note
Passenger Google/Gmail OAuth can be enabled in Supabase Auth provider settings. This PR keeps email/password as baseline and provider field support in `passenger_profiles`.
