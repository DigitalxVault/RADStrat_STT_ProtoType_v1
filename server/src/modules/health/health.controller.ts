import { Router, Request, Response } from 'express';

const router = Router();

// GET /api/health
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '0.1.0',
  });
});

// GET /api/health/ready
router.get('/ready', (_req: Request, res: Response) => {
  // Check if all required services are ready
  const checks = {
    memory: process.memoryUsage().heapUsed < 500 * 1024 * 1024, // < 500MB
    uptime: process.uptime() > 0,
  };

  const allReady = Object.values(checks).every(Boolean);

  res.status(allReady ? 200 : 503).json({
    ready: allReady,
    checks,
    timestamp: new Date().toISOString(),
  });
});

export const healthController = router;
