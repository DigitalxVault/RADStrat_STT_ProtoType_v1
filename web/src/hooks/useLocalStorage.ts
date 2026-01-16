import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Get stored value or use initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage when value changes
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Wrapper for setValue
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        return nextValue;
      });
    },
    []
  );

  // Clear stored value
  const clearValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error clearing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, clearValue];
}

// Utility to manage logs specifically
export function useLogs() {
  const [logs, setLogs, clearLogs] = useLocalStorage<
    Array<{
      id: string;
      timestamp: string;
      scenario: { id: number; scenario_id: string; title: string };
      role: string;
      sttModel: string;
      scoringModel: string;
      difficulty: string;
      transmissions: Array<{
        nodeId: number;
        expected: string;
        transcript: string;
        scores: { accuracy: number; structure: number; fluency: number; total: number };
        cost: { stt: number; scoring: number };
      }>;
      averageScore: number;
      totalCost: { stt: number; scoring: number; total: number };
    }>
  >('radstrat-logs', []);

  const addLog = useCallback(
    (log: Omit<(typeof logs)[0], 'id' | 'timestamp'>) => {
      const newLog = {
        ...log,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };
      setLogs((prev) => [newLog, ...prev]);
      return newLog;
    },
    [setLogs]
  );

  const deleteLog = useCallback(
    (id: string) => {
      setLogs((prev) => prev.filter((log) => log.id !== id));
    },
    [setLogs]
  );

  const getCumulativeCost = useCallback(() => {
    return logs.reduce(
      (acc, log) => ({
        stt: acc.stt + log.totalCost.stt,
        scoring: acc.scoring + log.totalCost.scoring,
        total: acc.total + log.totalCost.total,
      }),
      { stt: 0, scoring: 0, total: 0 }
    );
  }, [logs]);

  const exportLogs = useCallback(
    (format: 'json' | 'csv') => {
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(logs, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `radstrat-logs-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // CSV export
        const headers = [
          'ID',
          'Timestamp',
          'Scenario',
          'Role',
          'STT Model',
          'Scoring Model',
          'Difficulty',
          'Avg Score',
          'STT Cost',
          'Scoring Cost',
          'Total Cost',
        ];
        const rows = logs.map((log) => [
          log.id,
          log.timestamp,
          log.scenario.title,
          log.role,
          log.sttModel,
          log.scoringModel,
          log.difficulty,
          log.averageScore.toFixed(1),
          log.totalCost.stt.toFixed(6),
          log.totalCost.scoring.toFixed(6),
          log.totalCost.total.toFixed(6),
        ]);
        const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `radstrat-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    [logs]
  );

  return {
    logs,
    addLog,
    deleteLog,
    clearLogs,
    getCumulativeCost,
    exportLogs,
  };
}
