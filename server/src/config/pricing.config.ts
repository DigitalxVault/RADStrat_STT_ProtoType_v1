import { PricingInfo } from '../types/index.js';

export const pricingConfig: PricingInfo = {
  openai: {
    whisper: { perMinute: 0.006 },
    'gpt-4o-transcribe': { perMinute: 0.006 },
    'gpt-4o-mini-transcribe': { perMinute: 0.003 },
    'gpt-4o': { input: 2.50, output: 10.00 },      // per 1M tokens
    'gpt-4o-mini': { input: 0.15, output: 0.60 },  // per 1M tokens
  },
  grok: {
    'grok-4.1-fast': { input: 0.20, output: 0.50 }, // per 1M tokens
  },
};

export function calculateSTTCost(
  durationMinutes: number,
  model: 'whisper' | 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe'
): number {
  const rate = pricingConfig.openai[model].perMinute;
  return durationMinutes * rate;
}

export function calculateScoringCost(
  inputTokens: number,
  outputTokens: number,
  model: 'gpt-4o' | 'gpt-4o-mini' | 'grok-4.1-fast'
): number {
  let pricing: { input: number; output: number };

  if (model === 'grok-4.1-fast') {
    pricing = pricingConfig.grok[model];
  } else {
    pricing = pricingConfig.openai[model];
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}
