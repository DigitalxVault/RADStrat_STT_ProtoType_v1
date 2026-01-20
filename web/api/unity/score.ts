/**
 * Unity Scoring API Endpoint
 *
 * POST /api/unity/score
 *
 * Scores a transmission using ALL 3 models in parallel.
 * Returns comparison results for model performance analysis.
 *
 * ISOLATED from existing scoring system.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from '../_lib/config';
import { scoreTransmission, type UnityScoringResponse } from '../_lib/unity-scoring';
import type { DifficultyLevel } from '../_lib/types';
import { saveRequestLog, type UnityLogEntry } from '../_lib/unity-kv';

interface UnityScoreRequest {
  transcript: string;
  expected: string;
  difficulty: DifficultyLevel;
  customPrompt?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS headers for Unity WebGL builds
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  // Validate API key
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey || apiKey !== config.unity.apiKey) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Missing or invalid X-API-Key header',
    });
    return;
  }

  try {
    const body = req.body as UnityScoreRequest;

    // Validate required fields
    if (!body.transcript || typeof body.transcript !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'transcript is required and must be a string',
      });
      return;
    }

    if (!body.expected || typeof body.expected !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'expected is required and must be a string',
      });
      return;
    }

    if (!body.difficulty) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'difficulty is required',
      });
      return;
    }

    const validDifficulties: DifficultyLevel[] = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(body.difficulty)) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `difficulty must be one of: ${validDifficulties.join(', ')}`,
      });
      return;
    }

    console.log('[Unity Score API] Processing request:', {
      transcriptLength: body.transcript.length,
      expectedLength: body.expected.length,
      difficulty: body.difficulty,
    });

    // Score with all 3 models
    const result: UnityScoringResponse = await scoreTransmission(
      body.transcript,
      body.expected,
      body.difficulty,
      body.customPrompt ? { customPrompt: body.customPrompt, fillerPenalty: 2, maxFillers: 5 } : undefined
    );

    console.log('[Unity Score API] Scoring complete:', {
      totalCost: result.summary.totalCost,
      highestScore: result.summary.highestScore,
      bestValue: result.summary.bestValue,
    });

    // Log to KV for Dashboard visibility (awaited for immediate sync)
    const logEntry: UnityLogEntry = {
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: result.timestamp,
      input: result.input,
      results: result.modelResults,
      summary: result.summary,
    };

    // Await the save so Dashboard can immediately sync the new entry
    let logged = false;
    let kvAvailable = true;
    try {
      logged = await saveRequestLog(logEntry);
      if (!logged) {
        kvAvailable = false;
        console.warn('[Unity Score API] KV not configured - log not saved');
      }
    } catch (err) {
      console.error('[Unity Score API] KV logging failed:', err);
      logged = false;
    }

    // Include logging status in response (for debugging)
    res.status(200).json({
      ...result,
      _meta: { logged, kvAvailable },
    });
  } catch (error) {
    console.error('[Unity Score API] Error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    });
  }
}
