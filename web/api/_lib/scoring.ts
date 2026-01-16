import { getLLMFeedback } from './openai';
import { getGrokFeedback } from './grok';
import { calculateScoringCost } from './pricing';
import { structureEngine } from './engines/structure';
import { accuracyEngine } from './engines/accuracy';
import { fluencyEngine } from './engines/fluency';
import type { ScoringModel, DifficultyLevel, EvaluateResponse, ScoringParameters } from './types';

export interface EvaluateRequest {
  transcript: string;
  expected: string;
  model: ScoringModel;
  difficulty: DifficultyLevel;
  parameters: Partial<ScoringParameters>;
  context: {
    expectedReceiver: string;
    expectedSender: string;
    requiresLocation?: boolean;
  };
}

const DEFAULT_PARAMS: Record<DifficultyLevel, ScoringParameters> = {
  easy: { werThreshold: 50, fillerPenalty: 1, maxAllowedFillers: 3, pauseTolerance: 3 },
  medium: { werThreshold: 30, fillerPenalty: 2, maxAllowedFillers: 2, pauseTolerance: 2 },
  hard: { werThreshold: 15, fillerPenalty: 3, maxAllowedFillers: 1, pauseTolerance: 1 },
};

export async function evaluate(request: EvaluateRequest): Promise<EvaluateResponse> {
  const { transcript, expected, model, difficulty, parameters, context } = request;

  const params = { ...DEFAULT_PARAMS[difficulty], ...parameters };

  // Run local scoring engines
  const structureResult = structureEngine.evaluate(transcript, {
    expectedReceiver: context.expectedReceiver,
    expectedSender: context.expectedSender,
    requiresLocation: context.requiresLocation ?? true,
  });

  const accuracyResult = accuracyEngine.evaluate(transcript, {
    expected,
    difficulty,
    werThreshold: params.werThreshold,
  });

  const fluencyResult = fluencyEngine.evaluate(transcript, {
    fillerPenalty: params.fillerPenalty,
    maxAllowedFillers: params.maxAllowedFillers,
    pauseTolerance: params.pauseTolerance,
  });

  // Get LLM feedback
  let llmFeedback: string | undefined;
  let cost = 0;

  try {
    const prompt = buildEnhancementPrompt(
      transcript, expected, difficulty,
      structureResult, accuracyResult, fluencyResult
    );

    let result: { response: string; tokensUsed: { input: number; output: number } };

    if (model === 'grok-4.1-fast') {
      result = await getGrokFeedback(prompt);
    } else {
      result = await getLLMFeedback(prompt, model);
    }

    llmFeedback = result.response;
    cost = calculateScoringCost(result.tokensUsed.input, result.tokensUsed.output, model);
  } catch (error) {
    console.warn('LLM enhancement failed:', error);
  }

  const totalScore = structureResult.score + accuracyResult.score + fluencyResult.score;

  return {
    accuracy: {
      score: accuracyResult.score,
      details: accuracyResult.explanation,
      matchedElements: accuracyResult.matchedElements,
      missingElements: accuracyResult.missingElements,
    },
    structure: {
      score: structureResult.score,
      details: structureResult.explanation,
      receiverCorrect: structureResult.receiverCorrect,
      senderCorrect: structureResult.senderCorrect,
      detectedOrder: structureResult.detectedOrder,
    },
    fluency: {
      score: fluencyResult.score,
      fillers: fluencyResult.fillersDetected,
      fillerCount: fluencyResult.fillerCount,
      corrections: fluencyResult.correctionsDetected,
      rating: fluencyResult.fluencyRating,
      details: fluencyResult.explanation,
    },
    total: totalScore,
    cost,
    llmFeedback,
  };
}

export function evaluateLocal(request: Omit<EvaluateRequest, 'model'>): Omit<EvaluateResponse, 'cost' | 'llmFeedback'> {
  const { transcript, expected, difficulty, parameters, context } = request;

  const params = { ...DEFAULT_PARAMS[difficulty], ...parameters };

  const structureResult = structureEngine.evaluate(transcript, {
    expectedReceiver: context.expectedReceiver,
    expectedSender: context.expectedSender,
    requiresLocation: context.requiresLocation ?? true,
  });

  const accuracyResult = accuracyEngine.evaluate(transcript, {
    expected,
    difficulty,
    werThreshold: params.werThreshold,
  });

  const fluencyResult = fluencyEngine.evaluate(transcript, {
    fillerPenalty: params.fillerPenalty,
    maxAllowedFillers: params.maxAllowedFillers,
    pauseTolerance: params.pauseTolerance,
  });

  const totalScore = structureResult.score + accuracyResult.score + fluencyResult.score;

  return {
    accuracy: {
      score: accuracyResult.score,
      details: accuracyResult.explanation,
      matchedElements: accuracyResult.matchedElements,
      missingElements: accuracyResult.missingElements,
    },
    structure: {
      score: structureResult.score,
      details: structureResult.explanation,
      receiverCorrect: structureResult.receiverCorrect,
      senderCorrect: structureResult.senderCorrect,
      detectedOrder: structureResult.detectedOrder,
    },
    fluency: {
      score: fluencyResult.score,
      fillers: fluencyResult.fillersDetected,
      fillerCount: fluencyResult.fillerCount,
      corrections: fluencyResult.correctionsDetected,
      rating: fluencyResult.fluencyRating,
      details: fluencyResult.explanation,
    },
    total: totalScore,
  };
}

function buildEnhancementPrompt(
  transcript: string,
  expected: string,
  difficulty: DifficultyLevel,
  structureResult: ReturnType<typeof structureEngine.evaluate>,
  accuracyResult: ReturnType<typeof accuracyEngine.evaluate>,
  fluencyResult: ReturnType<typeof fluencyEngine.evaluate>
): string {
  return `You are an expert Radio Telephony (RT) communication evaluator for airfield operations.

EXPECTED MESSAGE:
"${expected}"

USER TRANSCRIPT:
"${transcript}"

DIFFICULTY LEVEL: ${difficulty.toUpperCase()}

PRELIMINARY SCORES (from automated analysis):
- Structure: ${structureResult.score}/30 - ${structureResult.explanation}
- Accuracy: ${accuracyResult.score}/50 - ${accuracyResult.explanation}
- Fluency: ${fluencyResult.score}/20 - ${fluencyResult.explanation}

Please provide:
1. A brief (2-3 sentence) overall assessment
2. One specific improvement suggestion for the user
3. Acknowledgment of what they did well (if anything)

Keep your response concise (under 100 words) and constructive.`;
}
