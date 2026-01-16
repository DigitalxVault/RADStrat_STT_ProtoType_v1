import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRandomScenarioWithPlayerTurns } from '../_lib/scenarios';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { role } = req.query;

  if (!role || typeof role !== 'string') {
    return res.status(400).json({ error: 'Role query parameter is required' });
  }

  const scenario = getRandomScenarioWithPlayerTurns(role);

  if (!scenario) {
    return res.status(404).json({ error: `No scenarios found for role: ${role}` });
  }

  res.status(200).json({ scenario });
}
