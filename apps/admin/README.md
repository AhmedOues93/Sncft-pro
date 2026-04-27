# SNCFT Admin Dashboard MVP (Phase 7)

This is a lightweight admin scaffold that talks to the backend API only.

## Workflow

1. Paste/upload schedule CSV.
2. Preview via `POST /admin/imports/schedules/preview`.
3. Save draft via `POST /admin/imports/schedules`.
4. Publish via `POST /admin/imports/:id/publish`.
5. Rollback via `POST /admin/imports/:id/rollback`.

## Run

```bash
npm run dev -w @sncft/admin
```

Open `http://localhost:5174`.

## Security

- No Supabase service role key in frontend.
- Frontend calls API only.
- Configure API base URL in browser localStorage key `ADMIN_API_BASE_URL` if needed.
