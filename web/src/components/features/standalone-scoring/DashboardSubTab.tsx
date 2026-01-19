/**
 * Dashboard Sub-Tab
 *
 * Displays:
 * - Model comparison statistics
 * - Request history log with multi-model scores
 */

import { useState } from 'react';
import {
  useUnityRequestLogs,
  useUnityScoringActions,
  type UnityRequestLog,
} from '../../../stores/unityScoringStore';
import { formatCost, formatLatency } from '../../../lib/unity-api';
import type { ScoringModel } from '../../../types';

const MODELS: ScoringModel[] = ['gpt-4o', 'gpt-4o-mini', 'grok-4.1-fast'];

export function DashboardSubTab() {
  const requestLogs = useUnityRequestLogs();
  const { clearRequestLogs, deleteRequestLog, getAggregateStats } = useUnityScoringActions();
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const stats = getAggregateStats();

  const formatScore = (score: number) => Math.round(score);
  const formatAvg = (val: number) => val.toFixed(1);

  const getBestScoreModel = (log: UnityRequestLog): ScoringModel => {
    return MODELS.reduce((best, model) =>
      log.results[model].total > log.results[best].total ? model : best
    );
  };

  const getBestValueModel = (log: UnityRequestLog): ScoringModel => {
    return MODELS.reduce((best, model) => {
      const bestRatio = log.results[best].total / (log.results[best].cost || 0.0001);
      const modelRatio = log.results[model].total / (log.results[model].cost || 0.0001);
      return modelRatio > bestRatio ? model : best;
    });
  };

  return (
    <div className="dashboard-subtab">
      {/* Stats Summary Cards */}
      <div className="stats-grid mb-lg">
        <div className="stat-card">
          <div className="stat-value">{stats.totalRequests}</div>
          <div className="stat-label">Total Requests</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatCost(stats.totalCost)}</div>
          <div className="stat-label">Total Cost (All Models)</div>
        </div>
        {MODELS.map((model) => (
          <div key={model} className="stat-card">
            <div className="stat-value">
              {formatAvg(stats.byModel[model].averageScore)}
            </div>
            <div className="stat-label">{model} Avg Score</div>
            <div className="stat-detail">
              {formatCost(stats.byModel[model].totalCost)} total
            </div>
          </div>
        ))}
      </div>

      {/* Request Log Table */}
      <div className="log-section">
        <div className="flex justify-between items-center mb-md">
          <h3 style={{ margin: 0 }}>Request History</h3>
          {requestLogs.length > 0 && (
            <button className="btn btn-sm" onClick={clearRequestLogs}>
              Clear All
            </button>
          )}
        </div>

        {requestLogs.length === 0 ? (
          <div className="empty-state">
            <p className="text-muted">No scoring requests yet.</p>
            <p className="small text-muted">
              Requests from Unity will appear here, or use the Configuration tab to test manually.
            </p>
          </div>
        ) : (
          <div className="log-table-wrapper">
            <table className="log-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Expected</th>
                  <th>Transcript</th>
                  <th className="model-col">GPT-4o</th>
                  <th className="model-col">GPT-4o-mini</th>
                  <th className="model-col">Grok Fast</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requestLogs.map((log) => {
                  const bestScore = getBestScoreModel(log);
                  const bestValue = getBestValueModel(log);
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <>
                      <tr
                        key={log.id}
                        className={`log-row ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      >
                        <td className="mono small">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="truncate" title={log.input.expected}>
                          {log.input.expected.slice(0, 30)}...
                        </td>
                        <td className="truncate" title={log.input.transcript}>
                          {log.input.transcript.slice(0, 30)}...
                        </td>
                        {MODELS.map((model) => {
                          const result = log.results[model];
                          const isBestScore = model === bestScore;
                          const isBestValue = model === bestValue;
                          return (
                            <td
                              key={model}
                              className={`model-cell ${isBestScore ? 'best-score' : ''} ${isBestValue ? 'best-value' : ''}`}
                            >
                              <span className="score">{formatScore(result.total)}</span>
                              <span className="cost">{formatCost(result.cost)}</span>
                            </td>
                          );
                        })}
                        <td>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteRequestLog(log.id);
                            }}
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${log.id}-details`} className="details-row">
                          <td colSpan={7}>
                            <div className="details-content">
                              <div className="details-section">
                                <strong>Input:</strong>
                                <div className="detail-text">
                                  <strong>Expected:</strong> {log.input.expected}
                                </div>
                                <div className="detail-text">
                                  <strong>Transcript:</strong> {log.input.transcript}
                                </div>
                                <div className="detail-text">
                                  <strong>Difficulty:</strong> {log.input.difficulty}
                                </div>
                              </div>
                              <div className="model-details-grid">
                                {MODELS.map((model) => {
                                  const result = log.results[model];
                                  return (
                                    <div key={model} className="model-detail-card">
                                      <h4>{model}</h4>
                                      <div className="score-breakdown">
                                        <div>Structure: {result.scores.structure.score}/30</div>
                                        <div>Accuracy: {result.scores.accuracy.score}/50</div>
                                        <div>Fluency: {result.scores.fluency.score}/20</div>
                                        <div><strong>Total: {result.total}/100</strong></div>
                                      </div>
                                      <div className="meta">
                                        <span>Cost: {formatCost(result.cost)}</span>
                                        <span>Latency: {formatLatency(result.latency_ms)}</span>
                                      </div>
                                      {result.scores.fluency.fillers.length > 0 && (
                                        <div className="fillers">
                                          Fillers: {result.scores.fluency.fillers.join(', ')}
                                        </div>
                                      )}
                                      <div className="feedback">
                                        <strong>Feedback:</strong> {result.feedback}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dashboard Styles */}
      <style>{`
        .dashboard-subtab {
          padding-bottom: 2rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color, #333);
          border-radius: 8px;
          padding: 1rem;
          text-align: center;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: bold;
          color: var(--accent-gold, #d4af37);
          font-family: monospace;
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--text-muted, #888);
          margin-top: 0.25rem;
        }

        .stat-detail {
          font-size: 0.75rem;
          color: var(--text-muted, #666);
          margin-top: 0.25rem;
          font-family: monospace;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          border: 1px dashed var(--border-color, #333);
          border-radius: 8px;
        }

        .log-table-wrapper {
          overflow-x: auto;
        }

        .log-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .log-table th,
        .log-table td {
          padding: 0.75rem 0.5rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color, #333);
        }

        .log-table th {
          font-weight: 600;
          color: var(--text-muted, #888);
          white-space: nowrap;
        }

        .log-row {
          cursor: pointer;
          transition: background 0.2s;
        }

        .log-row:hover {
          background: rgba(212, 175, 55, 0.05);
        }

        .log-row.expanded {
          background: rgba(212, 175, 55, 0.1);
        }

        .truncate {
          max-width: 150px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .model-col {
          text-align: center;
          min-width: 100px;
        }

        .model-cell {
          text-align: center;
          font-family: monospace;
        }

        .model-cell .score {
          display: block;
          font-weight: bold;
        }

        .model-cell .cost {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted, #888);
        }

        .model-cell.best-score .score {
          color: #4ade80;
        }

        .model-cell.best-value {
          background: rgba(59, 130, 246, 0.1);
        }

        .details-row td {
          background: rgba(0, 0, 0, 0.2);
          padding: 1rem !important;
        }

        .details-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .details-section {
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 4px;
        }

        .detail-text {
          margin: 0.25rem 0;
          font-size: 0.875rem;
        }

        .model-details-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .model-detail-card {
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color, #333);
          border-radius: 6px;
        }

        .model-detail-card h4 {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          color: var(--accent-gold, #d4af37);
        }

        .score-breakdown {
          font-size: 0.8rem;
          font-family: monospace;
          margin-bottom: 0.5rem;
        }

        .meta {
          font-size: 0.75rem;
          color: var(--text-muted, #888);
          display: flex;
          gap: 1rem;
        }

        .fillers {
          font-size: 0.75rem;
          color: #f97316;
          margin-top: 0.25rem;
        }

        .feedback {
          font-size: 0.8rem;
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid var(--border-color, #333);
        }

        .btn-ghost {
          background: transparent;
          border: none;
          color: var(--text-muted, #888);
          cursor: pointer;
          padding: 0.25rem 0.5rem;
        }

        .btn-ghost:hover {
          color: #ef4444;
        }

        @media (max-width: 768px) {
          .model-details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
