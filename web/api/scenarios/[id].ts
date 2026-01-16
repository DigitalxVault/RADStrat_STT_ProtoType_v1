import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getScenarioById, getScenarioWithPlayerTurns } from '../_lib/scenarios';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, role } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Scenario ID is required' });
  }

  // If role is provided, return with player turns marked
  if (role && typeof role === 'string') {
    const scenario = getScenarioWithPlayerTurns(id, role);

    if (!scenario) {
      return res.status(404).json({ error: `Scenario not found: ${id}` });
    }

    return res.status(200).json({ scenario });
  }

  // Otherwise return plain scenario
  const scenario = getScenarioById(id);

  if (!scenario) {
    return res.status(404).json({ error: `Scenario not found: ${id}` });
  }

  res.status(200).json({ scenario });
}
