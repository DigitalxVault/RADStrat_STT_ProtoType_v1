/**
 * Unity Scoring Module - ISOLATED from existing scoring system
 *
 * This module provides standalone scoring for Unity integration.
 * DO NOT import from ./scoring.ts - keep completely isolated.
 */

import { getLLMScoring } from './openai';
import { getGrokScoring } from './grok';
import { calculateScoringCost } from './pricing';
import type { DifficultyLevel, ScoringModel } from './types';

// ============================================================================
// Types
// ============================================================================

export interface UnityScoreResult {
  scores: {
    structure: { score: number; details: string };
    accuracy: { score: number; details: string };
    fluency: { score: number; fillers: string[]; details: string };
  };
  total: number;
  feedback: string;
  cost: number;
  latency_ms: number;
}

export interface UnityModelResults {
  'gpt-4o': UnityScoreResult;
  'gpt-4o-mini': UnityScoreResult;
  'grok-4.1-fast': UnityScoreResult;
}

export interface UnityScoringResponse {
  success: boolean;
  timestamp: string;
  input: {
    transcript: string;
    expected: string;
    difficulty: DifficultyLevel;
  };
  modelResults: UnityModelResults;
  summary: {
    totalCost: number;
    bestValue: ScoringModel;
    highestScore: ScoringModel;
  };
}

export interface UnityScoringConfig {
  fillerPenalty: number;
  maxFillers: number;
  customPrompt?: string;
}

// ============================================================================
// Number Equivalence Mapping
// ============================================================================

const NUMBER_WORDS: Record<string, string> = {
  '0': 'zero',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
  '10': 'ten',
  '11': 'eleven',
  '12': 'twelve',
  '13': 'thirteen',
  '14': 'fourteen',
  '15': 'fifteen',
  '16': 'sixteen',
  '17': 'seventeen',
  '18': 'eighteen',
  '19': 'nineteen',
  '20': 'twenty',
  '21': 'twenty-one',
  '22': 'twenty-two',
  '23': 'twenty-three',
  '24': 'twenty-four',
  '25': 'twenty-five',
  '26': 'twenty-six',
  '27': 'twenty-seven',
  '28': 'twenty-eight',
  '29': 'twenty-nine',
  '30': 'thirty',
};

// Reverse mapping (word to digit)
const WORD_TO_NUMBER: Record<string, string> = Object.fromEntries(
  Object.entries(NUMBER_WORDS).map(([k, v]) => [v.toLowerCase(), k])
);

/**
 * Normalize text by converting numbers to words for comparison
 */
function normalizeText(text: string): string {
  let normalized = text.toLowerCase().trim();

  // Replace digits with words
  for (const [digit, word] of Object.entries(NUMBER_WORDS)) {
    // Match standalone numbers (not part of larger numbers)
    const regex = new RegExp(`\\b${digit}\\b`, 'g');
    normalized = normalized.replace(regex, word);
  }

  // Remove punctuation for comparison
  normalized = normalized.replace(/[.,!?;:]/g, '');

  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

// ============================================================================
// Filler Word Detection
// ============================================================================

const FILLER_WORDS = [
  'um', 'uh', 'er', 'ah', 'like', 'you know', 'actually', 'basically',
  'literally', 'so', 'well', 'I mean', 'right', 'okay so', 'hmm', 'ehh'
];

/**
 * Detect filler words in transcript
 */
function detectFillers(transcript: string): string[] {
  const lowerTranscript = transcript.toLowerCase();
  const foundFillers: string[] = [];

  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = lowerTranscript.match(regex);
    if (matches) {
      foundFillers.push(...matches.map(m => m.toLowerCase()));
    }
  }

  return foundFillers;
}

/**
 * Detect repeated words (indicates hesitation)
 */
function detectRepeatedWords(transcript: string): string[] {
  const words = transcript.toLowerCase().split(/\s+/);
  const repeated: string[] = [];

  for (let i = 1; i < words.length; i++) {
    if (words[i] === words[i - 1] && words[i].length > 2) {
      repeated.push(words[i]);
    }
  }

  return repeated;
}

// ============================================================================
// Difficulty Settings
// ============================================================================

interface DifficultySettings {
  fillerPenalty: number;
  werThreshold: number;
  structureWeight: number;
}

const DIFFICULTY_SETTINGS: Record<DifficultyLevel, DifficultySettings> = {
  easy: { fillerPenalty: 1, werThreshold: 0.50, structureWeight: 0.8 },
  medium: { fillerPenalty: 2, werThreshold: 0.30, structureWeight: 1.0 },
  hard: { fillerPenalty: 3, werThreshold: 0.15, structureWeight: 1.2 },
};

// ============================================================================
// LLM Scoring Prompt
// ============================================================================

function buildScoringPrompt(
  transcript: string,
  expected: string,
  difficulty: DifficultyLevel,
  customPrompt?: string
): { system: string; user: string } {
  const settings = DIFFICULTY_SETTINGS[difficulty];

  // Base system prompt (always included)
  let system = `You are an expert Radio Telephony (RT) communication evaluator for aviation training.

Evaluate the user's transmission against the expected transmission.

IMPORTANT SCORING RULES:
1. Numbers should be treated as equivalent: "1" = "one", "2" = "two", etc.
2. Ignore minor punctuation differences
3. Focus on key RT elements: callsigns, locations, instructions, readbacks

SCORING CRITERIA:
- STRUCTURE (0-30 points): Correct order of elements (receiver → sender → location/intent)
- ACCURACY (0-50 points): Word-level match with expected transmission (allow ${Math.round(settings.werThreshold * 100)}% tolerance)
- FLUENCY (0-20 points): No fillers, hesitations, or self-corrections`;

  // Append custom instructions if provided
  if (customPrompt && customPrompt.trim()) {
    system += `

ADDITIONAL INSTRUCTIONS:
${customPrompt.trim()}`;
  }

  // Always include JSON format requirement at the end
  system += `

Respond ONLY with valid JSON in this exact format:
{
  "structure": { "score": <0-30>, "details": "<explanation>" },
  "accuracy": { "score": <0-50>, "details": "<explanation>" },
  "fluency": { "score": <0-20>, "details": "<explanation>" },
  "feedback": "<1-2 sentence constructive feedback>"
}`;

  const user = `Expected transmission: "${expected}"

User's transmission: "${transcript}"

Difficulty level: ${difficulty}

Evaluate the transmission and provide scores.`;

  return { system, user };
}

