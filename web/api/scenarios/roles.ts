import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Role {
  callsign: string;
  name: string;
  description: string;
  series: string[];
}

// Dynamically extract player roles from scenarios data
function extractPlayerRoles(): Role[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const data = require('../_lib/scenarios_v3.json');
  const roleMap = new Map<string, Role>();

  for (const scenario of data.scenarios) {
    for (const node of scenario.nodes) {
      if (node.source === 'P' && !roleMap.has(node.source_callsign)) {
        roleMap.set(node.source_callsign, {
          callsign: node.source_callsign,
          name: node.source_callsign,
          description: `Player role from ${scenario.series_id} series`,
          series: [scenario.series_id],
        });
      }
    }
  }

  return Array.from(roleMap.values());
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const roles = extractPlayerRoles();
    res.status(200).json({ roles });
  } catch (err) {
    console.error('Failed to extract roles:', err);
    res.status(500).json({ error: 'Failed to load roles', detail: String(err) });
  }
}
