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
import { scoreUnityTransmission } from '../../../lib/unity-api';
import type { DifficultyLevel } from '../../../types';

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

interface ApiKeyInfo {
  masked: string;
  isConfigured: boolean;
  envVar: string;
}

export function ConfigSubTab() {
  const config = useUnityConfig();
  const isProcessing = useUnityIsProcessing();
  const lastError = useUnityLastError();
  const {
    setCustomPrompt,
    setFillerPenalty,
    setMaxFillers,
    resetConfig,
    setProcessing,
    setError,
    addRequestLog,
  } = useUnityScoringActions();

  // API Key state (fetched from server)
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(true);

  // Manual test state
  const [testExpected, setTestExpected] = useState('');
  const [testTranscript, setTestTranscript] = useState('');
  const [testDifficulty, setTestDifficulty] = useState<DifficultyLevel>('medium');

  // Fetch API key info from server
  useEffect(() => {
    async function fetchApiKeyInfo() {
      try {
        const res = await fetch('/api/unity/config');
        const data = await res.json();
        if (data.success) {
          setApiKeyInfo(data.apiKey);
        }
      } catch (err) {
        console.error('Failed to fetch API key info:', err);
      } finally {
        setApiKeyLoading(false);
      }
    }
    fetchApiKeyInfo();
  }, []);

  // Run manual test
  const runManualTest = async () => {
    if (!testExpected.trim() || !testTranscript.trim()) {
      setError('Both expected and transcript fields are required');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const result = await scoreUnityTransmission(
        {
          transcript: testTranscript,
          expected: testExpected,
          difficulty: testDifficulty,
          customPrompt: config.customPrompt || undefined,
        },
        config.apiKey
      );

      addRequestLog(result);
      setTestExpected('');
      setTestTranscript('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setProcessing(false);
    }
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
          <label className="label mb-xs">Custom Scoring Prompt (Optional)</label>
          <textarea
            value={config.customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="textarea mono"
            rows={5}
            placeholder="Leave empty to use default RT scoring prompt..."
          />
          <p className="small text-muted mt-xs">
            Override the default LLM prompt for specialized scoring requirements.
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
      `}</style>
    </div>
  );
}
