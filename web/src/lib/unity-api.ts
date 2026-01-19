/**
 * Unity Scoring API Client
 *
 * ISOLATED from existing API client.
 * Used for the STANDALONE SCORING (Unity) tab.
 */

import type { DifficultyLevel, ScoringModel } from '../types';

const API_BASE = '/api';

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

export interface UnityScoreRequest {
  transcript: string;
  expected: string;
  difficulty: DifficultyLevel;
  customPrompt?: string;
}

export interface UnityApiError {
  success: false;
  error: string;
  message: string;
}

// ============================================================================
// Error Class
// ============================================================================

export class UnityApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'UnityApiError';
  }
}

// ============================================================================
// API Client
// ============================================================================

/**
 * Score a transmission using the Unity API endpoint
 *
 * This runs the scoring through ALL 3 models (gpt-4o, gpt-4o-mini, grok-4.1-fast)
 * in parallel and returns comparison results.
 *
 * @param request - The scoring request parameters
 * @param apiKey - The Unity API key for authentication
 * @returns Scoring results from all 3 models
 */
export async function scoreUnityTransmission(
  request: UnityScoreRequest,
  apiKey: string
): Promise<UnityScoringResponse> {
  const response = await fetch(`${API_BASE}/unity/score`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(request),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new UnityApiError(
      response.status,
      data.error || 'Unknown Error',
      data.message || 'Request failed'
    );
  }

  return data as UnityScoringResponse;
}

/**
 * Test the Unity API connection
 *
 * Sends a minimal request to verify the API key is valid.
 */
export async function testUnityApiConnection(apiKey: string): Promise<boolean> {
  try {
    // Send a minimal test request
    await scoreUnityTransmission(
      {
        transcript: 'Test',
        expected: 'Test',
        difficulty: 'easy',
      },
      apiKey
    );
    return true;
  } catch (error) {
    if (error instanceof UnityApiError && error.status === 401) {
      return false; // Invalid API key
    }
    throw error; // Other errors should bubble up
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate score per dollar for model comparison
 */
export function calculateScorePerDollar(result: UnityScoreResult): number {
  if (result.cost <= 0) return 0;
  return result.total / result.cost;
}

/**
 * Get the best performing model from results
 */
export function getBestModel(
  results: UnityModelResults,
  criteria: 'score' | 'cost' | 'value'
): ScoringModel {
  const models: ScoringModel[] = ['gpt-4o', 'gpt-4o-mini', 'grok-4.1-fast'];

  switch (criteria) {
    case 'score':
      return models.reduce((best, model) =>
        results[model].total > results[best].total ? model : best
      );

    case 'cost':
      return models.reduce((best, model) =>
        results[model].cost < results[best].cost ? model : best
      );

    case 'value':
      return models.reduce((best, model) =>
        calculateScorePerDollar(results[model]) > calculateScorePerDollar(results[best])
          ? model
          : best
      );
  }
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.0001) {
    return `$${cost.toFixed(6)}`;
  }
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(3)}`;
}

/**
 * Format latency for display
 */
export function formatLatency(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}
