/**
 * Unity Scoring Store
 *
 * ISOLATED Zustand store for the STANDALONE SCORING (Unity) tab.
 * Manages:
 * - Configuration (API key, custom prompt)
 * - Request history log
 * - Aggregate statistics
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DifficultyLevel, ScoringModel } from '../types';
import type { UnityScoringResponse, UnityScoreResult } from '../lib/unity-api';

// ============================================================================
// Types
// ============================================================================

export interface UnityRequestLog {
  id: string;
  timestamp: string;
  input: {
    transcript: string;
    expected: string;
    difficulty: DifficultyLevel;
  };
  results: {
    'gpt-4o': UnityScoreResult;
    'gpt-4o-mini': UnityScoreResult;
    'grok-4.1-fast': UnityScoreResult;
  };
  summary: {
    totalCost: number;
    bestValue: ScoringModel;
    highestScore: ScoringModel;
  };
}

export interface ModelStats {
  totalRequests: number;
  averageScore: number;
  totalCost: number;
  averageLatency: number;
}

export interface AggregateStats {
  totalRequests: number;
  totalCost: number;
  byModel: {
    'gpt-4o': ModelStats;
    'gpt-4o-mini': ModelStats;
    'grok-4.1-fast': ModelStats;
  };
}

export interface UnityScoringConfig {
  apiKey: string;
  customPrompt: string;
  fillerPenalty: number;
  maxFillers: number;
}

// ============================================================================
// Store State
// ============================================================================

interface UnityScoringState {
  // Configuration
  config: UnityScoringConfig;

  // Request history
  requestLogs: UnityRequestLog[];

  // UI State
  isProcessing: boolean;
  lastError: string | null;
}

// ============================================================================
// Store Actions
// ============================================================================

interface UnityScoringActions {
  // Configuration
  setApiKey: (key: string) => void;
  setCustomPrompt: (prompt: string) => void;
  setFillerPenalty: (penalty: number) => void;
  setMaxFillers: (max: number) => void;
  resetConfig: () => void;

  // Request logging
  addRequestLog: (response: UnityScoringResponse) => void;
  clearRequestLogs: () => void;
  deleteRequestLog: (id: string) => void;

  // Server sync - centralized state management
  syncLogsFromServer: () => Promise<void>;
  setServerLogs: (logs: UnityRequestLog[]) => void;

  // UI State
  setProcessing: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;

  // Computed values
  getAggregateStats: () => AggregateStats;
}

// Combined store type
type UnityScoringStore = UnityScoringState & { actions: UnityScoringActions };

// ============================================================================
// Initial State
// ============================================================================

const DEFAULT_CONFIG: UnityScoringConfig = {
  apiKey: 'dev-test-key',
  customPrompt: '',
  fillerPenalty: 2,
  maxFillers: 5,
};

const initialState: UnityScoringState = {
  config: DEFAULT_CONFIG,
  requestLogs: [],
  isProcessing: false,
  lastError: null,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useUnityScoringStore = create<UnityScoringStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      actions: {
        // Configuration
        setApiKey: (key: string) => {
          set((state) => ({
            config: { ...state.config, apiKey: key },
          }));
        },

        setCustomPrompt: (prompt: string) => {
          set((state) => ({
            config: { ...state.config, customPrompt: prompt },
          }));
        },

        setFillerPenalty: (penalty: number) => {
          set((state) => ({
            config: { ...state.config, fillerPenalty: penalty },
          }));
        },

        setMaxFillers: (max: number) => {
          set((state) => ({
            config: { ...state.config, maxFillers: max },
          }));
        },

        resetConfig: () => {
          set({ config: DEFAULT_CONFIG });
        },

        // Request logging
        addRequestLog: (response: UnityScoringResponse) => {
          const log: UnityRequestLog = {
            id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            timestamp: response.timestamp,
            input: response.input,
            results: response.modelResults,
            summary: response.summary,
          };

          set((state) => ({
            requestLogs: [log, ...state.requestLogs].slice(0, 100), // Keep last 100 logs
          }));
        },

        clearRequestLogs: () => {
          set({ requestLogs: [] });
        },

        deleteRequestLog: (id: string) => {
          set((state) => ({
            requestLogs: state.requestLogs.filter((log) => log.id !== id),
          }));
        },

        // Server sync - fetch logs from server (for Unity client updates & Dashboard refresh)
        syncLogsFromServer: async () => {
          try {
            const res = await fetch('/api/unity/logs');
            const data = await res.json();

            if (data.success && data.logs) {
              // Transform server logs to match our local format
              const logs: UnityRequestLog[] = data.logs.map((log: {
                id: string;
                timestamp: string;
                input: { transcript: string; expected: string; difficulty: DifficultyLevel };
                results: Record<ScoringModel, UnityScoreResult>;
                summary: { totalCost: number; bestValue: ScoringModel; highestScore: ScoringModel };
              }) => ({
                id: log.id,
                timestamp: log.timestamp,
                input: log.input,
                results: log.results,
                summary: log.summary,
              }));
              set({ requestLogs: logs });
            }
          } catch (err) {
            console.error('[UnityScoringStore] Failed to sync logs from server:', err);
          }
        },

        setServerLogs: (logs: UnityRequestLog[]) => {
          set({ requestLogs: logs });
        },

        // UI State
        setProcessing: (isProcessing: boolean) => {
          set({ isProcessing });
        },

        setError: (error: string | null) => {
          set({ lastError: error });
        },

        // Computed: Aggregate statistics
        getAggregateStats: (): AggregateStats => {
          const { requestLogs } = get();

          const models: ScoringModel[] = ['gpt-4o', 'gpt-4o-mini', 'grok-4.1-fast'];

          const emptyModelStats = (): ModelStats => ({
            totalRequests: 0,
            averageScore: 0,
            totalCost: 0,
            averageLatency: 0,
          });

          const byModel: AggregateStats['byModel'] = {
            'gpt-4o': emptyModelStats(),
            'gpt-4o-mini': emptyModelStats(),
            'grok-4.1-fast': emptyModelStats(),
          };

          let totalCost = 0;

          for (const log of requestLogs) {
            for (const model of models) {
              const result = log.results[model];
              const stats = byModel[model];

              stats.totalRequests++;
              stats.totalCost += result.cost;
              stats.averageScore =
                (stats.averageScore * (stats.totalRequests - 1) + result.total) /
                stats.totalRequests;
              stats.averageLatency =
                (stats.averageLatency * (stats.totalRequests - 1) + result.latency_ms) /
                stats.totalRequests;
            }

            totalCost += log.summary.totalCost;
          }

          return {
            totalRequests: requestLogs.length,
            totalCost,
            byModel,
          };
        },
      },
    }),
    {
      name: 'radstrat-unity-scoring',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Only persist essential state
      partialize: (state) => ({
        config: state.config,
        requestLogs: state.requestLogs,
      }),
    }
  )
);

// ============================================================================
// Selector Hooks
// ============================================================================

export const useUnityConfig = () => useUnityScoringStore((state) => state.config);
export const useUnityRequestLogs = () => useUnityScoringStore((state) => state.requestLogs);
export const useUnityIsProcessing = () => useUnityScoringStore((state) => state.isProcessing);
export const useUnityLastError = () => useUnityScoringStore((state) => state.lastError);
export const useUnityScoringActions = () => useUnityScoringStore((state) => state.actions);
