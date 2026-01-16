import { Router, Request, Response } from 'express';
import { sttService } from './stt.service.js';
import { STTModel, SUPPORTED_AUDIO_FORMATS } from '../../types/index.js';

const router = Router();

// POST /api/stt/transcribe
router.post('/transcribe', async (req: Request, res: Response) => {
  try {
    const { audio, model, mimeType } = req.body as {
      audio: string;
      model: STTModel;
      mimeType?: string;
    };

    // Debug: Log received request info
    console.log('[STT Debug] Received request:', {
      mimeType: mimeType || '(not provided)',
      audioLength: audio?.length || 0,
      audioLengthKB: audio ? (audio.length / 1024).toFixed(2) + ' KB' : '0 KB',
      model,
    });

    // Validate mimeType if provided (warn but don't reject for backwards compatibility)
    if (mimeType && !SUPPORTED_AUDIO_FORMATS.includes(mimeType as any)) {
      console.warn(`[STT Debug] Unsupported audio format: ${mimeType}, falling back to audio/webm`);
    }

    if (!audio) {
      res.status(400).json({ error: 'Audio data required' });
      return;
    }

    if (!model) {
      res.status(400).json({ error: 'Model parameter required' });
      return;
    }

    const validModels: STTModel[] = ['whisper', 'gpt-4o-transcribe', 'gpt-4o-mini-transcribe'];
    if (!validModels.includes(model)) {
      res.status(400).json({
        error: `Invalid model. Valid options: ${validModels.join(', ')}`,
      });
      return;
    }

    const result = await sttService.transcribe(audio, model, mimeType);
    res.json(result);
  } catch (error) {
    console.error('STT transcribe error:', error);
    res.status(500).json({
      error: 'Transcription failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export const sttController = router;
