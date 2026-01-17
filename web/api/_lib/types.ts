// ============================================================================
// Scenario Tree Types (v2.0 - Tree-based structure)
// ============================================================================

export type SourceType = 'ATC' | 'P';
export type SeriesId = 'REDCROSS' | 'BLUECROSS' | 'LOGIC' | 'STALKER';

export interface ScenarioTreeNode {
  scenarioId: number;
  id: number;
  message: string;
  source: SourceType;
  source_callsign: string;
  source_n: number;
  destination: SourceType | null;
  destination_callsign: string | null;
  destination_n: number | null;
  next_pos: number | null;
  next_neg: number | null;
}

export interface ScenarioV2 {
  id: number;
  scenario_id: string;
  series_id: SeriesId;
  title: string;
  description: string;
  objectives: string[];
  start_node: number;
  nodes: ScenarioTreeNode[];
}

export interface ScenariosV2Data {
  version: string;
  generated: string;
  scenarios: ScenarioV2[];
}

export interface Role {
  callsign: string;
  name: string;
  description: string;
  series: string[];
}

// Scoring Types
export type Difficulty = 'easy' | 'medium' | 'hard';
export type DifficultyLevel = Difficulty;

export interface ScoringParameters {
  werThreshold: number;
  fillerPenalty: number;
  maxAllowedFillers: number;
  pauseTolerance: number;
  customScoringPrompt?: string;
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

// API Types
export type STTModel = 'whisper' | 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe';
export type ScoringModel = 'gpt-4o' | 'gpt-4o-mini' | 'grok-4.1-fast';

export interface TranscribeResponse {
  transcript: string;
  duration: number;
  cost: number;
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
