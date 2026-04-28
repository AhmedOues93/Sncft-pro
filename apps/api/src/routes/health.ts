import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (_req: any, res: any) => {
  res.status(200).json({
    status: 'ok',
    service: 'sncft-api',
    timestamp: new Date().toISOString(),
  });
});