// ============================================================================
// Score with Single Model
// ============================================================================

async function scoreWithModel(
  transcript: string,
  expected: string,
  difficulty: DifficultyLevel,
  model: ScoringModel,
  customPrompt?: string
): Promise<UnityScoreResult> {
  const startTime = Date.now();
  const settings = DIFFICULTY_SETTINGS[difficulty];

  // Detect fillers for fluency penalty
  const fillers = detectFillers(transcript);
  const repeatedWords = detectRepeatedWords(transcript);
  const allFillers = [...fillers, ...repeatedWords.map(w => `(repeated: ${w})`)];

  // Build prompt
  const { system, user } = buildScoringPrompt(transcript, expected, difficulty, customPrompt);

  try {
    // Call appropriate API
    let response: { response: string; tokensUsed: { input: number; output: number } };

    if (model === 'grok-4.1-fast') {
      response = await getGrokScoring(system, user);
    } else {
      response = await getLLMScoring(system, user, model);
    }

    // Parse JSON response
    const parsed = JSON.parse(response.response);

    // Apply filler penalty to fluency score
    const fillerPenalty = Math.min(allFillers.length * settings.fillerPenalty, 20);
    const adjustedFluency = Math.max(0, (parsed.fluency?.score || 20) - fillerPenalty);

    // Calculate cost
    const cost = calculateScoringCost(
      response.tokensUsed.input,
      response.tokensUsed.output,
      model
    );

    const latency_ms = Date.now() - startTime;

    const structureScore = Math.min(30, Math.max(0, parsed.structure?.score || 0));
    const accuracyScore = Math.min(50, Math.max(0, parsed.accuracy?.score || 0));
    const fluencyScore = Math.min(20, Math.max(0, adjustedFluency));

    return {
      scores: {
        structure: {
          score: structureScore,
          details: parsed.structure?.details || 'No details provided',
        },
        accuracy: {
          score: accuracyScore,
          details: parsed.accuracy?.details || 'No details provided',
        },
        fluency: {
          score: fluencyScore,
          fillers: allFillers,
          details: parsed.fluency?.details ||
            (allFillers.length > 0
              ? `Detected ${allFillers.length} filler(s)/hesitation(s). Penalty: -${fillerPenalty} points.`
              : 'No fillers detected. Good fluency.'),
        },
      },
      total: structureScore + accuracyScore + fluencyScore,
      feedback: parsed.feedback || 'No feedback provided.',
      cost,
      latency_ms,
    };
  } catch (error) {
    const latency_ms = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    return {
      scores: {
        structure: { score: 0, details: `Error: ${errorMsg}` },
        accuracy: { score: 0, details: `Error: ${errorMsg}` },
        fluency: { score: 0, fillers: allFillers, details: `Error: ${errorMsg}` },
      },
      total: 0,
      feedback: `Scoring failed: ${errorMsg}`,
      cost: 0,
      latency_ms,
    };
  }
}

// ============================================================================
// Main Scoring Function - Parallel Multi-Model
// ============================================================================

export async function scoreTransmission(
  transcript: string,
  expected: string,
  difficulty: DifficultyLevel,
  config?: UnityScoringConfig
): Promise<UnityScoringResponse> {
  const timestamp = new Date().toISOString();

  // Normalize inputs for comparison logging
  const normalizedTranscript = normalizeText(transcript);
  const normalizedExpected = normalizeText(expected);

  console.log('[Unity Scoring] Starting parallel scoring');
  console.log('[Unity Scoring] Normalized transcript:', normalizedTranscript);
  console.log('[Unity Scoring] Normalized expected:', normalizedExpected);

  // Score with all 3 models in parallel
  const models: ScoringModel[] = ['gpt-4o', 'gpt-4o-mini', 'grok-4.1-fast'];

  const results = await Promise.all(
    models.map(model => scoreWithModel(transcript, expected, difficulty, model, config?.customPrompt))
  );

  const modelResults: UnityModelResults = {
    'gpt-4o': results[0],
    'gpt-4o-mini': results[1],
    'grok-4.1-fast': results[2],
  };

  // Calculate summary
  const totalCost = results.reduce((sum, r) => sum + r.cost, 0);

  // Find highest score
  let highestScore: ScoringModel = 'gpt-4o';
  let maxScore = 0;
  for (const model of models) {
    if (modelResults[model].total > maxScore) {
      maxScore = modelResults[model].total;
      highestScore = model;
    }
  }

  // Find best value (score per dollar)
  let bestValue: ScoringModel = 'gpt-4o-mini';
  let bestRatio = 0;
  for (const model of models) {
    const result = modelResults[model];
    const ratio = result.cost > 0 ? result.total / result.cost : 0;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestValue = model;
    }
  }

  return {
    success: true,
    timestamp,
    input: {
      transcript,
      expected,
      difficulty,
    },
    modelResults,
    summary: {
      totalCost,
      bestValue,
      highestScore,
    },
  };
}
