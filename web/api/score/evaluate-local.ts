import type { VercelRequest, VercelResponse } from '@vercel/node';
import { evaluateLocal, type EvaluateRequest } from '../_lib/scoring';
import type { DifficultyLevel } from '../_lib/types';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as Omit<EvaluateRequest, 'model'>;

    const { transcript, expected, difficulty, parameters, context } = body;

    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    if (!expected) {
      return res.status(400).json({ error: 'Expected message is required' });
    }

    if (!difficulty) {
      return res.status(400).json({ error: 'Difficulty is required' });
    }

    if (!context?.expectedReceiver || !context?.expectedSender) {
      return res.status(400).json({ error: 'Context with expectedReceiver and expectedSender is required' });
    }

    const validDifficulties: DifficultyLevel[] = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({ error: `Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}` });
    }

    const result = evaluateLocal({
      transcript,
      expected,
      difficulty,
      parameters: parameters || {},
      context,
    });

    res.status(200).json({
      ...result,
      cost: 0,
    });
  } catch (error) {
    console.error('Local evaluation error:', error);
    res.status(500).json({
      error: 'Local evaluation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
