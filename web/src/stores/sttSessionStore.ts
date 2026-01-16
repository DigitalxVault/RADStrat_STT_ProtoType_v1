import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  STTModel,
  ScoringModel,
  DifficultyLevel,
  ScenarioWithPlayerTurns,
  TransmissionLog,
  TranscribeResponse,
  EvaluateResponse,
} from '../types';

// Session costs tracking
interface CostState {
  currentRun: { stt: number; scoring: number };
  session: { stt: number; scoring: number };
}

// Store state interface
interface STTSessionState {
  // Session lifecycle
  sessionId: string | null;
  sessionActive: boolean;

  // Model selections
  sttModel: STTModel;
  scoringModel: ScoringModel;
  difficulty: DifficultyLevel;

  // Scenario state
  selectedRole: string;
  scenario: ScenarioWithPlayerTurns | null;
  currentIndex: number;

  // Transcription results (persisted across tab switches)
  transcript: string | null;
  transcriptDuration: number;
  scoreResult: EvaluateResponse | null;
  isProcessing: boolean;

  // Session tracking
  sessionLogs: TransmissionLog[];
  costs: CostState;
}

// Store actions interface
interface STTSessionActions {
  // Session lifecycle
  startSession: (role: string, scenario: ScenarioWithPlayerTurns) => void;
  refreshSession: () => void;

  // Model selection
  setSTTModel: (model: STTModel) => void;
  setScoringModel: (model: ScoringModel) => void;
  setDifficulty: (level: DifficultyLevel) => void;

  // Scenario navigation
  setSelectedRole: (role: string) => void;
  setScenario: (scenario: ScenarioWithPlayerTurns | null) => void;
  advanceToNextTransmission: () => void;

  // Transcription results
  setTranscript: (result: TranscribeResponse) => void;
  setScore: (result: EvaluateResponse) => void;
  setProcessing: (isProcessing: boolean) => void;
  clearCurrentRun: () => void;

  // Cost tracking
  addCost: (stt: number, scoring: number) => void;
  resetRunCost: () => void;

  // Session logging
  logTransmission: (log: TransmissionLog) => void;
}

// Combined store type
type STTSessionStore = STTSessionState & { actions: STTSessionActions };

// Generate unique session ID
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// Initial state
const initialState: STTSessionState = {
  sessionId: null,
  sessionActive: false,
  sttModel: 'whisper',
  scoringModel: 'gpt-4o',
  difficulty: 'medium',
  selectedRole: '',
  scenario: null,
  currentIndex: 0,
  transcript: null,
  transcriptDuration: 0,
  scoreResult: null,
  isProcessing: false,
  sessionLogs: [],
  costs: {
    currentRun: { stt: 0, scoring: 0 },
    session: { stt: 0, scoring: 0 },
  },
};

// Migration function to detect and clear stale v1 data
const migrateV1ToV2 = (persistedState: unknown): STTSessionState | undefined => {
  if (!persistedState || typeof persistedState !== 'object') {
    return undefined;
  }

  const state = persistedState as Record<string, unknown>;
  const scenario = state.scenario as Record<string, unknown> | null;

  // Detect v1 format: has 'transmissions' but no 'nodes' or 'playerNodes'
  if (scenario && 'transmissions' in scenario && !('nodes' in scenario)) {
    console.warn('[Migration] Detected stale v1 scenario format, clearing session data');
    return initialState;
  }

  // Detect v1 format in scenario: has transmissions array structure
  if (scenario && Array.isArray((scenario as { transmissions?: unknown[] }).transmissions)) {
    console.warn('[Migration] Detected v1 transmissions array, clearing session data');
    return initialState;
  }

  return undefined; // No migration needed, use persisted state
};

