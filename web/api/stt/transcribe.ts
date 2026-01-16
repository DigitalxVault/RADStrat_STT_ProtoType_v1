import type { VercelRequest, VercelResponse } from '@vercel/node';
import { transcribeAudio } from '../_lib/openai';
import { calculateSTTCost } from '../_lib/pricing';
import type { STTModel } from '../_lib/types';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4.5mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { audio, model, mimeType } = req.body as {
      audio: string;
      model: STTModel;
      mimeType?: string;
    };

    if (!audio) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    if (!model) {
      return res.status(400).json({ error: 'Model is required' });
    }

    const validModels: STTModel[] = ['whisper', 'gpt-4o-transcribe', 'gpt-4o-mini-transcribe'];
    if (!validModels.includes(model)) {
      return res.status(400).json({ error: `Invalid model. Must be one of: ${validModels.join(', ')}` });
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audio, 'base64');

    // Transcribe
    const result = await transcribeAudio(audioBuffer, model, mimeType || 'audio/webm');

    // Calculate cost
    const durationMinutes = result.duration / 60;
    const cost = calculateSTTCost(durationMinutes, model);

    res.status(200).json({
      transcript: result.text,
      duration: result.duration,
      cost,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({
      error: 'Transcription failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
