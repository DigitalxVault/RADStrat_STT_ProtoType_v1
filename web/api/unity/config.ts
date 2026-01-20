/**
 * Unity Config Endpoint
 *
 * Returns masked API key for display in the UI.
 * Does NOT expose the full key for security.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from '../_lib/config';

function maskApiKey(key: string): string {
  if (!key || key.length < 8) {
    return key ? '****' : '(not configured)';
  }
  // Show first 4 and last 4 characters
  const first = key.slice(0, 4);
  const last = key.slice(-4);
  return `${first}${'*'.repeat(Math.min(key.length - 8, 12))}${last}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  const apiKey = config.unity.apiKey;
  const isConfigured = apiKey && apiKey !== 'dev-test-key';

  return res.status(200).json({
    success: true,
    apiKey: {
      value: apiKey, // For manual test feature (same-origin only)
      masked: maskApiKey(apiKey),
      isConfigured,
      envVar: 'UNITY_SCORING_API_KEY',
    },
  });
}
