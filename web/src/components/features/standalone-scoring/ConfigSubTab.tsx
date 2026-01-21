/**
 * Configuration Sub-Tab
 *
 * Manages:
 * - API Key display (masked, from server)
 * - Scoring parameters
 * - Custom prompt configuration
 * - Manual test scoring
 */

import { useState, useEffect } from 'react';
import {
  useUnityConfig,
  useUnityScoringActions,
  useUnityIsProcessing,
  useUnityLastError,
} from '../../../stores/unityScoringStore';
import { formatCost, formatLatency } from '../../../lib/unity-api';
import type { UnityScoringResponse } from '../../../lib/unity-api';
import type { DifficultyLevel, ScoringModel } from '../../../types';

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

interface ApiKeyInfo {
  value: string;
  masked: string;
  isConfigured: boolean;
  envVar: string;
}

export function ConfigSubTab() {
  const config = useUnityConfig();
  const isProcessing = useUnityIsProcessing();
  const lastError = useUnityLastError();
  const {
    setApiKey,
    setCustomPrompt,
    setFillerPenalty,
    setMaxFillers,
    resetConfig,
    setProcessing,
    setError,
    syncLogsFromServer,
  } = useUnityScoringActions();

  // API Key state (fetched from server)
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(true);

  // Manual test state
  const [testExpected, setTestExpected] = useState('');
  const [testTranscript, setTestTranscript] = useState('');
  const [testDifficulty, setTestDifficulty] = useState<DifficultyLevel>('medium');
  const [testResult, setTestResult] = useState<UnityScoringResponse | null>(null);
  const [kvMeta, setKvMeta] = useState<{ logged: boolean; kvAvailable: boolean } | null>(null);

  // KV Status state
  const [kvStatus, setKvStatus] = useState<{
    configured: boolean;
    connected: boolean;
    logsCount: number;
    message: string;
  } | null>(null);
  const [kvStatusLoading, setKvStatusLoading] = useState(false);

  // Fetch KV status
  const fetchKvStatus = async () => {
    setKvStatusLoading(true);
    try {
      const res = await fetch('/api/unity/logs?action=kv-status');
      const data = await res.json();
      if (data.success && data.kv) {
        setKvStatus({
          configured: data.kv.configured,
          connected: data.kv.connected,
          logsCount: data.kv.logsCount,
          message: data.message,
        });
      }
    } catch (err) {
      console.error('Failed to fetch KV status:', err);
    } finally {
      setKvStatusLoading(false);
    }
  };

  // Fetch KV status on mount
  useEffect(() => {
    fetchKvStatus();
  }, []);

  // Fetch API key info from server
  useEffect(() => {
    async function fetchApiKeyInfo() {
      try {
        const res = await fetch('/api/unity/config');
        const data = await res.json();
        if (data.success) {
          setApiKeyInfo(data.apiKey);
          // Store the actual key for manual test
          if (data.apiKey.value) {
            setApiKey(data.apiKey.value);
          }
        }
      } catch (err) {
        console.error('Failed to fetch API key info:', err);
      } finally {
        setApiKeyLoading(false);
      }
    }
    fetchApiKeyInfo();
  }, [setApiKey]);

  // Run manual test
  const runManualTest = async () => {
    if (!testExpected.trim() || !testTranscript.trim()) {
      setError('Both expected and transcript fields are required');
      return;
    }

    setProcessing(true);
    setError(null);
    setTestResult(null);
    setKvMeta(null);

    try {
      // Make raw fetch to capture _meta
      const res = await fetch('/api/unity/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey,
        },
        body: JSON.stringify({
          transcript: testTranscript,
          expected: testExpected,
          difficulty: testDifficulty,
          customPrompt: config.customPrompt || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Scoring failed');
      }

      // Extract _meta for KV status display
      if (data._meta) {
        setKvMeta(data._meta);
      }

      // Build result object (without _meta for display)
      const result: UnityScoringResponse = {
        success: data.success,
        timestamp: data.timestamp,
        input: data.input,
        modelResults: data.modelResults,
        summary: data.summary,
      };

      setTestResult(result);

      // Sync from server to get the new entry in Dashboard immediately
      await syncLogsFromServer();

      // Refresh KV status
      await fetchKvStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setProcessing(false);
    }
  };

  // Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#4ade80';
    if (score >= 70) return '#fbbf24';
    return '#ef4444';
  };

  return (
    <div className="config-subtab">
      {/* Error Display */}
      {lastError && (
        <div className="callout callout-warning mb-md">
          {lastError}
        </div>
      )}

      {/* API Key Section */}
      <section className="config-section mb-lg">
        <h3>API Key</h3>
        <p className="text-muted small mb-md">
          Unity uses this key in the X-API-Key header to authenticate requests.
        </p>

        <div className="api-key-display">
          <div className="api-key-value">
            {apiKeyLoading ? (
              <span className="text-muted">Loading...</span>
            ) : apiKeyInfo ? (
              <>
                <code className="api-key-masked">{apiKeyInfo.masked}</code>
                <span className={`status-badge ${apiKeyInfo.isConfigured ? 'configured' : 'not-configured'}`}>
                  {apiKeyInfo.isConfigured ? 'Configured' : 'Using Default'}
                </span>
              </>
            ) : (
              <span className="text-muted">Failed to load</span>
            )}
          </div>
        </div>

        <p className="text-muted small mt-sm">
          Set via environment variable: <code>{apiKeyInfo?.envVar || 'UNITY_SCORING_API_KEY'}</code>
        </p>
        {apiKeyInfo && !apiKeyInfo.isConfigured && (
          <p className="text-warning small mt-xs">
            Warning: Using default key. Set a secure key in Vercel environment variables for production.
          </p>
        )}
      </section>

      {/* KV Database Status */}
      <section className="config-section mb-lg">
        <h3>Database Status (Vercel KV)</h3>
        <p className="text-muted small mb-md">
          Request logs are stored in Vercel KV for the Dashboard.
        </p>

        <div className="kv-status-display">
          {kvStatusLoading ? (
            <span className="text-muted">Checking KV connection...</span>
          ) : kvStatus ? (
            <div className="kv-status-content">
              <div className="kv-status-row">
                <span>Configured:</span>
                <span className={kvStatus.configured ? 'text-success' : 'text-error'}>
                  {kvStatus.configured ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              <div className="kv-status-row">
                <span>Connected:</span>
                <span className={kvStatus.connected ? 'text-success' : 'text-error'}>
                  {kvStatus.connected ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              <div className="kv-status-row">
                <span>Logs stored:</span>
                <span>{kvStatus.logsCount}</span>
              </div>
              <p className="kv-message small mt-sm">{kvStatus.message}</p>
            </div>
          ) : (
            <span className="text-muted">Failed to check status</span>
          )}

          <button
            className="btn btn-sm mt-md"
            onClick={fetchKvStatus}
            disabled={kvStatusLoading}
          >
            {kvStatusLoading ? 'Checking...' : 'Refresh Status'}
          </button>
        </div>

        {kvStatus && !kvStatus.configured && (
          <div className="callout callout-error mt-md">
            <strong>KV Not Configured!</strong>
            <p className="small mt-xs mb-0">
              Environment variables <code>KV_REST_API_URL</code> and <code>KV_REST_API_TOKEN</code> are missing.
              Connect a KV database in your Vercel project settings and redeploy.
            </p>
          </div>
        )}
      </section>

      {/* Scoring Parameters */}
      <section className="config-section mb-lg">
        <h3>Scoring Parameters</h3>

        <div className="param-grid">
          <div className="param-item">
            <div className="flex justify-between items-center mb-xs">
              <label className="label">Filler Penalty</label>
              <span className="mono badge badge-ink">{config.fillerPenalty}</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={config.fillerPenalty}
              onChange={(e) => setFillerPenalty(Number(e.target.value))}
              className="w-full"
            />
            <p className="small text-muted mt-xs">
              Points deducted per filler word (um, uh, er, etc.)
            </p>
          </div>

          <div className="param-item">
            <div className="flex justify-between items-center mb-xs">
              <label className="label">Max Fillers</label>
              <span className="mono badge badge-ink">{config.maxFillers}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={config.maxFillers}
              onChange={(e) => setMaxFillers(Number(e.target.value))}
              className="w-full"
            />
            <p className="small text-muted mt-xs">
              Maximum fillers before fluency score reaches 0
            </p>
          </div>
        </div>

        <div className="param-item mt-md">
          <label className="label mb-xs">Additional Scoring Instructions (Optional)</label>
          <textarea
            value={config.customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="textarea mono"
            rows={5}
            placeholder="e.g., Digits like 42 can be spoken as 'fourty two' or 'four two'. Should not be penalized..."
          />
          <p className="small text-muted mt-xs">
            Add extra instructions to the default RT scoring prompt. These will be appended under "ADDITIONAL INSTRUCTIONS".
          </p>
        </div>

        <button className="btn btn-sm mt-md" onClick={resetConfig}>
          Reset to Defaults
        </button>
      </section>

      {/* Manual Test Section */}
      <section className="config-section">
        <h3>Manual Test</h3>
        <p className="text-muted small mb-md">
          Test the scoring API manually. Results will appear in the Dashboard.
        </p>

        <div className="test-form">
          <div className="form-group">
            <label className="label">Expected Transmission</label>
            <textarea
              value={testExpected}
              onChange={(e) => setTestExpected(e.target.value)}
              className="textarea"
              rows={2}
              placeholder="Enter the correct/expected transmission..."
              disabled={isProcessing}
            />
          </div>

          <div className="form-group">
            <label className="label">User Transcript</label>
            <textarea
              value={testTranscript}
              onChange={(e) => setTestTranscript(e.target.value)}
              className="textarea"
              rows={2}
              placeholder="Enter what the user said..."
              disabled={isProcessing}
            />
          </div>

          <div className="form-group">
            <label className="label">Difficulty</label>
            <select
              value={testDifficulty}
              onChange={(e) => setTestDifficulty(e.target.value as DifficultyLevel)}
              className="select"
              disabled={isProcessing}
            >
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-primary"
            onClick={runManualTest}
            disabled={isProcessing || !testExpected.trim() || !testTranscript.trim()}
          >
            {isProcessing ? 'Scoring with all 3 models...' : 'Run Test (All Models)'}
          </button>
        </div>

        {/* Test Results Display */}
        {testResult && (
          <div className="test-results mt-lg">
            <h4>Test Results</h4>
            <p className="text-muted small mb-md">
              Scored at {new Date(testResult.timestamp).toLocaleString()} |
              Total Cost: {formatCost(testResult.summary.totalCost)}
            </p>

            {/* KV Save Status */}
            {kvMeta && (
              <div className={`kv-save-status ${kvMeta.logged ? 'success' : 'error'}`}>
                {kvMeta.logged ? (
                  <>✅ Saved to KV database - will appear in Dashboard</>
                ) : kvMeta.kvAvailable ? (
                  <>❌ KV save failed - check Vercel function logs</>
                ) : (
                  <>⚠️ KV not configured - results NOT saved to Dashboard</>
                )}
              </div>
            )}

            <div className="model-results-grid">
              {(['gpt-4o', 'gpt-4o-mini', 'grok-4.1-fast'] as ScoringModel[]).map((model) => {
                const result = testResult.modelResults[model];
                const isBestValue = testResult.summary.bestValue === model;
                const isHighestScore = testResult.summary.highestScore === model;

                return (
                  <div key={model} className="model-result-card">
                    <div className="model-header">
                      <span className="model-name">{model}</span>
                      <div className="badges">
                        {isBestValue && <span className="badge badge-value">Best Value</span>}
                        {isHighestScore && <span className="badge badge-score">Highest</span>}
                      </div>
                    </div>

                    <div className="score-display" style={{ color: getScoreColor(result.total) }}>
                      {result.total.toFixed(1)}
                    </div>

                    <div className="score-breakdown">
                      <div className="score-row">
                        <span>Structure</span>
                        <span>{result.scores.structure.score}/40</span>
                      </div>
                      <div className="score-row">
                        <span>Accuracy</span>
                        <span>{result.scores.accuracy.score}/40</span>
                      </div>
                      <div className="score-row">
                        <span>Fluency</span>
                        <span>{result.scores.fluency.score}/20</span>
                      </div>
                    </div>

                    <div className="model-meta">
                      <span>{formatCost(result.cost)}</span>
                      <span>{formatLatency(result.latency_ms)}</span>
                    </div>

                    <div className="feedback-section">
                      <p className="feedback-text">{result.feedback}</p>
                      {result.scores.fluency.fillers.length > 0 && (
                        <p className="fillers-text">
                          Fillers: {result.scores.fluency.fillers.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              className="btn btn-sm mt-md"
              onClick={() => setTestResult(null)}
            >
              Clear Results
            </button>
          </div>
        )}
      </section>

      {/* Config Styles */}
      <style>{`
        .config-subtab {
          max-width: 800px;
        }

        .config-section {
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color, #333);
          border-radius: 8px;
        }

        .config-section h3 {
          margin: 0 0 0.5rem 0;
          color: var(--accent-gold, #d4af37);
        }

        .api-key-display {
          display: flex;
          gap: 0.5rem;
        }

        .api-key-value {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          flex: 1;
        }

        .api-key-masked {
          font-family: monospace;
          font-size: 1rem;
          background: transparent;
          padding: 0;
          letter-spacing: 0.05em;
        }

        .status-badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.configured {
          background: rgba(74, 222, 128, 0.2);
          color: #4ade80;
        }

        .status-badge.not-configured {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
        }

        .text-warning {
          color: #fbbf24;
        }

        .param-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .param-item {
          padding: 1rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
        }

        .test-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .textarea {
          width: 100%;
          padding: 0.75rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          color: var(--text-color, #fff);
          font-family: inherit;
          resize: vertical;
        }

        .textarea:focus {
          outline: none;
          border-color: var(--accent-gold, #d4af37);
        }

        .textarea.mono {
          font-family: monospace;
          font-size: 0.875rem;
        }

        .select {
          padding: 0.5rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          color: var(--text-color, #fff);
          cursor: pointer;
        }

        .input {
          padding: 0.5rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          color: var(--text-color, #fff);
        }

        .input:focus {
          outline: none;
          border-color: var(--accent-gold, #d4af37);
        }

        .callout {
          padding: 1rem;
          border-radius: 6px;
          border-left: 4px solid;
        }

        .callout-warning {
          background: rgba(245, 158, 11, 0.1);
          border-color: #f59e0b;
          color: #fbbf24;
        }

        code {
          background: rgba(0, 0, 0, 0.3);
          padding: 0.125rem 0.375rem;
          border-radius: 3px;
          font-family: monospace;
          font-size: 0.875rem;
        }

        /* Test Results Styles */
        .test-results {
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-color, #333);
        }

        .test-results h4 {
          margin: 0 0 0.5rem 0;
          color: var(--accent-gold, #d4af37);
        }

        .model-results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1rem;
        }

        .model-result-card {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-color, #333);
          border-radius: 8px;
          padding: 1rem;
        }

        .model-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .model-name {
          font-weight: 600;
          font-size: 0.875rem;
        }

        .badges {
          display: flex;
          gap: 0.25rem;
        }

        .badge {
          font-size: 0.625rem;
          padding: 0.125rem 0.375rem;
          border-radius: 3px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .badge-value {
          background: rgba(74, 222, 128, 0.2);
          color: #4ade80;
        }

        .badge-score {
          background: rgba(212, 175, 55, 0.2);
          color: var(--accent-gold, #d4af37);
        }

        .score-display {
          font-size: 2rem;
          font-weight: 700;
          text-align: center;
          margin: 0.5rem 0;
        }

        .score-breakdown {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
          padding: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .score-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          padding: 0.125rem 0;
        }

        .model-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--text-muted, #888);
          margin-bottom: 0.5rem;
        }

        .feedback-section {
          font-size: 0.75rem;
          border-top: 1px solid var(--border-color, #333);
          padding-top: 0.5rem;
        }

        .feedback-text {
          margin: 0;
          line-height: 1.4;
          color: var(--text-muted, #aaa);
        }

        .fillers-text {
          margin: 0.25rem 0 0 0;
          color: #fbbf24;
          font-style: italic;
        }

        .mt-lg {
          margin-top: 1.5rem;
        }

        /* KV Status Styles */
        .kv-status-display {
          padding: 1rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
        }

        .kv-status-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .kv-status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.25rem 0;
        }

        .kv-message {
          color: var(--text-muted, #888);
          margin: 0;
        }

        .text-success {
          color: #4ade80;
        }

        .text-error {
          color: #ef4444;
        }

        .callout-error {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
          color: #fca5a5;
        }

        .kv-save-status {
          padding: 0.75rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        .kv-save-status.success {
          background: rgba(74, 222, 128, 0.15);
          border: 1px solid rgba(74, 222, 128, 0.3);
          color: #4ade80;
        }

        .kv-save-status.error {
          background: rgba(251, 191, 36, 0.15);
          border: 1px solid rgba(251, 191, 36, 0.3);
          color: #fbbf24;
        }
      `}</style>
    </div>
  );
}
