import dotenv from 'dotenv';

dotenv.config();

const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3000);

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number.isFinite(port) ? port : 3000,
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000,http://localhost:4173,http://localhost:4174',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  storageDriver: process.env.STORAGE_DRIVER ?? (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? 'supabase' : 'memory'),
  adminAuthRequired: process.env.ADMIN_AUTH_REQUIRED !== 'false',
  devAdminRole: process.env.SNCFT_DEV_ADMIN_ROLE ?? '',
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 60),
  csvBodyLimit: process.env.CSV_BODY_LIMIT ?? '4mb',
  dbPath: process.env.SNCFT_DB_PATH ?? '',
};
