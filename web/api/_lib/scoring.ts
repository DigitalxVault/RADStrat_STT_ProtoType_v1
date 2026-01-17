import { getLLMFeedback, getLLMScoring } from './openai';
import { getGrokFeedback, getGrokScoring } from './grok';
import { calculateScoringCost } from './pricing';
import { structureEngine } from './engines/structure';
import { accuracyEngine } from './engines/accuracy';
import { fluencyEngine } from './engines/fluency';
import type { ScoringModel, DifficultyLevel, EvaluateResponse, ScoringParameters } from './types';

// Default scoring prompt for LLM-based evaluation
const DEFAULT_SCORING_PROMPT = `You are evaluating Radio Telephony (RT) communication for training purposes.

EVALUATION RULES:
- Transcripts are in English
- Treat equivalent terms as identical: "ONE"/"One"/"1", "BLUECROSS 1"/"Blue Cross One"
- Focus on MEANING, not exact formatting or capitalization
- Be lenient on minor transcription differences (STT artifacts)
- Structure: Did they follow Receiver → Sender → Message order?
- Accuracy: Did they convey the correct information?
- Fluency: Was the delivery clear and natural?

Score each category:
- Structure: 0-30 points
- Accuracy: 0-50 points
- Fluency: 0-20 points

Return JSON format:
{
  "structure": { "score": N, "explanation": "..." },
  "accuracy": { "score": N, "explanation": "..." },
  "fluency": { "score": N, "explanation": "..." },
  "feedback": "Brief constructive feedback (2-3 sentences)"
}`;

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

  // Check if we should use LLM-based scoring
  const scoringPrompt = params.customScoringPrompt;

  if (scoringPrompt !== undefined) {
    // Use LLM for all scoring
    return evaluateWithLLM(transcript, expected, model, scoringPrompt, context);
  }

  // Fall back to local scoring engines
  return evaluateWithLocalEngines(transcript, expected, model, difficulty, params, context);
}

async function evaluateWithLLM(
  transcript: string,
  expected: string,
  model: ScoringModel,
  scoringPrompt: string,
  context: EvaluateRequest['context']
): Promise<EvaluateResponse> {
  const systemPrompt = scoringPrompt || DEFAULT_SCORING_PROMPT;

  const userPrompt = `EXPECTED MESSAGE:
"${expected}"

USER TRANSCRIPT:
"${transcript}"

CONTEXT:
- Expected Receiver: ${context.expectedReceiver}
- Expected Sender: ${context.expectedSender}

Please evaluate the transcript according to your instructions and return the JSON scores.`;

  let result: { response: string; tokensUsed: { input: number; output: number } };

  if (model === 'grok-4.1-fast') {
    result = await getGrokScoring(systemPrompt, userPrompt);
  } else {
    result = await getLLMScoring(systemPrompt, userPrompt, model);
  }

  const cost = calculateScoringCost(result.tokensUsed.input, result.tokensUsed.output, model);

  // Parse LLM JSON response
  try {
    const parsed = JSON.parse(result.response);

    return {
      structure: {
        score: Math.min(30, Math.max(0, parsed.structure?.score ?? 0)),
        details: parsed.structure?.explanation ?? 'LLM-based evaluation',
        receiverCorrect: undefined,
        senderCorrect: undefined,
        detectedOrder: undefined,
      },
      accuracy: {
        score: Math.min(50, Math.max(0, parsed.accuracy?.score ?? 0)),
        details: parsed.accuracy?.explanation ?? 'LLM-based evaluation',
        matchedElements: undefined,
        missingElements: undefined,
      },
      fluency: {
        score: Math.min(20, Math.max(0, parsed.fluency?.score ?? 0)),
        fillers: [],
        fillerCount: 0,
        corrections: undefined,
        rating: 'LLM Evaluated',
        details: parsed.fluency?.explanation ?? 'LLM-based evaluation',
      },
      total: Math.min(100, Math.max(0,
        (parsed.structure?.score ?? 0) +
        (parsed.accuracy?.score ?? 0) +
        (parsed.fluency?.score ?? 0)
      )),
      cost,
      llmFeedback: parsed.feedback ?? undefined,
    };
  } catch (parseError) {
    console.error('Failed to parse LLM scoring response:', parseError, result.response);
    // Return a fallback response with the raw LLM output as feedback
    return {
      structure: { score: 0, details: 'Failed to parse LLM response' },
      accuracy: { score: 0, details: 'Failed to parse LLM response' },
      fluency: {
        score: 0,
        fillers: [],
        fillerCount: 0,
        rating: 'Error',
        details: 'Failed to parse LLM response',
      },
      total: 0,
      cost,
      llmFeedback: result.response,
    };
  }
}

async function evaluateWithLocalEngines(
  transcript: string,
  expected: string,
  model: ScoringModel,
  difficulty: DifficultyLevel,
  params: ScoringParameters,
  context: EvaluateRequest['context']
): Promise<EvaluateResponse> {
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
