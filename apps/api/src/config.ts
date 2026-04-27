import dotenv from 'dotenv';

dotenv.config();

const port = Number(process.env.PORT ?? 3000);

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number.isFinite(port) ? port : 3000,
};
