import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAllScenarios, getMetadata } from '../_lib/scenarios';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const scenarios = getAllScenarios();
  const metadata = getMetadata();

  res.status(200).json({
    scenarios,
    metadata,
  });
}
