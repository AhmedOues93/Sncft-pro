# Deployment & security

- Keep `SUPABASE_SERVICE_ROLE_KEY` only on backend runtime.
- Frontends call API only.
- Configure CORS with `CORS_ORIGIN`.
- Use HTTPS + secret manager for production env vars.
- Add auth/roles for admin endpoints before production.
