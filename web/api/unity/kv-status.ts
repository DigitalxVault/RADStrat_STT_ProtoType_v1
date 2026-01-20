/**
 * Unity KV Status API Endpoint
 *
 * GET /api/unity/kv-status
 *
 * Diagnostic endpoint to check Vercel KV configuration.
 * Returns environment variable status and connectivity test.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  // Check environment variables (without exposing values)
  const envStatus = {
    KV_REST_API_URL: !!process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
    KV_URL: !!process.env.KV_URL,
    KV_REST_API_READ_ONLY_TOKEN: !!process.env.KV_REST_API_READ_ONLY_TOKEN,
  };

  const configured = envStatus.KV_REST_API_URL && envStatus.KV_REST_API_TOKEN;

  // Try a ping test if configured
  let connected = false;
  let pingResult: string | null = null;
  let error: string | null = null;

  if (configured) {
    try {
      // Simple ping test
      const result = await kv.ping();
      connected = result === 'PONG';
      pingResult = result;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    }
  }

  // Check list length
  let logsCount = 0;
  if (connected) {
    try {
      logsCount = await kv.llen('unity:logs');
    } catch (err) {
      // Ignore errors for count
    }
  }

  res.status(200).json({
    success: true,
    kv: {
      configured,
      connected,
      pingResult,
      error,
      envVars: envStatus,
      logsCount,
    },
    message: connected
      ? `KV connected successfully. ${logsCount} logs stored.`
      : configured
      ? 'KV configured but connection failed: ' + error
      : 'KV not configured. Missing environment variables: ' +
        Object.entries(envStatus)
          .filter(([, v]) => !v)
          .map(([k]) => k)
          .join(', '),
  });
}
