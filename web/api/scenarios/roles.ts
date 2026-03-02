import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAllRoles } from '../_lib/scenarios';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const roles = getAllRoles();
    res.status(200).json({ roles });
  } catch (err) {
    console.error('Failed to extract roles:', err);
    res.status(500).json({ error: 'Failed to load roles', detail: String(err) });
  }
}
