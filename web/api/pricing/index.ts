import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pricingConfig } from '../_lib/pricing';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json(pricingConfig);
}
