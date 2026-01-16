import type { VercelRequest, VercelResponse } from '@vercel/node';
import { evaluate, type EvaluateRequest } from '../_lib/scoring';
import type { ScoringModel, DifficultyLevel } from '../_lib/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as EvaluateRequest;

    const { transcript, expected, model, difficulty, parameters, context } = body;

    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    if (!expected) {
      return res.status(400).json({ error: 'Expected message is required' });
    }

    if (!model) {
      return res.status(400).json({ error: 'Model is required' });
    }

    if (!difficulty) {
      return res.status(400).json({ error: 'Difficulty is required' });
    }

    if (!context?.expectedReceiver || !context?.expectedSender) {
      return res.status(400).json({ error: 'Context with expectedReceiver and expectedSender is required' });
    }

    const validModels: ScoringModel[] = ['gpt-4o', 'gpt-4o-mini', 'grok-4.1-fast'];
    if (!validModels.includes(model)) {
      return res.status(400).json({ error: `Invalid model. Must be one of: ${validModels.join(', ')}` });
    }

    const validDifficulties: DifficultyLevel[] = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({ error: `Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}` });
    }

    const result = await evaluate({
      transcript,
      expected,
      model,
      difficulty,
      parameters: parameters || {},
      context,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Evaluation error:', error);
    res.status(500).json({
      error: 'Evaluation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
