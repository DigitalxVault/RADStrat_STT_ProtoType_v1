import { Router, Request, Response } from 'express';
import { scoringService, EvaluateRequest } from './scoring.service.js';
import {
  ScoringModel,
  DifficultyLevel,
  ScoringParameters,
} from '../../types/index.js';

const router = Router();

// Default scoring parameters
const DEFAULT_PARAMETERS: ScoringParameters = {
  werThreshold: 20,
  fillerPenalty: 1,
  maxAllowedFillers: 2,
  pauseTolerance: 2,
};

// POST /api/score/evaluate
router.post('/evaluate', async (req: Request, res: Response) => {
  try {
    const {
      transcript,
      expected,
      model,
      difficulty,
      parameters = {},
      context,
    } = req.body as {
      transcript: string;
      expected: string;
      model: ScoringModel;
      difficulty: DifficultyLevel;
      parameters?: Partial<ScoringParameters>;
      context: {
        expectedReceiver: string;
        expectedSender: string;
        requiresLocation?: boolean;
      };
    };

    // Validate required fields
    if (!transcript) {
      res.status(400).json({ error: 'Transcript is required' });
      return;
    }

    if (!expected) {
      res.status(400).json({ error: 'Expected message is required' });
      return;
    }

    if (!model) {
      res.status(400).json({ error: 'Scoring model is required' });
      return;
    }

    const validModels: ScoringModel[] = ['gpt-4o', 'gpt-4o-mini', 'grok-4.1-fast'];
    if (!validModels.includes(model)) {
      res.status(400).json({
        error: `Invalid model. Valid options: ${validModels.join(', ')}`,
      });
      return;
    }

    if (!difficulty) {
      res.status(400).json({ error: 'Difficulty level is required' });
      return;
    }

    const validDifficulties: DifficultyLevel[] = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(difficulty)) {
      res.status(400).json({
        error: `Invalid difficulty. Valid options: ${validDifficulties.join(', ')}`,
      });
      return;
    }

    if (!context || !context.expectedReceiver || !context.expectedSender) {
      res.status(400).json({
        error: 'Context with expectedReceiver and expectedSender is required',
      });
      return;
    }

    // Merge with default parameters
    const mergedParameters: ScoringParameters = {
      ...DEFAULT_PARAMETERS,
      ...parameters,
    };

    const evaluateRequest: EvaluateRequest = {
      transcript,
      expected,
      model,
      difficulty,
      parameters: mergedParameters,
      context: {
        expectedReceiver: context.expectedReceiver,
        expectedSender: context.expectedSender,
        requiresLocation: context.requiresLocation ?? false,
      },
    };

    const result = await scoringService.evaluate(evaluateRequest);
    res.json(result);
  } catch (error) {
    console.error('Scoring evaluation error:', error);
    res.status(500).json({
      error: 'Evaluation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/score/evaluate-local (no LLM, cost-free)
router.post('/evaluate-local', (req: Request, res: Response) => {
  try {
    const {
      transcript,
      expected,
      difficulty,
      parameters = {},
      context,
    } = req.body as {
      transcript: string;
      expected: string;
      difficulty: DifficultyLevel;
      parameters?: Partial<ScoringParameters>;
      context: {
        expectedReceiver: string;
        expectedSender: string;
        requiresLocation?: boolean;
      };
    };

    // Validate required fields
    if (!transcript || !expected || !difficulty || !context) {
      res.status(400).json({
        error: 'Missing required fields: transcript, expected, difficulty, context',
      });
      return;
    }

    const mergedParameters: ScoringParameters = {
      ...DEFAULT_PARAMETERS,
      ...parameters,
    };

    const result = scoringService.evaluateLocal({
      transcript,
      expected,
      difficulty,
      parameters: mergedParameters,
      context: {
        expectedReceiver: context.expectedReceiver,
        expectedSender: context.expectedSender,
        requiresLocation: context.requiresLocation ?? false,
      },
    });

    res.json({ ...result, cost: 0 });
  } catch (error) {
    console.error('Local scoring error:', error);
    res.status(500).json({
      error: 'Local evaluation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export const scoringController = router;
