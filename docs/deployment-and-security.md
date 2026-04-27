# Production Hardening Notes (Phase 9)

## Security baseline

- `SUPABASE_SERVICE_ROLE_KEY` is server-side only in `apps/api`.
- Frontends (`apps/admin`, `apps/passenger`) call API endpoints only.
- Do not commit `.env` files or secrets.

## API hardening included

- Request validation for required query params in journey/station routes.
- CORS origin configurable via `CORS_ORIGIN`.
- JSON/text body size limits for CSV endpoints.
- Central error handler middleware.

## Local development

1. Copy `.env.example` to `.env` (local only).
2. Fill `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. Run API: `npm run dev -w @sncft/api`.
4. Run admin scaffold: `npm run dev -w @sncft/admin`.
5. Run passenger scaffold: `npm run dev -w @sncft/passenger`.

## Deployment checklist

- API deploy target: Node runtime (Fly/Render/Railway/etc.).
- Admin deploy target: static hosting (Vercel/Netlify/S3).
- Passenger scaffold deploy target: static hosting (until Flutter app is generated).
- Configure environment variables per environment (dev/stage/prod).
- Verify CORS origin values per deployed frontend domain.
