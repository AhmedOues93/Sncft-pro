import dotenv from 'dotenv';

dotenv.config();

const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3000);

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number.isFinite(port) ? port : 3000,
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};
