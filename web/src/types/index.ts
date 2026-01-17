// STT Models
export type STTModel = 'whisper' | 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe';

// Scoring Models
export type ScoringModel = 'gpt-4o' | 'gpt-4o-mini' | 'grok-4.1-fast';

// Difficulty Levels
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

// Scoring Parameters
export interface ScoringParameters {
  werThreshold: number;
  fillerPenalty: number;
  maxAllowedFillers: number;
  pauseTolerance: number;
  customScoringPrompt?: string;
}

// ============================================================================
// Scenario Tree Types (v2.0 - Tree-based structure)
// ============================================================================

export type SourceType = 'ATC' | 'P';
export type SeriesId = 'REDCROSS' | 'BLUECROSS' | 'LOGIC' | 'STALKER';

/**
 * ScenarioTreeNode represents a single transmission/message in the scenario tree.
 * Nodes are linked via next_pos (positive/continue) and next_neg (negative/branch).
 */
export interface ScenarioTreeNode {
  /** Numeric ID of the parent scenario */
  scenarioId: number;
  /** Unique node ID within the scenario (1-based) */
  id: number;
  /** The RT message content (model answer / AI voice command) */
  message: string;
  /** Source type: ATC = SHEPHARD (controller), P = Player/other roles */
  source: SourceType;
  /** Original callsign of the sender (e.g., "REDCROSS 1") */
  source_callsign: string;
  /** Instance number extracted from callsign (e.g., 1 for "REDCROSS 1", 0 for "SHEPHARD") */
  source_n: number;
  /** Destination type: ATC, P, or null for broadcasts */
  destination: SourceType | null;
  /** Original callsign of the receiver, null for broadcasts */
  destination_callsign: string | null;
  /** Instance number of destination, null for broadcasts */
  destination_n: number | null;
  /** Next node ID for positive/default advancement, null if end of path */
  next_pos: number | null;
  /** Next node ID for negative/alternative advancement (branching), null for linear paths */
  next_neg: number | null;
}

/**
 * Extended node with player turn flag
 */
export interface NodeWithPlayerTurn extends ScenarioTreeNode {
  isPlayerTurn: boolean;
}

/**
 * Scenario v2 with tree-based node structure.
 */
export interface ScenarioV2 {
  /** Numeric scenario ID */
  id: number;
  /** Original string ID (e.g., "redcross_1") */
  scenario_id: string;
  /** Series this scenario belongs to */
  series_id: SeriesId;
  /** Human-readable title */
  title: string;
  /** Brief description of the scenario */
  description: string;
  /** Learning objectives */
  objectives: string[];
  /** ID of the starting node */
  start_node: number;
  /** All nodes in this scenario */
  nodes: ScenarioTreeNode[];
}

/**
 * Scenario with nodes marked for player turns
 */
export interface ScenarioWithPlayerTurns extends ScenarioV2 {
  nodes: NodeWithPlayerTurn[];
  playerNodeCount: number;
  playerNodes: NodeWithPlayerTurn[];
}

// ============================================================================
// Legacy Scenario Types (v1 - Flat transmission array)
// Keep for backward compatibility during migration
// ============================================================================

/** @deprecated Use ScenarioV2 instead */
export interface Scenario {
  scenario_id: string;
  series_id: string;
  title: string;
  objectives: string[];
  transmissions: Transmission[];
}

/** @deprecated Use ScenarioTreeNode instead */
export interface Transmission {
  seq: number;
  from: string;
  to: string | string[];
  message: string;
  location?: string;
  isPlayerTurn?: boolean;
}

export interface Role {
  callsign: string;
  name: string;
  description: string;
}

// API Response Types
export interface TranscribeResponse {
  transcript: string;
  duration: number;
  cost: number;
}

export interface EvaluateResponse {
  accuracy: {
    score: number;
    details: string;
    matchedElements?: string[];
    missingElements?: string[];
  };
  structure: {
    score: number;
    details: string;
    receiverCorrect?: boolean;
    senderCorrect?: boolean;
    detectedOrder?: string[];
  };
  fluency: {
    score: number;
    fillers: string[];
    fillerCount: number;
    corrections?: string[];
    rating: string;
    details: string;
  };
  total: number;
  cost: number;
  llmFeedback?: string;
}

// Log Entry Types
export interface TransmissionLog {
  nodeId: number;
  expected: string;
  transcript: string;
  scores: {
    accuracy: number;
    structure: number;
    fluency: number;
    total: number;
  };
  cost: {
    stt: number;
    scoring: number;
  };
}

export interface LogEntry {
  id: string;
  timestamp: string;
  scenario: {
    id: number;
    scenario_id: string;
    title: string;
  };
  role: string;
  sttModel: STTModel;
  scoringModel: ScoringModel;
  difficulty: DifficultyLevel;
  transmissions: TransmissionLog[];
  averageScore: number;
  totalCost: {
    stt: number;
    scoring: number;
    total: number;
  };
}

// Application State Types
export interface AppState {
  // Current session
  selectedRole: string | null;
  currentScenario: ScenarioWithPlayerTurns | null;
  currentNodeIndex: number;

  // Settings
  sttModel: STTModel;
  scoringModel: ScoringModel;
  difficulty: DifficultyLevel;
  parameters: ScoringParameters;

  // Recording
  isRecording: boolean;
  audioBlob: Blob | null;

  // Results
  transcript: string | null;
  scoreResult: EvaluateResponse | null;

  // Session tracking
  sessionTransmissions: TransmissionLog[];
  sessionCosts: { stt: number; scoring: number };
}

// Tab Types
export type TabId = 'stt-test' | 'parameters' | 'logs';
