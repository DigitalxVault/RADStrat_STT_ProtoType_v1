import { getLLMFeedback } from '../../clients/openai.client.js';
import { getGrokFeedback } from '../../clients/grok.client.js';
import { calculateScoringCost } from '../../config/pricing.config.js';
import {
  ScoringModel,
  DifficultyLevel,
  EvaluateResponse,
  ScoringParameters,
} from '../../types/index.js';
import { structureEngine } from './engines/structure.engine.js';
import { accuracyEngine } from './engines/accuracy.engine.js';
import { fluencyEngine } from './engines/fluency.engine.js';

export interface EvaluateRequest {
  transcript: string;
  expected: string;
  model: ScoringModel;
  difficulty: DifficultyLevel;
  parameters: ScoringParameters;
  context: {
    expectedReceiver: string;
    expectedSender: string;
    requiresLocation: boolean;
  };
}

export class ScoringService {
  /**
   * Evaluate a transcript using local engines + optional LLM enhancement
   */
  async evaluate(request: EvaluateRequest): Promise<EvaluateResponse> {
    const {
      transcript,
      expected,
      model,
      difficulty,
      parameters,
      context,
    } = request;

    // Step 1: Run local scoring engines (deterministic)
    const structureResult = structureEngine.evaluate(transcript, {
      expectedReceiver: context.expectedReceiver,
      expectedSender: context.expectedSender,
      requiresLocation: context.requiresLocation,
    });

    const accuracyResult = accuracyEngine.evaluate(transcript, {
      expected,
      difficulty,
      werThreshold: parameters.werThreshold,
    });

    const fluencyResult = fluencyEngine.evaluate(transcript, {
      fillerPenalty: parameters.fillerPenalty,
      maxAllowedFillers: parameters.maxAllowedFillers,
      pauseTolerance: parameters.pauseTolerance,
    });

    // Step 2: Get LLM enhancement for detailed feedback (optional)
    let llmFeedback: string | undefined;
    let cost = 0;

    try {
      const llmResult = await this.getLLMEnhancement(
        transcript,
        expected,
        model,
        difficulty,
        structureResult,
        accuracyResult,
        fluencyResult
      );
      llmFeedback = llmResult.feedback;
      cost = llmResult.cost;
    } catch (error) {
      console.warn('LLM enhancement failed, using local scores only:', error);
      // Continue with local scores only
    }

    // Step 3: Calculate total score (weighted)
    const totalScore =
      structureResult.score + // 0-30
      accuracyResult.score + // 0-50
      fluencyResult.score;   // 0-20

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

  /**
   * Get LLM-enhanced feedback for more detailed evaluation
   */
  private async getLLMEnhancement(
    transcript: string,
    expected: string,
    model: ScoringModel,
    difficulty: DifficultyLevel,
    structureResult: ReturnType<typeof structureEngine.evaluate>,
    accuracyResult: ReturnType<typeof accuracyEngine.evaluate>,
    fluencyResult: ReturnType<typeof fluencyEngine.evaluate>
  ): Promise<{ feedback: string; cost: number }> {
    const prompt = this.buildEnhancementPrompt(
      transcript,
      expected,
      difficulty,
      structureResult,
      accuracyResult,
      fluencyResult
    );

    let result: { response: string; tokensUsed: { input: number; output: number } };

    // Use plain text feedback functions (not JSON-forcing evaluation functions)
    if (model === 'grok-4.1-fast') {
      result = await getGrokFeedback(prompt);
    } else {
      result = await getLLMFeedback(prompt, model);
    }

    const cost = calculateScoringCost(
      result.tokensUsed.input,
      result.tokensUsed.output,
      model
    );

    return {
      feedback: result.response,
      cost,
    };
  }

  /**
   * Build prompt for LLM enhancement
   */
  private buildEnhancementPrompt(
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

  /**
   * Quick evaluation without LLM (for cost-conscious mode)
   */
  evaluateLocal(request: Omit<EvaluateRequest, 'model'>): Omit<EvaluateResponse, 'cost' | 'llmFeedback'> {
    const { transcript, expected, difficulty, parameters, context } = request;

    const structureResult = structureEngine.evaluate(transcript, {
      expectedReceiver: context.expectedReceiver,
      expectedSender: context.expectedSender,
      requiresLocation: context.requiresLocation,
    });

    const accuracyResult = accuracyEngine.evaluate(transcript, {
      expected,
      difficulty,
      werThreshold: parameters.werThreshold,
    });

    const fluencyResult = fluencyEngine.evaluate(transcript, {
      fillerPenalty: parameters.fillerPenalty,
      maxAllowedFillers: parameters.maxAllowedFillers,
      pauseTolerance: parameters.pauseTolerance,
    });

    const totalScore =
      structureResult.score +
      accuracyResult.score +
      fluencyResult.score;

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
}

export const scoringService = new ScoringService();
