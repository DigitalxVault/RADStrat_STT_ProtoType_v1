import { transcribeAudio } from '../../clients/openai.client.js';
import { calculateSTTCost, pricingConfig } from '../../config/pricing.config.js';
import { STTModel, TranscribeResponse } from '../../types/index.js';

export class STTService {
  async transcribe(
    audioBase64: string,
    model: STTModel,
    mimeType?: string // Optional for backwards compatibility
  ): Promise<TranscribeResponse> {
    // Convert base64 to Buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // Call OpenAI API with actual MIME type
    const result = await transcribeAudio(audioBuffer, model, mimeType);

    // Calculate cost based on duration
    const durationMinutes = result.duration / 60;
    const cost = calculateSTTCost(durationMinutes, model);
    const roundedCost = Math.round(cost * 1000000) / 1000000;

    // Get rate for pricing breakdown
    const ratePerMinute = pricingConfig.openai[model].perMinute;

    return {
      transcript: result.text,
      duration: result.duration,
      cost: roundedCost,
      // Include pricing breakdown for debugging
      pricing: {
        model,
        ratePerMinute,
        durationMinutes,
        calculatedCost: cost,
      },
    };
  }
}

export const sttService = new STTService();
