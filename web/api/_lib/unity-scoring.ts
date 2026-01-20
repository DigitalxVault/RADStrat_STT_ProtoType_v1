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
// Critical RT Element Extraction (Deterministic Post-Check)
// ============================================================================

interface CriticalElements {
  gates: string[];
  runways: string[];
  frequencies: string[];
  altitudes: string[];
  callsign: string | null;
}

/**
 * Normalize number words to digits for comparison
 * e.g., "forty-two" -> "42", "twenty seven" -> "27"
 */
function normalizeNumberString(str: string): string {
  let result = str.toLowerCase().trim();

  // Convert number words to digits using WORD_TO_NUMBER mapping
  for (const [word, digit] of Object.entries(WORD_TO_NUMBER)) {
    result = result.replace(new RegExp(`\\b${word}\\b`, 'gi'), digit);
  }

  // Handle compound numbers like "forty two" or "forty-two"
  result = result.replace(/forty[\s-]*(\d)/gi, '4$1');
  result = result.replace(/thirty[\s-]*(\d)/gi, '3$1');
  result = result.replace(/twenty[\s-]*(\d)/gi, '2$1');
  result = result.replace(/\bforty\b/gi, '40');
  result = result.replace(/\bthirty\b/gi, '30');
  result = result.replace(/\btwenty\b/gi, '20');

  // Remove spaces and hyphens, keep only alphanumeric
  return result.replace(/[\s-]+/g, '').toLowerCase();
}

/**
 * Extract critical RT elements from text for deterministic comparison
 */
function extractCriticalElements(text: string): CriticalElements {
  const normalized = text.toLowerCase();

  // Gate numbers: "gate 42", "gate forty-two", "gate forty two"
  const gateMatches = [...normalized.matchAll(/gate\s+([a-z0-9\-\s]+?)(?:\s*,|\s*$|\s+(?:request|for|and))/gi)];
  const gates = gateMatches.map(m => normalizeNumberString(m[1]));

  // Runway numbers: "runway 27L", "runway two seven left"
  const runwayMatches = [...normalized.matchAll(/runway\s+([a-z0-9\-\s]+?)(?:\s*,|\s*$|\s+(?:cleared|for|via))/gi)];
  const runways = runwayMatches.map(m => {
    let rwy = normalizeNumberString(m[1]);
    // Normalize left/right/center
    rwy = rwy.replace(/left/gi, 'l').replace(/right/gi, 'r').replace(/center/gi, 'c');
    return rwy;
  });

  // Frequencies: "121.5", "one two one decimal five"
  const freqMatches = [...normalized.matchAll(/(\d{2,3})[.\s]?(\d{1,3})/g)];
  const frequencies = freqMatches.map(m => `${m[1]}.${m[2]}`);

  // Altitudes: "FL350", "flight level 350", "3500 feet", "altitude 3500"
  const altMatches = [
    ...normalized.matchAll(/(?:fl|flight\s*level)\s*(\d+)/gi),
    ...normalized.matchAll(/(\d+)\s*(?:feet|ft)/gi),
    ...normalized.matchAll(/altitude\s+(\d+)/gi),
  ];
  const altitudes = altMatches.map(m => m[1]);

  // Callsign: typically at the start (e.g., "Ground", "Tower", "Hotel Nine")
  const callsignMatch = normalized.match(/^([a-z]+(?:\s+[a-z0-9]+)?)/i);
  const callsign = callsignMatch ? callsignMatch[1].trim() : null;

  return { gates, runways, frequencies, altitudes, callsign };
}

interface CriticalPenalty {
  total: number;
  details: string[];
}

/**
 * Compare critical RT elements and calculate penalty for mismatches
 * This is the deterministic post-check layer that applies after LLM scoring
 */