export const useSTTSessionStore = create<STTSessionStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      actions: {
        // Start a new training session
        startSession: (role: string, scenario: ScenarioWithPlayerTurns) => {
          set({
            sessionId: generateSessionId(),
            sessionActive: true,
            selectedRole: role,
            scenario,
            currentIndex: 0,
            transcript: null,
            transcriptDuration: 0,
            scoreResult: null,
            isProcessing: false,
            sessionLogs: [],
            costs: {
              currentRun: { stt: 0, scoring: 0 },
              session: { stt: 0, scoring: 0 },
            },
          });
        },

        // Explicit refresh - ONLY clears on REFRESH button press
        refreshSession: () => {
          set({
            ...initialState,
            // Preserve model selections
            sttModel: get().sttModel,
            scoringModel: get().scoringModel,
            difficulty: get().difficulty,
          });
        },

        // Model selection
        setSTTModel: (model: STTModel) => set({ sttModel: model }),
        setScoringModel: (model: ScoringModel) => set({ scoringModel: model }),
        setDifficulty: (level: DifficultyLevel) => set({ difficulty: level }),

        // Scenario management
        setSelectedRole: (role: string) => set({ selectedRole: role }),
        setScenario: (scenario: ScenarioWithPlayerTurns | null) => {
          set({
            scenario,
            currentIndex: 0,
            transcript: null,
            transcriptDuration: 0,
            scoreResult: null,
          });
        },

        advanceToNextTransmission: () => {
          const { scenario, currentIndex } = get();
          if (!scenario) return;

          // In v2 format, playerNodes is already the filtered list of player turns
          // currentIndex is the index into playerNodes, not the full nodes array
          const nextIndex = currentIndex + 1;

          // Check if we've reached the end of player nodes
          if (nextIndex >= scenario.playerNodeCount) {
            return; // No more player turns
          }

          set({
            currentIndex: nextIndex,
            transcript: null,
            transcriptDuration: 0,
            scoreResult: null,
            costs: {
              ...get().costs,
              currentRun: { stt: 0, scoring: 0 },
            },
          });
        },

        // Transcription results
        setTranscript: (result: TranscribeResponse) => {
          const { costs } = get();
          set({
            transcript: result.transcript,
            transcriptDuration: result.duration,
            costs: {
              currentRun: {
                ...costs.currentRun,
                stt: result.cost,
              },
              session: {
                ...costs.session,
                stt: costs.session.stt + result.cost,
              },
            },
          });
        },

        setScore: (result: EvaluateResponse) => {
          const { costs } = get();
          set({
            scoreResult: result,
            costs: {
              currentRun: {
                ...costs.currentRun,
                scoring: result.cost,
              },
              session: {
                ...costs.session,
                scoring: costs.session.scoring + result.cost,
              },
            },
          });
        },

        setProcessing: (isProcessing: boolean) => set({ isProcessing }),

        clearCurrentRun: () => {
          set({
            transcript: null,
            transcriptDuration: 0,
            scoreResult: null,
            costs: {
              ...get().costs,
              currentRun: { stt: 0, scoring: 0 },
            },
          });
        },

        // Cost tracking
        addCost: (stt: number, scoring: number) => {
          const { costs } = get();
          set({
            costs: {
              currentRun: {
                stt: costs.currentRun.stt + stt,
                scoring: costs.currentRun.scoring + scoring,
              },
              session: {
                stt: costs.session.stt + stt,
                scoring: costs.session.scoring + scoring,
              },
            },
          });
        },

        resetRunCost: () => {
          set({
            costs: {
              ...get().costs,
              currentRun: { stt: 0, scoring: 0 },
            },
          });
        },

        // Session logging
        logTransmission: (log: TransmissionLog) => {
          set({
            sessionLogs: [...get().sessionLogs, log],
          });
        },
      },
    }),
    {
      name: 'radstrat-stt-session',
      version: 2, // v2 format with nodes/playerNodes
      storage: createJSONStorage(() => sessionStorage),
      // Only persist essential state (not functions/actions)
      partialize: (state) => ({
        sessionId: state.sessionId,
        sessionActive: state.sessionActive,
        sttModel: state.sttModel,
        scoringModel: state.scoringModel,
        difficulty: state.difficulty,
        selectedRole: state.selectedRole,
        scenario: state.scenario,
        currentIndex: state.currentIndex,
        transcript: state.transcript,
        transcriptDuration: state.transcriptDuration,
        scoreResult: state.scoreResult,
        sessionLogs: state.sessionLogs,
        costs: state.costs,
      }),
      // Migrate stale v1 data to v2 format
      migrate: (persistedState, version) => {
        // If version is less than 2, or data looks like v1, clear it
        if (version < 2) {
          console.warn('[Migration] Version upgrade detected, clearing stale data');
          return initialState;
        }
        // Check for v1 format regardless of version (in case version wasn't set)
        const migrated = migrateV1ToV2(persistedState);
        if (migrated) {
          return migrated;
        }
        return persistedState as STTSessionState;
      },
      // Log when rehydration completes
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[Store] Failed to rehydrate session store:', error);
        } else if (state) {
          // Additional v1 format check after rehydration
          const scenario = state.scenario;
          if (scenario && !('nodes' in scenario) && !('playerNodes' in scenario)) {
            console.warn('[Migration] Post-rehydration v1 detection, clearing scenario');
            state.scenario = null;
            state.sessionActive = false;
          }
        }
      },
    }
  )
);

// Selector hooks for better performance
export const useSessionCosts = () => useSTTSessionStore((state) => state.costs);
export const useSessionActive = () => useSTTSessionStore((state) => state.sessionActive);
export const useCurrentTranscript = () => useSTTSessionStore((state) => state.transcript);
export const useCurrentScore = () => useSTTSessionStore((state) => state.scoreResult);
export const useIsProcessing = () => useSTTSessionStore((state) => state.isProcessing);
export const useSessionActions = () => useSTTSessionStore((state) => state.actions);
