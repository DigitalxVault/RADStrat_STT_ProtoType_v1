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
 * Root structure of scenarios_v2.json
 */
export interface ScenariosV2Data {
  version: string;
  generated: string;
  scenarios: ScenarioV2[];
}

// ============================================================================
// Legacy Scenario Types (v1 - Flat transmission array)
// Keep for backward compatibility during migration
// ============================================================================

/** @deprecated Use ScenarioV2 instead */
export interface Scenario {
  scenario_id: string;
  series_id: SeriesId;
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
}

export interface Role {
  callsign: string;
  name: string;
  description: string;
  series: string[];
}

// Scoring Types
export type Difficulty = 'easy' | 'medium' | 'hard';
export type DifficultyLevel = Difficulty; // Alias for compatibility

export interface ScoringParameters {
  werThreshold: number;
  fillerPenalty: number;
  maxAllowedFillers: number;
  pauseTolerance: number;
}

export interface StructureScore {
  score: number;
  receiverCorrect: boolean;
  senderCorrect: boolean;
  locationPresent: boolean;
  intentComplete: boolean;
  detectedOrder: string[];
  explanation: string;
}

export interface AccuracyScore {
  score: number;
  matchedElements: string[];
  missingElements: string[];
  explanation: string;
}

export interface FluencyScore {
  score: number;
  fillersDetected: string[];
  fillerCount: number;
  correctionsDetected: string[];
  correctionCount: number;
  fluencyRating: 'excellent' | 'good' | 'fair' | 'poor';
  explanation: string;
}

export interface EvaluationResult {
  accuracy: AccuracyScore;
  structure: StructureScore;
  fluency: FluencyScore;
  total: number;
  cost: number;
}

// API Response type for evaluate endpoint
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

// API Types
export type STTModel = 'whisper' | 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe';
export type ScoringModel = 'gpt-4o' | 'gpt-4o-mini' | 'grok-4.1-fast';

// Audio MIME types supported by browsers
export type AudioMimeType =
  | 'audio/webm'
  | 'audio/webm;codecs=opus'
  | 'audio/mp4'
  | 'audio/ogg'
  | 'audio/ogg;codecs=opus';

export const SUPPORTED_AUDIO_FORMATS: AudioMimeType[] = [
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/mp4',
  'audio/ogg',
  'audio/ogg;codecs=opus',
];

export interface TranscribeRequest {
  audio: string; // base64
  model: STTModel;
  mimeType?: string; // Optional for backwards compatibility
}

export interface TranscribeResponse {
  transcript: string;
  duration: number;
  cost: number;
  // Optional pricing breakdown for debugging
  pricing?: {
    model: STTModel;
    ratePerMinute: number;
    durationMinutes: number;
    calculatedCost: number;
  };
}

export interface EvaluateRequest {
  transcript: string;
  expected: string;
  expectedReceiver: string;
  expectedSender: string;
  model: ScoringModel;
  difficulty: Difficulty;
  parameters: Partial<ScoringParameters>;
}

export interface PricingInfo {
  openai: {
    whisper: { perMinute: number };
    'gpt-4o-transcribe': { perMinute: number };
    'gpt-4o-mini-transcribe': { perMinute: number };
    'gpt-4o': { input: number; output: number };
    'gpt-4o-mini': { input: number; output: number };
  };
  grok: {
    'grok-4.1-fast': { input: number; output: number };
  };
}
