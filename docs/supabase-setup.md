# Supabase setup

## 1) Create project
Create a Supabase project and capture:
- Project URL (`SUPABASE_URL`)
- Service role key (`SUPABASE_SERVICE_ROLE_KEY`)

## 2) Run migrations
Apply both:
- `supabase/migrations/20260427_000001_phase2_schema.sql`
- `apps/api/supabase/20260428_000002_patch7_persistence.sql`

## 3) Configure API env
Set:
- `STORAGE_DRIVER=supabase`
- `SUPABASE_URL=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`

## 4) Start API
```bash
npm run dev:api
```

## 5) Import CSVs
```bash
CSV_DIR=./data/csv API_BASE_URL=http://localhost:3000 npm run import:all
```

## 6) Validate active versions
```bash
curl -s "http://localhost:3000/admin/active-versions"
```

## Security
- Never put service role key in frontend apps.
- Only API should access Supabase with service role permissions.
