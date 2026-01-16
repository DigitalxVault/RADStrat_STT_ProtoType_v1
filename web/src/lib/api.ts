import {
  STTModel,
  ScoringModel,
  DifficultyLevel,
  ScoringParameters,
  TranscribeResponse,
  EvaluateResponse,
  Scenario,
  ScenarioWithPlayerTurns,
  Role,
} from '../types';

const API_BASE = '/api';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, error.error || error.message || 'Request failed');
  }

  return response.json();
}

// Health API
export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  return request('/health');
}

// STT API
export async function transcribe(
  audioBase64: string,
  model: STTModel,
  mimeType?: string // Optional for backwards compatibility
): Promise<TranscribeResponse> {
  return request('/stt/transcribe', {
    method: 'POST',
    body: JSON.stringify({ audio: audioBase64, model, mimeType }),
  });
}

// Scoring API
export interface EvaluateParams {
  transcript: string;
  expected: string;
  model: ScoringModel;
  difficulty: DifficultyLevel;
  parameters: Partial<ScoringParameters>;
  context: {
    expectedReceiver: string;
    expectedSender: string;
    requiresLocation?: boolean;
  };
}

export async function evaluate(params: EvaluateParams): Promise<EvaluateResponse> {
  return request('/score/evaluate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function evaluateLocal(
  params: Omit<EvaluateParams, 'model'>
): Promise<EvaluateResponse> {
  return request('/score/evaluate-local', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// Scenarios API
export async function getAllScenarios(): Promise<{ scenarios: Scenario[] }> {
  return request('/scenarios');
}

export async function getScenarioById(id: string): Promise<{ scenario: Scenario }> {
  return request(`/scenarios/${id}`);
}

export async function getScenarioWithRole(
  id: string,
  role: string
): Promise<{ scenario: ScenarioWithPlayerTurns }> {
  return request(`/scenarios/${id}?role=${encodeURIComponent(role)}`);
}

export async function getRandomScenarioForRole(
  role: string
): Promise<{ scenario: ScenarioWithPlayerTurns }> {
  return request(`/scenarios/random?role=${encodeURIComponent(role)}`);
}

export async function getAllRoles(): Promise<{ roles: Role[] }> {
  return request('/scenarios/roles');
}

// Pricing API
export interface PricingInfo {
  openai: Record<string, { perMinute?: number; input?: number; output?: number }>;
  grok: Record<string, { input: number; output: number }>;
}

export async function getPricing(): Promise<PricingInfo> {
  return request('/pricing');
}

// Utility: Convert Blob to Base64
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get just the base64 content
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Utility: Convert Blob to Base64 WITH MIME type preservation
// This is critical for cross-browser STT - Safari uses mp4, Firefox uses ogg
export function blobToBase64WithType(blob: Blob): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get just the base64 content
      const base64 = result.split(',')[1];
      resolve({
        base64,
        mimeType: blob.type || 'audio/webm', // Fallback if type not set
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export { ApiError };
