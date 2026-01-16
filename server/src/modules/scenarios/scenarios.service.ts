import { scenariosRepository } from './scenarios.repository.js';
import { ScenarioV2, ScenarioTreeNode, Role } from '../../types/index.js';

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Extended node with player turn flag
 */
export interface NodeWithPlayerTurn extends ScenarioTreeNode {
  isPlayerTurn: boolean;
}

/**
 * Scenario with nodes marked for player turns
 */
export interface ScenarioWithPlayerTurns extends ScenarioV2 {
  nodes: NodeWithPlayerTurn[];
  playerNodeCount: number;
  playerNodes: NodeWithPlayerTurn[];
}

/**
 * Session state for navigating through a scenario
 */
export interface ScenarioSession {
  scenarioId: number;
  scenario: ScenarioWithPlayerTurns;
  playerCallsign: string;
  currentNodeId: number;
  currentPlayerIndex: number;
  totalPlayerNodes: number;
  isComplete: boolean;
}

// ============================================================================
// Scenarios Service
// ============================================================================

export class ScenariosService {
  // ============================================================================
  // Scenario Retrieval
  // ============================================================================

  getAllScenarios(): ScenarioV2[] {
    return scenariosRepository.getAllScenarios();
  }

  getScenarioById(id: string | number): ScenarioV2 | undefined {
    return scenariosRepository.getScenarioById(id);
  }

  getScenarioWithPlayerTurns(
    scenarioId: string | number,
    playerCallsign: string
  ): ScenarioWithPlayerTurns | undefined {
    const scenario = scenariosRepository.getScenarioById(scenarioId);
    if (!scenario) return undefined;

    return this.markPlayerTurns(scenario, playerCallsign);
  }

  getRandomScenarioForRole(callsign: string): ScenarioWithPlayerTurns | undefined {
    const scenario = scenariosRepository.getRandomScenarioForRole(callsign);
    if (!scenario) return undefined;

    return this.markPlayerTurns(scenario, callsign);
  }

  // ============================================================================
  // Node Navigation
  // ============================================================================

  /**
   * Create a new session for navigating a scenario
   */
  createSession(
    scenarioId: string | number,
    playerCallsign: string
  ): ScenarioSession | undefined {
    const scenario = this.getScenarioWithPlayerTurns(scenarioId, playerCallsign);
    if (!scenario) return undefined;

    const firstPlayerNode = scenario.playerNodes[0];
    if (!firstPlayerNode) return undefined;

    return {
      scenarioId: scenario.id,
      scenario,
      playerCallsign,
      currentNodeId: firstPlayerNode.id,
      currentPlayerIndex: 0,
      totalPlayerNodes: scenario.playerNodeCount,
      isComplete: false,
    };
  }

  /**
   * Get the current node for a session
   */
  getCurrentNode(session: ScenarioSession): NodeWithPlayerTurn | undefined {
    return session.scenario.nodes.find(n => n.id === session.currentNodeId);
  }

  /**
   * Get context nodes (nodes leading up to the current player node)
   */
  getContextNodes(session: ScenarioSession): NodeWithPlayerTurn[] {
    const nodes = session.scenario.nodes;
    const currentIndex = nodes.findIndex(n => n.id === session.currentNodeId);
    if (currentIndex <= 0) return [];

    // Get all nodes before the current one in the sequence
    return nodes.slice(0, currentIndex);
  }

  /**
   * Advance to the next player node in the session
   */
  advanceSession(session: ScenarioSession, _isPositive: boolean = true): ScenarioSession {
    const currentPlayerIndex = session.currentPlayerIndex;
    const nextPlayerIndex = currentPlayerIndex + 1;

    if (nextPlayerIndex >= session.totalPlayerNodes) {
      return {
        ...session,
        isComplete: true,
      };
    }

    const nextPlayerNode = session.scenario.playerNodes[nextPlayerIndex];
    if (!nextPlayerNode) {
      return {
        ...session,
        isComplete: true,
      };
    }

    return {
      ...session,
      currentNodeId: nextPlayerNode.id,
      currentPlayerIndex: nextPlayerIndex,
    };
  }

  /**
   * Get expected message and metadata for the current player node
   */
  getCurrentExpectation(session: ScenarioSession): {
    expectedMessage: string;
    expectedReceiver: string;
    expectedSender: string;
    nodeId: number;
  } | undefined {
    const currentNode = this.getCurrentNode(session);
    if (!currentNode || !currentNode.isPlayerTurn) return undefined;

    return {
      expectedMessage: currentNode.message,
      expectedReceiver: currentNode.destination_callsign || 'SHEPHARD',
      expectedSender: currentNode.source_callsign,
      nodeId: currentNode.id,
    };
  }

  // ============================================================================
  // Role Methods
  // ============================================================================

  getAllRoles(): Role[] {
    return scenariosRepository.getAllRoles();
  }

  getRoleByCallsign(callsign: string): Role | undefined {
    return scenariosRepository.getRoleByCallsign(callsign);
  }

  getRolesBySeries(seriesId: string): Role[] {
    return scenariosRepository.getRolesBySeries(seriesId);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  getMetadata() {
    return scenariosRepository.getMetadata();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private markPlayerTurns(
    scenario: ScenarioV2,
    playerCallsign: string
  ): ScenarioWithPlayerTurns {
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
}

export const scenariosService = new ScenariosService();
