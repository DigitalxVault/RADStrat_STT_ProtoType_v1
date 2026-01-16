import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { errorHandler } from './common/middleware/error-handler.middleware.js';
import { requestLogger } from './common/middleware/request-logger.middleware.js';

// Controllers
import { healthController } from './modules/health/health.controller.js';
import { sttController } from './modules/stt/stt.controller.js';
import { scoringController } from './modules/scoring/scoring.controller.js';
import { scenariosController } from './modules/scenarios/scenarios.controller.js';
import { pricingController } from './modules/pricing/pricing.controller.js';

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '50mb' })); // Large limit for audio data
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// API Routes
app.use('/api/health', healthController);
app.use('/api/stt', sttController);
app.use('/api/score', scoringController);
app.use('/api/scenarios', scenariosController);
app.use('/api/pricing', pricingController);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'RADStrat STT Prototype API',
    version: '0.1.0',
    endpoints: {
      health: '/api/health',
      stt: '/api/stt/transcribe',
      scoring: '/api/score/evaluate',
      scenarios: '/api/scenarios',
      pricing: '/api/pricing',
    },
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
