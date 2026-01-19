/**
 * Unity Logs API Endpoint
 *
 * GET /api/unity/logs - Fetch all logs
 * GET /api/unity/logs?action=stats - Get aggregate statistics
 * DELETE /api/unity/logs - Clear all logs
 * DELETE /api/unity/logs?id=xxx - Delete specific log
 *
 * Dashboard uses this to display Unity API requests.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getRequestLogs,
  deleteRequestLog,
  clearRequestLogs,
  getAggregateStats,
} from '../_lib/unity-kv';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // GET - Fetch logs or stats
    if (req.method === 'GET') {
      const action = req.query.action as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      if (action === 'stats') {
        const stats = await getAggregateStats();
        res.status(200).json({
          success: true,
          stats,
        });
        return;
      }

      // Default: fetch logs
      const logs = await getRequestLogs(limit);
      res.status(200).json({
        success: true,
        count: logs.length,
        logs,
      });
      return;
    }

    // DELETE - Clear logs
    if (req.method === 'DELETE') {
      const id = req.query.id as string;

      if (id) {
        // Delete specific log
        const deleted = await deleteRequestLog(id);
        if (deleted) {
          res.status(200).json({
            success: true,
            message: `Log ${id} deleted`,
          });
        } else {
          res.status(404).json({
            success: false,
            error: 'Not Found',
            message: `Log ${id} not found`,
          });
        }
        return;
      }

      // Clear all logs
      await clearRequestLogs();
      res.status(200).json({
        success: true,
        message: 'All logs cleared',
      });
      return;
    }

    // Method not allowed
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  } catch (error) {
    console.error('[Unity Logs API] Error:', error);

    // Check if KV is not configured
    if (
      error instanceof Error &&
      (error.message.includes('KV') || error.message.includes('REDIS'))
    ) {
      res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Vercel KV is not configured. Please set up KV in Vercel dashboard.',
        logs: [], // Return empty array so Dashboard doesn't break
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}
