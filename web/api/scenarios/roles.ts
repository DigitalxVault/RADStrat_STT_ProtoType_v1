import type { VercelRequest, VercelResponse } from '@vercel/node';

// Self-contained roles data - no external imports to isolate the issue
interface Role {
  callsign: string;
  name: string;
  description: string;
  series: string[];
}

const roles: Role[] = [
  { callsign: 'REDCROSS 1', name: 'Medical Response Vehicle 1', description: 'Primary medical responder', series: ['REDCROSS'] },
  { callsign: 'REDCROSS 2', name: 'Medical Response Vehicle 2', description: 'Secondary medical responder', series: ['REDCROSS'] },
  { callsign: 'BLUECROSS 1', name: 'Command Support Vehicle 1', description: 'Command post support unit', series: ['BLUECROSS'] },
  { callsign: 'LOGIC 1', name: 'Logistics Vehicle 1', description: 'Logistics and supply support', series: ['LOGIC'] },
  { callsign: 'STALKER 1', name: 'Security Patrol 1', description: 'Primary security patrol', series: ['STALKER'] },
  { callsign: 'STALKER 2', name: 'Security Patrol 2', description: 'Secondary security patrol', series: ['STALKER'] },
  { callsign: 'TENDER 1', name: 'Fuel/Water Tender 1', description: 'Fuel or water supply', series: ['REDCROSS', 'BLUECROSS', 'LOGIC'] },
  { callsign: 'SPARTAN 1', name: 'Command Post Officer', description: 'Command coordination', series: ['REDCROSS', 'BLUECROSS', 'LOGIC', 'STALKER'] },
];

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({ roles });
}
