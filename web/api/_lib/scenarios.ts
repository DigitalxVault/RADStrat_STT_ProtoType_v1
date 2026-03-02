import type { ScenarioV2, ScenarioTreeNode, ScenariosV2Data, Role } from './types';

// Dynamically extract player roles from scenarios_v3.json
function buildRolesFromScenarios(): Role[] {
  const data = getData();
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

  // Update series arrays for roles that appear in multiple series
  for (const scenario of data.scenarios) {
    for (const node of scenario.nodes) {
      if (node.source === 'P') {
        const role = roleMap.get(node.source_callsign);
        if (role && !role.series.includes(scenario.series_id)) {
          role.series.push(scenario.series_id);
        }
      }
    }
  }

  return Array.from(roleMap.values());
}

let _roles: Role[] | null = null;
function getRoles(): Role[] {
  if (!_roles) {
    _roles = buildRolesFromScenarios();
  }
  return _roles;
}

// Lazy load scenarios data only when needed
let _data: ScenariosV2Data | null = null;
function getData(): ScenariosV2Data {
  if (!_data) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _data = require('./scenarios_v3.json') as ScenariosV2Data;
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
  return getRoles();
}

export function getRoleByCallsign(callsign: string): Role | undefined {
  return getRoles().find(r => r.callsign.toUpperCase() === callsign.toUpperCase());
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