function calculateCriticalPenalty(
  expected: string,
  transcript: string,
  difficulty: DifficultyLevel
): CriticalPenalty {
  const expectedElements = extractCriticalElements(expected);
  const transcriptElements = extractCriticalElements(transcript);

  const penalties: { type: string; penalty: number }[] = [];

  // Difficulty multipliers for critical errors
  const multiplier = { easy: 0.8, medium: 1.0, hard: 1.2 }[difficulty];

  // Gate mismatch: -15 points base (safety-critical)
  if (expectedElements.gates.length > 0 && transcriptElements.gates.length > 0) {
    const expectedGate = expectedElements.gates[0];
    const transcriptGate = transcriptElements.gates[0];
    if (expectedGate !== transcriptGate) {
      penalties.push({
        type: `Wrong gate (expected: ${expectedGate}, got: ${transcriptGate})`,
        penalty: Math.round(15 * multiplier),
      });
    }
  } else if (expectedElements.gates.length > 0 && transcriptElements.gates.length === 0) {
    penalties.push({
      type: `Missing gate number (expected: ${expectedElements.gates[0]})`,
      penalty: Math.round(10 * multiplier),
    });
  }

  // Runway mismatch: -20 points base (safety-critical)
  if (expectedElements.runways.length > 0 && transcriptElements.runways.length > 0) {
    const expectedRunway = expectedElements.runways[0];
    const transcriptRunway = transcriptElements.runways[0];
    if (expectedRunway !== transcriptRunway) {
      penalties.push({
        type: `Wrong runway (expected: ${expectedRunway}, got: ${transcriptRunway})`,
        penalty: Math.round(20 * multiplier),
      });
    }
  } else if (expectedElements.runways.length > 0 && transcriptElements.runways.length === 0) {
    penalties.push({
      type: `Missing runway (expected: ${expectedElements.runways[0]})`,
      penalty: Math.round(15 * multiplier),
    });
  }

  // Frequency mismatch: -20 points base (safety-critical)
  if (expectedElements.frequencies.length > 0 && transcriptElements.frequencies.length > 0) {
    const expectedFreq = expectedElements.frequencies[0];
    const transcriptFreq = transcriptElements.frequencies[0];
    if (expectedFreq !== transcriptFreq) {
      penalties.push({
        type: `Wrong frequency (expected: ${expectedFreq}, got: ${transcriptFreq})`,
        penalty: Math.round(20 * multiplier),
      });
    }
  }

  // Altitude mismatch: -15 points base (safety-critical)
  if (expectedElements.altitudes.length > 0 && transcriptElements.altitudes.length > 0) {
    const expectedAlt = expectedElements.altitudes[0];
    const transcriptAlt = transcriptElements.altitudes[0];
    if (expectedAlt !== transcriptAlt) {
      penalties.push({
        type: `Wrong altitude (expected: ${expectedAlt}, got: ${transcriptAlt})`,
        penalty: Math.round(15 * multiplier),
      });
    }
  }

  const total = penalties.reduce((sum, p) => sum + p.penalty, 0);
  const details = penalties.map(p => `${p.type}: -${p.penalty} pts`);

  return { total, details };
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

    // DETERMINISTIC POST-CHECK: Apply critical element penalties
    const criticalPenalty = calculateCriticalPenalty(expected, transcript, difficulty);

    // Calculate base scores from LLM
    const structureScore = Math.min(30, Math.max(0, parsed.structure?.score || 0));
    const rawAccuracyScore = Math.min(50, Math.max(0, parsed.accuracy?.score || 0));
    const fluencyScore = Math.min(20, Math.max(0, adjustedFluency));

    // Apply critical penalty to accuracy score
    const accuracyScore = Math.max(0, rawAccuracyScore - criticalPenalty.total);

    // Build accuracy details with critical errors highlighted
    let accuracyDetails = parsed.accuracy?.details || 'No details provided';
    if (criticalPenalty.details.length > 0) {
      accuracyDetails += ` [CRITICAL ERRORS: ${criticalPenalty.details.join('; ')}]`;
    }

    return {
      scores: {
        structure: {
          score: structureScore,
          details: parsed.structure?.details || 'No details provided',
        },
        accuracy: {
          score: accuracyScore,
          details: accuracyDetails,
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
