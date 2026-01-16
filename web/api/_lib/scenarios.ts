import type { ScenarioV2, ScenarioTreeNode, ScenariosV2Data, Role } from './types';

// Roles are static - no JSON loading needed
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

// Lazy load scenarios data only when needed
let _data: ScenariosV2Data | null = null;
function getData(): ScenariosV2Data {
  if (!_data) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _data = require('./scenarios_v2.json') as ScenariosV2Data;
  }
  return _data;
}

export interface NodeWithPlayerTurn extends ScenarioTreeNode {
  isPlayerTurn: boolean;
}

export interface ScenarioWithPlayerTurns extends ScenarioV2 {
  nodes: NodeWithPlayerTurn[];
  playerNodeCount: number;
  playerNodes: NodeWithPlayerTurn[];
}

export function getAllScenarios(): ScenarioV2[] {
  return getData().scenarios;
}

export function getScenarioById(id: string | number): ScenarioV2 | undefined {
  const scenarios = getData().scenarios;
  if (typeof id === 'number') {
    return scenarios.find(s => s.id === id);
  }
  return scenarios.find(s => s.scenario_id === id || s.id === parseInt(id));
}

export function getScenariosForRole(callsign: string): ScenarioV2[] {
  return getData().scenarios.filter(scenario =>
    scenario.nodes.some(
      node => node.source_callsign === callsign || node.destination_callsign === callsign
    )
  );
}

export function getRandomScenarioForRole(callsign: string): ScenarioV2 | undefined {
  const scenarios = getScenariosForRole(callsign);
  if (scenarios.length === 0) return undefined;
  const randomIndex = Math.floor(Math.random() * scenarios.length);
  return scenarios[randomIndex];
}

export function markPlayerTurns(scenario: ScenarioV2, playerCallsign: string): ScenarioWithPlayerTurns {
  const normalizedCallsign = playerCallsign.toUpperCase();

  const nodesWithTurns: NodeWithPlayerTurn[] = scenario.nodes.map(node => ({
    ...node,
    isPlayerTurn: node.source_callsign.toUpperCase() === normalizedCallsign,
  }));

  const playerNodes = nodesWithTurns.filter(n => n.isPlayerTurn);

  return {
    ...scenario,
    nodes: nodesWithTurns,
    playerNodeCount: playerNodes.length,
    playerNodes,
  };
}

export function getScenarioWithPlayerTurns(
  scenarioId: string | number,
  playerCallsign: string
): ScenarioWithPlayerTurns | undefined {
  const scenario = getScenarioById(scenarioId);
  if (!scenario) return undefined;
  return markPlayerTurns(scenario, playerCallsign);
}

export function getRandomScenarioWithPlayerTurns(callsign: string): ScenarioWithPlayerTurns | undefined {
  const scenario = getRandomScenarioForRole(callsign);
  if (!scenario) return undefined;
  return markPlayerTurns(scenario, callsign);
}

export function getAllRoles(): Role[] {
  return roles;
}

export function getRoleByCallsign(callsign: string): Role | undefined {
  return roles.find(r => r.callsign.toUpperCase() === callsign.toUpperCase());
}

export function getMetadata() {
  const data = getData();
  const nodeCount = data.scenarios.reduce((sum, s) => sum + s.nodes.length, 0);
  return {
    version: data.version,
    generated: data.generated,
    scenarioCount: data.scenarios.length,
    nodeCount,
  };
}
