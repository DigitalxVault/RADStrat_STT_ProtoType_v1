import { useState, useEffect, useCallback } from 'react';
import {
  STTModel,
  ScoringModel,
  DifficultyLevel,
  ScoringParameters,
  Role,
  TransmissionLog,
} from '../../../types';
import {
  getAllRoles,
  getRandomScenarioForRole,
  transcribe,
  evaluate,
  blobToBase64WithType,
} from '../../../lib/api';
import { useRecording } from '../../../hooks/useRecording';
import { useAudioSession } from '../../../hooks/useAudioSession';
import { useSTTSessionStore } from '../../../stores/sttSessionStore';
import { TelemetryStrip } from '../../common/TelemetryStrip';
import { PermissionPrompt } from '../../common/PermissionPrompt';

interface STTTestTabProps {
  sttModel: STTModel;
  setSttModel: (model: STTModel) => void;
  scoringModel: ScoringModel;
  setScoringModel: (model: ScoringModel) => void;
  difficulty: DifficultyLevel;
  parameters: ScoringParameters;
  onLogSession: (log: {
    scenario: { id: number; scenario_id: string; title: string };
    role: string;
    sttModel: STTModel;
    scoringModel: ScoringModel;
    difficulty: DifficultyLevel;
    transmissions: TransmissionLog[];
    averageScore: number;
    totalCost: { stt: number; scoring: number; total: number };
  }) => void;
}

