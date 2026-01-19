/**
 * STANDALONE SCORING (Unity) Tab
 *
 * Main container component with sub-tab navigation.
 * ISOLATED from existing STT Test scoring system.
 */

import { useState } from 'react';
import { DashboardSubTab } from './DashboardSubTab';
import { ConfigSubTab } from './ConfigSubTab';
import { ApiDocsSubTab } from './ApiDocsSubTab';

type SubTabId = 'dashboard' | 'config' | 'api-docs';

interface SubTab {
  id: SubTabId;
  label: string;
}

const SUB_TABS: SubTab[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'config', label: 'Configuration' },
  { id: 'api-docs', label: 'API Docs' },
];

export function StandaloneScoringTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('dashboard');

  return (
    <div className="standalone-scoring-tab">
      {/* Header */}
      <div className="mb-lg">
        <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>
          STANDALONE SCORING (Unity)
        </h2>
        <p className="text-muted" style={{ margin: 0 }}>
          Isolated scoring API for Unity integration. Scores with all 3 models in parallel.
        </p>
      </div>

      {/* Sub-tab Navigation */}
      <div className="sub-tab-nav mb-lg">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`sub-tab-btn ${activeSubTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveSubTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab Content */}
      <div className="sub-tab-content">
        <div style={{ display: activeSubTab === 'dashboard' ? 'block' : 'none' }}>
          <DashboardSubTab />
        </div>
        <div style={{ display: activeSubTab === 'config' ? 'block' : 'none' }}>
          <ConfigSubTab />
        </div>
        <div style={{ display: activeSubTab === 'api-docs' ? 'block' : 'none' }}>
          <ApiDocsSubTab />
        </div>
      </div>

      {/* Sub-tab Styles */}
      <style>{`
        .standalone-scoring-tab {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .sub-tab-nav {
          display: flex;
          gap: 0.5rem;
          border-bottom: 1px solid var(--border-color, #333);
          padding-bottom: 0.5rem;
        }

        .sub-tab-btn {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-color, #333);
          background: transparent;
          color: var(--text-muted, #888);
          cursor: pointer;
          border-radius: 4px 4px 0 0;
          transition: all 0.2s ease;
        }

        .sub-tab-btn:hover {
          background: rgba(212, 175, 55, 0.1);
          color: var(--text-color, #fff);
        }

        .sub-tab-btn.active {
          background: var(--accent-gold, #d4af37);
          color: var(--bg-primary, #1a1814);
          border-color: var(--accent-gold, #d4af37);
          font-weight: 600;
        }

        .sub-tab-content {
          flex: 1;
          overflow-y: auto;
          padding-top: 1rem;
        }
      `}</style>
    </div>
  );
}
