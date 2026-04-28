# Local setup

## 1) Install dependencies

```bash
npm install
```

## 2) Configure environment

```bash
cp .env.example .env
```

For memory mode (tests/local quick start):
- keep `STORAGE_DRIVER=memory`

For Supabase mode:
- set `STORAGE_DRIVER=supabase`
- set `SUPABASE_URL`
- set `SUPABASE_SERVICE_ROLE_KEY`

## 3) Run API

```bash
npm run dev:api
```

## 4) Run checks

```bash
npm run test -w @sncft/api
npm run test -w @sncft/import-engine
npm run check
```

## 5) Import all CSVs from folder

```bash
CSV_DIR=./data/csv API_BASE_URL=http://localhost:3000 npm run import:all
```