export function STTTestTab({
  sttModel,
  setSttModel,
  scoringModel,
  setScoringModel,
  difficulty,
  parameters,
  onLogSession,
}: STTTestTabProps) {
  // Audio session (handles early permission request)
  const audioSession = useAudioSession();

  // Zustand store for state persistence
  const {
    selectedRole,
    scenario,
    currentIndex,
    transcript,
    scoreResult,
    isProcessing,
    sessionLogs,
    costs,
    actions,
  } = useSTTSessionStore();

  // Local state for roles and loading
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);

  // Recording hook with device from audio session
  const recording = useRecording({
    deviceId: audioSession.selectedDeviceId,
  });

  // Load roles on mount
  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const { roles: roleList } = await getAllRoles();
      setRoles(roleList);
    } catch (err) {
      console.error('Failed to load roles:', err);
      setError('Failed to load roles');
    }
  };

  const loadScenario = useCallback(async () => {
    if (!selectedRole) return;

    setIsLoading(true);
    setError(null);
    setIsComplete(false);
    setSessionSaved(false);

    try {
      const { scenario: newScenario } = await getRandomScenarioForRole(selectedRole);
      actions.startSession(selectedRole, newScenario);
    } catch (err) {
      console.error('Failed to load scenario:', err);
      setError('Failed to load scenario for this role');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRole, actions]);

  // Get current transmission and player turns (using v2 tree-based format)
  const playerTurns = scenario?.playerNodes || [];
  const currentPlayerTurn = playerTurns[currentIndex];
  const totalPlayerTurns = scenario?.playerNodeCount || 0;

  // Get previous context (nodes before current player turn)
  const getPreviousContext = () => {
    // Defensive check for v2 format - must have nodes array
    if (!scenario || !currentPlayerTurn || !scenario.nodes) return [];

    // Find nodes leading up to the current player node
    const currentNodeIndex = scenario.nodes.findIndex(n => n.id === currentPlayerTurn.id);
    if (currentNodeIndex <= 0) return [];

    // Get last 3 NPC nodes (non-player turns) before current
    return scenario.nodes
      .slice(0, currentNodeIndex)
      .filter(n => !n.isPlayerTurn)
      .slice(-3);
  };

  // Handle recording complete - process audio
  const handleRecordingComplete = useCallback(async () => {
    if (!recording.audioBlob || !currentPlayerTurn || !scenario) return;

    actions.setProcessing(true);
    setError(null);

    try {
      // Debug: Log audio blob info
      console.log('[STT Debug] Audio blob:', {
        type: recording.audioBlob.type,
        size: recording.audioBlob.size,
        sizeKB: (recording.audioBlob.size / 1024).toFixed(2) + ' KB',
      });

      // Convert audio to base64 WITH MIME type preservation
      // This is critical for cross-browser support (Safari=mp4, Firefox=ogg, Chrome=webm)
      const { base64: audioBase64, mimeType } = await blobToBase64WithType(recording.audioBlob);

      // Debug: Log what we're sending to API
      console.log('[STT Debug] Sending to API:', {
        mimeType,
        base64Length: audioBase64.length,
        base64Preview: audioBase64.substring(0, 50) + '...',
        model: sttModel,
      });

      // Transcribe with actual MIME type for accurate STT
      const transcribeResult = await transcribe(audioBase64, sttModel, mimeType);

      // Debug: Log transcription result
      console.log('[STT Debug] Transcription result:', {
        transcript: transcribeResult.transcript,
        duration: transcribeResult.duration,
        cost: transcribeResult.cost,
      });
      actions.setTranscript(transcribeResult);

      // Get receiver from destination_callsign (v2 format)
      // Falls back to 'SHEPHARD' for broadcasts where destination is null
      const receiver = currentPlayerTurn.destination_callsign || 'SHEPHARD';

      // Evaluate
      const evalResult = await evaluate({
        transcript: transcribeResult.transcript,
        expected: currentPlayerTurn.message,
        model: scoringModel,
        difficulty,
        parameters,
        context: {
          expectedReceiver: receiver,
          expectedSender: currentPlayerTurn.source_callsign,
          // In v2 format, location is embedded in message content
          requiresLocation: false,
        },
      });
      actions.setScore(evalResult);

      // Log this transmission (using nodeId instead of seq)
      const log: TransmissionLog = {
        nodeId: currentPlayerTurn.id,
        expected: currentPlayerTurn.message,
        transcript: transcribeResult.transcript,
        scores: {
          accuracy: evalResult.accuracy.score,
          structure: evalResult.structure.score,
          fluency: evalResult.fluency.score,
          total: evalResult.total,
        },
        cost: {
          stt: transcribeResult.cost,
          scoring: evalResult.cost,
        },
      };
      actions.logTransmission(log);
    } catch (err) {
      console.error('Processing failed:', err);
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      actions.setProcessing(false);
    }
  }, [
    recording.audioBlob,
    currentPlayerTurn,
    scenario,
    sttModel,
    scoringModel,
    difficulty,
    parameters,
    actions,
  ]);

  // Process recording when it's complete
  useEffect(() => {
    if (recording.audioBlob && !isProcessing && !scoreResult) {
      handleRecordingComplete();
    }
  }, [recording.audioBlob, isProcessing, scoreResult, handleRecordingComplete]);

  // Auto-save session to Logs when last transmission is scored (silent, doesn't hide UI)
  useEffect(() => {
    if (scoreResult && currentIndex === totalPlayerTurns - 1 && !sessionSaved) {
      // Save to logs silently - UI stays visible until user clicks Finish
      if (scenario && sessionLogs.length > 0) {
        const avgScore =
          sessionLogs.reduce((sum, log) => sum + log.scores.total, 0) /
          sessionLogs.length;

        onLogSession({
          scenario: { id: scenario.id, scenario_id: scenario.scenario_id, title: scenario.title },
          role: selectedRole,
          sttModel,
          scoringModel,
          difficulty,
          transmissions: sessionLogs,
          averageScore: avgScore,
          totalCost: {
            stt: costs.session.stt,
            scoring: costs.session.scoring,
            total: costs.session.stt + costs.session.scoring,
          },
        });
      }
      setSessionSaved(true); // Mark as saved, but DON'T set isComplete - keep results visible
    }
  }, [scoreResult, currentIndex, totalPlayerTurns, sessionSaved, scenario, sessionLogs, selectedRole, sttModel, scoringModel, difficulty, costs, onLogSession]);

  // Handle next transmission
  const handleNext = () => {
    if (currentIndex < totalPlayerTurns - 1) {
      actions.advanceToNextTransmission();
      recording.clearRecording();
    } else {
      // Session complete
      handleSessionComplete();
    }
  };

  // Handle session complete - just shows completion screen
  // Logging is handled silently by the useEffect above
  const handleSessionComplete = () => {
    setIsComplete(true);
  };

  // Refresh scenario (new random scenario)
  const handleRefresh = () => {
    actions.refreshSession();
    setIsComplete(false);
    setSessionSaved(false);
    recording.clearRecording();
    loadScenario();
  };

  // Refresh current transmission (reset score and transcript, keep same question)
  const handleRefreshCurrent = () => {
    actions.clearCurrentRun();
    recording.clearRecording();
  };

  // Handle role change
  const handleRoleChange = (role: string) => {
    actions.setSelectedRole(role);
    actions.setScenario(null);
    setIsComplete(false);
    setSessionSaved(false);
  };

  // Show permission prompt if not ready
  if (!audioSession.sessionReady) {
    return (
      <div className="stt-test-tab">
        <PermissionPrompt
          status={audioSession.permissionStatus}
          error={audioSession.permissionError}
          onRequestPermission={audioSession.requestPermission}
        />
      </div>
    );
  }

  return (
    <div className="stt-test-tab">
      {/* Telemetry Strip */}
      <div className="mb-md">
        <TelemetryStrip mode="minimal" />
      </div>

      {/* Model Selectors */}
      <div className="flex gap-md mb-lg" style={{ flexWrap: 'wrap' }}>
        <div className="flex-1" style={{ minWidth: '200px' }}>
          <label className="label">STT Model</label>
          <select
            className="select"
            value={sttModel}
            onChange={(e) => setSttModel(e.target.value as STTModel)}
          >
            <option value="whisper">Whisper ($0.006/min)</option>
            <option value="gpt-4o-transcribe">GPT-4o Transcribe ($0.006/min)</option>
            <option value="gpt-4o-mini-transcribe">GPT-4o Mini ($0.003/min)</option>
          </select>
        </div>

        <div className="flex-1" style={{ minWidth: '200px' }}>
          <label className="label">Scoring Model</label>
          <select
            className="select"
            value={scoringModel}
            onChange={(e) => setScoringModel(e.target.value as ScoringModel)}
          >
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o Mini (Recommended)</option>
            <option value="grok-4.1-fast">Grok 4.1 Fast</option>
          </select>
        </div>

        <div className="flex-1" style={{ minWidth: '200px' }}>
          <label className="label">Your Role</label>
          <select
            className="select"
            value={selectedRole}
            onChange={(e) => handleRoleChange(e.target.value)}
          >
            <option value="">Select a role...</option>
            {roles.map((role) => (
              <option key={role.callsign} value={role.callsign}>
                {role.callsign} - {role.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Load Scenario Button */}
      {selectedRole && !scenario && (
        <div className="text-center mb-lg">
          <button
            className="btn btn-primary"
            onClick={loadScenario}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load Random Scenario'}
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="callout callout-warning mb-md">
          {error}
        </div>
      )}

      {/* Scenario Display */}
      {scenario && !isComplete && (
        <>
          {/* Scenario Header */}
          <div className="card mb-md">
            <div className="flex justify-between items-center mb-sm">
              <h4>{scenario.title}</h4>
              <span className="badge">
                {currentIndex + 1} / {totalPlayerTurns}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-muted small mono">
                Series: {scenario.series_id} | Your Role: {selectedRole}
              </p>
              <div className="flex gap-sm">
                <button className="btn btn-secondary btn-sm" onClick={handleRefreshCurrent}>
                  Refresh
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleNext}
                  disabled={!scoreResult}
                >
                  {currentIndex < totalPlayerTurns - 1 ? 'Next Question' : 'Finish'}
                </button>
              </div>
            </div>
          </div>

          {/* Previous Context */}
          {getPreviousContext().length > 0 && (
            <div className="mb-md">
              <label className="label">Previous Context</label>
              <div className="card card-bordered">
                {getPreviousContext().map((node) => (
                  <p key={node.id} className="small mb-xs">
                    <span className="mono" style={{ fontWeight: 600 }}>
                      {/* RT Format: [Receiver], [Sender] */}
                      {node.destination_callsign || 'ALL'}, {node.source_callsign}:
                    </span>{' '}
                    "{node.message}"
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Current Transmission */}
          {currentPlayerTurn && (
            <div className="mb-md">
              <label className="label">Your Turn - Expected Response</label>
              <div className="callout">
                <p className="mono">
                  {/* RT Format: [Receiver], [Sender] - receiver callsign first */}
                  {currentPlayerTurn.destination_callsign || 'SHEPHARD'}, {currentPlayerTurn.source_callsign}
                </p>
                <p className="mt-xs">"{currentPlayerTurn.message}"</p>
              </div>
            </div>
          )}

          {/* Recording Controls */}
          <div className="flex flex-col items-center gap-md mb-lg">
            {!transcript && !isProcessing && (
              <>
                <div className="flex items-center gap-md">
                  {/* Microphone Selector */}
                  <select
                    className="select"
                    value={audioSession.selectedDeviceId || ''}
                    onChange={(e) => audioSession.selectDevice(e.target.value)}
                    disabled={recording.isRecording}
                    style={{ minWidth: '200px', maxWidth: '300px' }}
                  >
                    {audioSession.audioDevices.length === 0 ? (
                      <option value="">No microphones found</option>
                    ) : (
                      audioSession.audioDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 8)}...`}
                        </option>
                      ))
                    )}
                  </select>

                  {/* Record/Stop Button */}
                  {!recording.isRecording ? (
                    <button
                      className="btn btn-primary btn-icon btn-icon-lg"
                      onClick={recording.startRecording}
                      disabled={isProcessing || audioSession.audioDevices.length === 0}
                      aria-label="Start recording"
                    >
                      &#127908;
                    </button>
                  ) : (
                    <button
                      className="btn btn-danger btn-icon btn-icon-lg"
                      onClick={recording.stopRecording}
                      aria-label="Stop recording"
                    >
                      &#9209;
                    </button>
                  )}
                </div>

                {recording.isRecording && (
                  <div className="recording-indicator">
                    <span className="recording-dot" />
                    Recording... {recording.duration}s
                  </div>
                )}

                {recording.error && (
                  <p className="text-muted small">{recording.error}</p>
                )}
              </>
            )}

            {isProcessing && (
              <p className="mono text-muted">Processing audio...</p>
            )}
          </div>

          {/* Transcript Display */}
          {transcript && (
            <div className="mb-md">
              <label className="label">Your Response</label>
              <div className="transcript-box transcript-actual">
                {transcript}
              </div>
            </div>
          )}

          {/* Score Display */}
          {scoreResult && (
            <div className="card mb-md">
              <div className="score-display mb-md">
                <span className="score-value">{scoreResult.total}</span>
                <span className="score-label">Total Score / 100</span>
              </div>

              <div className="score-breakdown">
                <div className="score-item">
                  <span className="score-item-value">{scoreResult.structure.score}</span>
                  <span className="score-item-label">Structure /30</span>
                </div>
                <div className="score-item">
                  <span className="score-item-value">{scoreResult.accuracy.score}</span>
                  <span className="score-item-label">Accuracy /50</span>
                </div>
                <div className="score-item">
                  <span className="score-item-value">{scoreResult.fluency.score}</span>
                  <span className="score-item-label">Fluency /20</span>
                </div>
              </div>

              {/* Run Cost */}
              <div className="mt-md">
                <TelemetryStrip mode="detailed" />
              </div>

              {/* Feedback */}
              {scoreResult.llmFeedback && (
                <div className="mt-md">
                  <label className="label">Feedback</label>
                  <p className="small">{scoreResult.llmFeedback}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Session Complete */}
      {isComplete && (
        <div className="card text-center">
          <h3 className="mb-md">Session Complete!</h3>

          {sessionLogs.length > 0 && (
            <>
              <div className="score-display mb-lg">
                <span className="score-value">
                  {(
                    sessionLogs.reduce((sum, l) => sum + l.scores.total, 0) /
                    sessionLogs.length
                  ).toFixed(1)}
                </span>
                <span className="score-label">Average Score</span>
              </div>

              <div className="mb-md">
                <TelemetryStrip mode="detailed" />
              </div>
            </>
          )}

          <button className="btn btn-primary" onClick={handleRefresh}>
            New Scenario
          </button>
        </div>
      )}
    </div>
  );
}
