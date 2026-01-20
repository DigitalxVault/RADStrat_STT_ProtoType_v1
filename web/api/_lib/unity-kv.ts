/**
 * Unity KV Logging Utilities
 *
 * Server-side logging for Unity API requests using Vercel KV.
 * Provides persistent storage so Dashboard can show Unity requests.
 */

import { kv } from '@vercel/kv';

const LOGS_KEY = 'unity:logs';
const MAX_LOGS = 500;

// Types matching the Unity scoring response structure from unity-scoring.ts
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

export interface UnityLogEntry {
  id: string;
  timestamp: string;
  input: {
    transcript: string;
    expected: string;
    difficulty: string;
  };
  results: {
    'gpt-4o': UnityScoreResult;
    'gpt-4o-mini': UnityScoreResult;
    'grok-4.1-fast': UnityScoreResult;
  };
  summary: {
    totalCost: number;
    bestValue: string;
    highestScore: string;
  };
}

export interface AggregateStats {
  totalRequests: number;
  totalCost: number;
  avgScore: number;
  modelUsage: {
    [model: string]: {
      count: number;
      avgScore: number;
      totalCost: number;
    };
  };
}

/**
 * Check if KV is available (for local dev fallback)
 */
function isKVAvailable(): boolean {
  const hasUrl = !!process.env.KV_REST_API_URL;
  const hasToken = !!process.env.KV_REST_API_TOKEN;
  console.log('[KV] Availability check:', { hasUrl, hasToken, available: hasUrl && hasToken });
  return hasUrl && hasToken;
}

/**
 * Save a request log entry to KV
 * Uses atomic LPUSH + LTRIM to avoid race conditions
 * Returns true if saved successfully, false if KV unavailable
 */
export async function saveRequestLog(log: UnityLogEntry): Promise<boolean> {
  if (!isKVAvailable()) {
    console.log('[KV] Skipping log save - KV not configured');
    return false; // Return false to indicate save was skipped
  }

  try {
    // Atomic prepend - no read-modify-write race condition
    await kv.lpush(LOGS_KEY, JSON.stringify(log));

    // Atomic trim to max logs
    await kv.ltrim(LOGS_KEY, 0, MAX_LOGS - 1);

    console.log(`[KV] Saved log ${log.id}`);
    return true;
  } catch (err) {
    console.error('[KV] Failed to save log:', err);
    throw err;
  }
}

/**
 * Fetch request logs from KV
 * Uses LRANGE for atomic list reading
 */
export async function getRequestLogs(limit?: number): Promise<UnityLogEntry[]> {
  if (!isKVAvailable()) {
    console.log('[KV] Returning empty logs - KV not configured');
    return [];
  }

  try {
    const count = limit && limit > 0 ? limit : MAX_LOGS;
    const rawLogs = await kv.lrange(LOGS_KEY, 0, count - 1);

    // Parse JSON strings back to objects
    return rawLogs.map((item: string | UnityLogEntry) =>
      typeof item === 'string' ? JSON.parse(item) : item
    );
  } catch (err) {
    console.error('[KV] Failed to fetch logs:', err);
    throw err;
  }
}

/**
 * Delete a specific log entry
 * Uses LREM for atomic list removal
 */
export async function deleteRequestLog(id: string): Promise<boolean> {
  if (!isKVAvailable()) {
    return false;
  }

  try {
    const logs = await getRequestLogs();
    const logToDelete = logs.find((log: UnityLogEntry) => log.id === id);

    if (!logToDelete) {
      return false; // Log not found
    }

    // Remove the specific item using lrem
    await kv.lrem(LOGS_KEY, 1, JSON.stringify(logToDelete));
    console.log(`[KV] Deleted log ${id}`);
    return true;
  } catch (err) {
    console.error('[KV] Failed to delete log:', err);
    throw err;
  }
}

/**
 * Clear all logs
 */
export async function clearRequestLogs(): Promise<void> {
  if (!isKVAvailable()) {
    return;
  }

  try {
    await kv.del(LOGS_KEY);
    console.log('[KV] Cleared all logs');
  } catch (err) {
    console.error('[KV] Failed to clear logs:', err);
    throw err;
  }
}

/**
 * Get aggregate statistics from logs
 */
export async function getAggregateStats(): Promise<AggregateStats> {
  const logs = await getRequestLogs();

  const stats: AggregateStats = {
    totalRequests: logs.length,
    totalCost: 0,
    avgScore: 0,
    modelUsage: {},
  };

  if (logs.length === 0) {
    return stats;
  }

  let totalScoreSum = 0;

  for (const log of logs) {
    stats.totalCost += log.summary.totalCost;

    // Process each model's results
    for (const [modelName, result] of Object.entries(log.results)) {
      if (!stats.modelUsage[modelName]) {
        stats.modelUsage[modelName] = {
          count: 0,
          avgScore: 0,
          totalCost: 0,
        };
      }

      stats.modelUsage[modelName].count++;
      stats.modelUsage[modelName].totalCost += result.cost;
      stats.modelUsage[modelName].avgScore += result.total;
      totalScoreSum += result.total;
    }
  }

  // Calculate averages
  const totalModelResults = Object.values(stats.modelUsage).reduce(
    (sum, m) => sum + m.count,
    0
  );

  if (totalModelResults > 0) {
    stats.avgScore = totalScoreSum / totalModelResults;
  }

  for (const model of Object.values(stats.modelUsage)) {
    if (model.count > 0) {
      model.avgScore = model.avgScore / model.count;
    }
  }

  return stats;
}
