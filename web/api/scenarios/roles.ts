import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAllRoles } from '../_lib/scenarios';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const roles = getAllRoles();
  res.status(200).json({ roles });
}
