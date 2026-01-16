import { useTelemetry } from '../../hooks/useTelemetry';

interface TelemetryStripProps {
  mode?: 'minimal' | 'detailed' | 'compact';
}

export function TelemetryStrip({ mode = 'minimal' }: TelemetryStripProps) {
  const { currentRun, session, formatted } = useTelemetry();

  if (mode === 'minimal') {
    return (
      <div className="telemetry-strip telemetry-minimal">
        <span className="telemetry-item">
          <span className="telemetry-label">Run:</span>
          <span className="telemetry-value mono">{formatted.currentRunTotal}</span>
        </span>
        <span className="telemetry-divider">|</span>
        <span className="telemetry-item">
          <span className="telemetry-label">Session:</span>
          <span className="telemetry-value mono">{formatted.sessionTotal}</span>
        </span>
      </div>
    );
  }

  if (mode === 'compact') {
    return (
      <div className="telemetry-strip telemetry-compact">
        <span className="telemetry-value mono" title="Session total cost">
          {formatted.sessionTotal}
        </span>
      </div>
    );
  }

  // Detailed mode
  return (
    <div className="telemetry-strip telemetry-detailed">
      <div className="telemetry-section">
        <span className="telemetry-section-title">Current Run</span>
        <div className="telemetry-breakdown">
          <span className="telemetry-item">
            <span className="telemetry-label">STT:</span>
            <span className="telemetry-value mono">${currentRun.stt.toFixed(6)}</span>
          </span>
          <span className="telemetry-item">
            <span className="telemetry-label"> Score:</span>
            <span className="telemetry-value mono">${currentRun.scoring.toFixed(6)}</span>
          </span>
          <span className="telemetry-item telemetry-total">
            <span className="telemetry-label">Total:</span>
            <span className="telemetry-value mono">{formatted.currentRunTotal}</span>
          </span>
        </div>
      </div>

      <div className="telemetry-section">
        <span className="telemetry-section-title">Session ({session.transmissionCount} runs)</span>
        <div className="telemetry-breakdown">
          <span className="telemetry-item">
            <span className="telemetry-label">STT:</span>
            <span className="telemetry-value mono">{formatted.sttCost}</span>
          </span>
          <span className="telemetry-item">
            <span className="telemetry-label"> Score:</span>
            <span className="telemetry-value mono">{formatted.scoringCost}</span>
          </span>
          <span className="telemetry-item telemetry-total">
            <span className="telemetry-label">Total:</span>
            <span className="telemetry-value mono accent">{formatted.sessionTotal}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
