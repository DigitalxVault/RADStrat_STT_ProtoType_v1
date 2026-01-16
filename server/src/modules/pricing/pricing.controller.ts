import { Router, Request, Response } from 'express';
import { pricingConfig } from '../../config/pricing.config.js';

const router = Router();

// GET /api/pricing
router.get('/', (_req: Request, res: Response) => {
  res.json(pricingConfig);
});

// GET /api/pricing/stt
router.get('/stt', (_req: Request, res: Response) => {
  const sttPricing = {
    whisper: pricingConfig.openai.whisper,
    'gpt-4o-transcribe': pricingConfig.openai['gpt-4o-transcribe'],
    'gpt-4o-mini-transcribe': pricingConfig.openai['gpt-4o-mini-transcribe'],
  };
  res.json(sttPricing);
});

// GET /api/pricing/scoring
router.get('/scoring', (_req: Request, res: Response) => {
  const scoringPricing = {
    'gpt-4o': pricingConfig.openai['gpt-4o'],
    'gpt-4o-mini': pricingConfig.openai['gpt-4o-mini'],
    'grok-4.1-fast': pricingConfig.grok['grok-4.1-fast'],
  };
  res.json(scoringPricing);
});

export const pricingController = router;
