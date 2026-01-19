import { useState } from 'react';
import { TabId } from './types';
import { STTTestTab } from './components/features/stt-test/STTTestTab';
import { ParametersTab } from './components/features/parameters/ParametersTab';
import { LogsTab } from './components/features/logs/LogsTab';
import { StandaloneScoringTab } from './components/features/standalone-scoring/StandaloneScoringTab';
import { useLocalStorage, useLogs } from './hooks/useLocalStorage';
import {
  STTModel,
  ScoringModel,
  DifficultyLevel,
  ScoringParameters,
} from './types';
import './styles/globals.css';

const DEFAULT_PARAMETERS: ScoringParameters = {
  werThreshold: 20,
  fillerPenalty: 1,
  maxAllowedFillers: 2,
  pauseTolerance: 2,
};

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('stt-test');

  // Persisted settings
  const [sttModel, setSttModel] = useLocalStorage<STTModel>(
    'radstrat-stt-model',
    'whisper'
  );
  const [scoringModel, setScoringModel] = useLocalStorage<ScoringModel>(
    'radstrat-scoring-model',
    'gpt-4o-mini'
  );
  const [difficulty, setDifficulty] = useLocalStorage<DifficultyLevel>(
    'radstrat-difficulty',
    'medium'
  );
  const [parameters, setParameters] = useLocalStorage<ScoringParameters>(
    'radstrat-parameters',
    DEFAULT_PARAMETERS
  );

  // Logs management
  const logsManager = useLogs();

  const tabs: { id: TabId; label: string }[] = [
    { id: 'stt-test', label: 'STT Test' },
    { id: 'parameters', label: 'Parameters' },
    { id: 'logs', label: 'Logs' },
    { id: 'standalone-scoring', label: 'STANDALONE SCORING (Unity)' },
  ];

  return (
    <div className="app-container">
      <main className="paper">
        {/* Header */}
        <header className="mb-lg">
          <h2 style={{ fontStyle: 'italic' }}>RADStrat</h2>
          <p className="text-muted mono small">Radio Telephony Training Prototype</p>
        </header>

        {/* Tab Navigation */}
        <nav className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Tab Content - Using CSS visibility to preserve state across tab switches */}
        <div className="tab-content">
          <div style={{ display: activeTab === 'stt-test' ? 'block' : 'none' }}>
            <STTTestTab
              sttModel={sttModel}
              setSttModel={setSttModel}
              scoringModel={scoringModel}
              setScoringModel={setScoringModel}
              difficulty={difficulty}
              parameters={parameters}
              onLogSession={logsManager.addLog}
            />
          </div>

          <div style={{ display: activeTab === 'parameters' ? 'block' : 'none' }}>
            <ParametersTab
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              parameters={parameters}
              setParameters={setParameters}
            />
          </div>

          <div style={{ display: activeTab === 'logs' ? 'block' : 'none' }}>
            <LogsTab logsManager={logsManager} />
          </div>

          <div style={{ display: activeTab === 'standalone-scoring' ? 'block' : 'none' }}>
            <StandaloneScoringTab />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-lg text-center text-muted small">
          <p className="mono">v0.1.0 | MAGES STUDIO</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
