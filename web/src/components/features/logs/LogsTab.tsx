import { useState } from 'react';
import { useLogs } from '../../../hooks/useLocalStorage';

interface LogsTabProps {
  logsManager: ReturnType<typeof useLogs>;
}

export function LogsTab({ logsManager }: LogsTabProps) {
  const { logs, deleteLog, clearLogs, getCumulativeCost, exportLogs } = logsManager;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cumulativeCost = getCumulativeCost();

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${day}/${month}/${year} ${time}`;
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(6)}`;
  };

  return (
    <div className="logs-tab">
      {/* Cost Summary */}
      <section className="mb-lg">
        <h5 className="mb-sm">Cumulative Costs</h5>
        <div className="card">
          <div className="flex justify-between gap-md" style={{ flexWrap: 'wrap' }}>
            <div className="text-center">
              <span className="mono" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {formatCost(cumulativeCost.stt)}
              </span>
              <p className="small text-muted">STT Costs</p>
            </div>
            <div className="text-center">
              <span className="mono" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {formatCost(cumulativeCost.scoring)}
              </span>
              <p className="small text-muted">Scoring Costs</p>
            </div>
            <div className="text-center">
              <span className="mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-yellow)' }}>
                {formatCost(cumulativeCost.total)}
              </span>
              <p className="small text-muted">Total</p>
            </div>
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="mb-md flex gap-sm justify-between" style={{ flexWrap: 'wrap' }}>
        <div className="flex gap-sm">
          <button
            className="btn btn-ghost"
            onClick={() => exportLogs('json')}
            disabled={logs.length === 0}
          >
            Export JSON
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => exportLogs('csv')}
            disabled={logs.length === 0}
          >
            Export CSV
          </button>
        </div>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (confirm('Are you sure you want to clear all logs?')) {
              clearLogs();
            }
          }}
          disabled={logs.length === 0}
        >
          Clear All
        </button>
      </section>

      {/* Logs Table */}
      <section>
        <h5 className="mb-sm">Session History ({logs.length})</h5>

        {logs.length === 0 ? (
          <div className="card text-center text-muted">
            <p>No sessions recorded yet.</p>
            <p className="small mt-xs">Complete an STT test session to see logs here.</p>
          </div>
        ) : (
          <div className="logs-list">
            {logs.map((log) => (
              <div key={log.id} className="card card-bordered mb-sm">
                {/* Log Header */}
                <div
                  className="flex justify-between items-center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleExpand(log.id)}
                >
                  <div>
                    <p className="mono" style={{ fontWeight: 600 }}>
                      {log.scenario.title}
                    </p>
                    <p className="small text-muted">
                      {formatDate(log.timestamp)} | {log.role} | {log.difficulty}
                    </p>
                  </div>
                  <div className="flex items-center gap-md">
                    <div className="text-right">
                      <span className="badge">{log.averageScore.toFixed(1)}</span>
                      <p className="small text-muted mt-xs">{formatCost(log.totalCost.total)}</p>
                    </div>
                    <span style={{ fontSize: '1.25rem' }}>
                      {expandedId === log.id ? '▼' : '▶'}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === log.id && (
                  <div className="mt-md" style={{ borderTop: '1px solid var(--stroke)', paddingTop: 'var(--space-md)' }}>
                    {/* Models & Settings */}
                    <div className="mb-md">
                      <p className="small mono text-muted">
                        STT: {log.sttModel} | Scoring: {log.scoringModel}
                      </p>
                    </div>

                    {/* Transmission Details */}
                    <div className="mb-md">
                      <label className="label">Transmissions ({log.transmissions.length})</label>
                      {log.transmissions.map((t, idx) => (
                        <div
                          key={idx}
                          className="card card-bordered mb-xs"
                          style={{ background: 'var(--surface-paper)' }}
                        >
                          <div className="flex justify-between items-start mb-xs">
                            <span className="badge badge-circle">{t.nodeId}</span>
                            <span className="mono small">Score: {t.scores.total}/100</span>
                          </div>
                          <div className="mb-xs">
                            <p className="small text-muted">Expected:</p>
                            <p className="small mono">"{t.expected}"</p>
                          </div>
                          <div className="mb-xs">
                            <p className="small text-muted">Actual:</p>
                            <p className="small mono">"{t.transcript}"</p>
                          </div>
                          <div className="flex gap-sm small mono text-muted">
                            <span>Str: {t.scores.structure}</span>
                            <span>Acc: {t.scores.accuracy}</span>
                            <span>Flu: {t.scores.fluency}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Cost Breakdown */}
                    <div className="mb-md">
                      <label className="label">Cost Breakdown</label>
                      <p className="small mono">
                        STT: {formatCost(log.totalCost.stt)} |
                        Scoring: {formatCost(log.totalCost.scoring)} |
                        Total: {formatCost(log.totalCost.total)}
                      </p>
                    </div>

                    {/* Delete Button */}
                    <div className="text-right">
                      <button
                        className="btn btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this session log?')) {
                            deleteLog(log.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
