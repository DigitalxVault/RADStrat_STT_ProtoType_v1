import scenariosV2Data from '../../data/scenarios_v2.json' with { type: 'json' };
import { ScenarioV2, ScenarioTreeNode, ScenariosV2Data, Role } from '../../types/index.js';

// Type assertion for imported JSON
const data = scenariosV2Data as ScenariosV2Data;

// Roles data (extracted from the previous format - kept static for now)
const roles: Role[] = [
  {
    callsign: 'REDCROSS 1',
    name: 'Medical Response Vehicle 1',
    description: 'Primary medical responder for emergency situations',
    series: ['REDCROSS'],
  },
  {
    callsign: 'REDCROSS 2',
    name: 'Medical Response Vehicle 2',
    description: 'Secondary medical responder for backup support',
    series: ['REDCROSS'],
  },
  {
    callsign: 'BLUECROSS 1',
    name: 'Command Support Vehicle 1',
    description: 'Primary command post support unit',
    series: ['BLUECROSS'],
  },
  {
    callsign: 'LOGIC 1',
    name: 'Logistics Vehicle 1',
    description: 'Primary logistics and supply support',
    series: ['LOGIC'],
  },
  {
    callsign: 'STALKER 1',
    name: 'Security Patrol 1',
    description: 'Primary security patrol unit',
    series: ['STALKER'],
  },
  {
    callsign: 'STALKER 2',
    name: 'Security Patrol 2',
    description: 'Secondary security patrol unit',
    series: ['STALKER'],
  },
  {
    callsign: 'TENDER 1',
    name: 'Fuel/Water Tender 1',
    description: 'Primary fuel or water supply vehicle',
    series: ['REDCROSS', 'BLUECROSS', 'LOGIC'],
  },
  {
    callsign: 'SPARTAN 1',
    name: 'Command Post Officer',
    description: 'Command post coordination officer',
    series: ['REDCROSS', 'BLUECROSS', 'LOGIC', 'STALKER'],
  },
];

export class ScenariosRepository {
  // ============================================================================
  // Scenario Retrieval Methods (v2)
  // ============================================================================

  getAllScenarios(): ScenarioV2[] {
    return data.scenarios;
  }

  getScenarioById(id: string | number): ScenarioV2 | undefined {
    if (typeof id === 'number') {
      return data.scenarios.find(s => s.id === id);
    }
    return data.scenarios.find(s => s.scenario_id === id);
  }

  getScenariosBySeries(seriesId: string): ScenarioV2[] {
    return data.scenarios.filter(
      s => s.series_id.toUpperCase() === seriesId.toUpperCase()
    );
  }

  getScenariosForRole(callsign: string): ScenarioV2[] {
    return data.scenarios.filter(scenario =>
      scenario.nodes.some(
        node =>
          node.source_callsign === callsign ||
          node.destination_callsign === callsign
      )
    );
  }

  getRandomScenarioForRole(callsign: string): ScenarioV2 | undefined {
    const scenarios = this.getScenariosForRole(callsign);
    if (scenarios.length === 0) return undefined;
    const randomIndex = Math.floor(Math.random() * scenarios.length);
    return scenarios[randomIndex];
  }

  // ============================================================================
  // Node Navigation Methods (v2)
  // ============================================================================

  /**
   * Get a specific node by scenario and node ID
   */
  getNodeById(scenarioId: string | number, nodeId: number): ScenarioTreeNode | undefined {
    const scenario = this.getScenarioById(scenarioId);
    if (!scenario) return undefined;
    return scenario.nodes.find(n => n.id === nodeId);
  }

  /**
   * Get the starting node for a scenario
   */
  getStartNode(scenarioId: string | number): ScenarioTreeNode | undefined {
    const scenario = this.getScenarioById(scenarioId);
    if (!scenario) return undefined;
    return scenario.nodes.find(n => n.id === scenario.start_node);
  }

  /**
   * Get the next node based on current node and positive/negative advancement
   */
  getNextNode(
    scenarioId: string | number,
    currentNodeId: number,
    isPositive: boolean = true
  ): ScenarioTreeNode | undefined {
    const currentNode = this.getNodeById(scenarioId, currentNodeId);
    if (!currentNode) return undefined;

    const nextNodeId = isPositive ? currentNode.next_pos : currentNode.next_neg;
    if (nextNodeId === null) return undefined;

    return this.getNodeById(scenarioId, nextNodeId);
  }

  /**
   * Get all nodes for a specific role (player turns) in a scenario
   */
  getPlayerNodes(scenarioId: string | number, callsign: string): ScenarioTreeNode[] {
    const scenario = this.getScenarioById(scenarioId);
    if (!scenario) return [];

    return scenario.nodes.filter(n => n.source_callsign === callsign);
  }

  /**
   * Get nodes in order following the next_pos chain (linear path)
   */
  getNodeSequence(scenarioId: string | number): ScenarioTreeNode[] {
    const scenario = this.getScenarioById(scenarioId);
    if (!scenario) return [];

    const sequence: ScenarioTreeNode[] = [];
    let currentNode = this.getStartNode(scenarioId);

    while (currentNode) {
      sequence.push(currentNode);
      currentNode = this.getNextNode(scenarioId, currentNode.id, true);
    }

    return sequence;
  }

  /**
   * Find the next player node starting from a given node
   */
  findNextPlayerNode(
    scenarioId: string | number,
    afterNodeId: number,
    callsign: string
  ): ScenarioTreeNode | undefined {
    const scenario = this.getScenarioById(scenarioId);
    if (!scenario) return undefined;

    let currentNode = this.getNextNode(scenarioId, afterNodeId, true);

    while (currentNode) {
      if (currentNode.source_callsign === callsign) {
        return currentNode;
      }
      currentNode = this.getNextNode(scenarioId, currentNode.id, true);
    }

    return undefined;
  }

  // ============================================================================
  // Role Retrieval Methods
  // ============================================================================

  getAllRoles(): Role[] {
    return roles;
  }

  getRoleByCallsign(callsign: string): Role | undefined {
    return roles.find(
      r => r.callsign.toUpperCase() === callsign.toUpperCase()
    );
  }

  getRolesBySeries(seriesId: string): Role[] {
    return roles.filter(
      r => r.series.some(s => s.toUpperCase() === seriesId.toUpperCase())
    );
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get metadata about the loaded scenarios
   */
  getMetadata(): { version: string; generated: string; scenarioCount: number; nodeCount: number } {
    const nodeCount = data.scenarios.reduce((sum, s) => sum + s.nodes.length, 0);
    return {
      version: data.version,
      generated: data.generated,
      scenarioCount: data.scenarios.length,
      nodeCount,
    };
  }
}

export const scenariosRepository = new ScenariosRepository();
