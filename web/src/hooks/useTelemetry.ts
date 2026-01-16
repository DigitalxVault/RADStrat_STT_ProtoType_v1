import { useMemo } from 'react';
import { useSTTSessionStore } from '../stores/sttSessionStore';

export interface TelemetryMetrics {
  // Current run costs (resets per transmission)
  currentRun: {
    stt: number;
    scoring: number;
    total: number;
  };

  // Session cumulative costs
  session: {
    stt: number;
    scoring: number;
    total: number;
    transmissionCount: number;
  };

  // Formatted strings for display
  formatted: {
    currentRunTotal: string;
    sessionTotal: string;
    sttCost: string;
    scoringCost: string;
  };
}

export function useTelemetry(): TelemetryMetrics {
  const costs = useSTTSessionStore((state) => state.costs);
  const sessionLogs = useSTTSessionStore((state) => state.sessionLogs);

  const metrics = useMemo<TelemetryMetrics>(() => {
    const currentRunTotal = costs.currentRun.stt + costs.currentRun.scoring;
    const sessionTotal = costs.session.stt + costs.session.scoring;

    return {
      currentRun: {
        stt: costs.currentRun.stt,
        scoring: costs.currentRun.scoring,
        total: currentRunTotal,
      },
      session: {
        stt: costs.session.stt,
        scoring: costs.session.scoring,
        total: sessionTotal,
        transmissionCount: sessionLogs.length,
      },
      formatted: {
        currentRunTotal: formatCost(currentRunTotal),
        sessionTotal: formatCost(sessionTotal),
        sttCost: formatCost(costs.session.stt),
        scoringCost: formatCost(costs.session.scoring),
      },
    };
  }, [costs, sessionLogs.length]);

  return metrics;
}

// Format cost with appropriate precision
function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}
