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
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/**
 * Save a request log entry to KV
 */
export async function saveRequestLog(log: UnityLogEntry): Promise<void> {
  if (!isKVAvailable()) {
    console.log('[KV] Skipping log save - KV not configured');
    return;
  }

  try {
    // Get existing logs
    const existingLogs = await kv.get<UnityLogEntry[]>(LOGS_KEY) || [];

    // Add new log at the beginning (most recent first)
    const updatedLogs = [log, ...existingLogs];

    // Trim to max logs
    if (updatedLogs.length > MAX_LOGS) {
      updatedLogs.length = MAX_LOGS;
    }

    // Save back to KV
    await kv.set(LOGS_KEY, updatedLogs);

    console.log(`[KV] Saved log ${log.id}, total logs: ${updatedLogs.length}`);
  } catch (err) {
    console.error('[KV] Failed to save log:', err);
    throw err;
  }
}

/**
 * Fetch request logs from KV
 */
export async function getRequestLogs(limit?: number): Promise<UnityLogEntry[]> {
  if (!isKVAvailable()) {
    console.log('[KV] Returning empty logs - KV not configured');
    return [];
  }

  try {
    const logs = await kv.get<UnityLogEntry[]>(LOGS_KEY) || [];

    if (limit && limit > 0) {
      return logs.slice(0, limit);
    }

    return logs;
  } catch (err) {
    console.error('[KV] Failed to fetch logs:', err);
    throw err;
  }
}

/**
 * Delete a specific log entry
 */
export async function deleteRequestLog(id: string): Promise<boolean> {
  if (!isKVAvailable()) {
    return false;
  }

  try {
    const logs = await kv.get<UnityLogEntry[]>(LOGS_KEY) || [];
    const filteredLogs = logs.filter(log => log.id !== id);

    if (filteredLogs.length === logs.length) {
      return false; // Log not found
    }

    await kv.set(LOGS_KEY, filteredLogs);
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
