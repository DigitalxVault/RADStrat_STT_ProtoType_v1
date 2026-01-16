# RADStrat STT Prototype - Task Tracker

**Last Updated**: 2026-01-14

---

## Phase 0: Documentation Foundation

- [x] Create PRD.md - Product Requirements Document
- [x] Create tasks.md - Task tracking
- [x] Create changelog.md - Change log
- [x] Create debug.md - Debug journal

---

## Phase 1: Foundation (Backend + Data)

### Server Setup
- [ ] Initialize server/package.json with dependencies
- [ ] Create tsconfig.json for TypeScript configuration
- [ ] Create .env.example template
- [ ] Set up src/main.ts entry point
- [ ] Set up src/app.ts Express configuration

### Common Utilities
- [ ] Create error-handler.middleware.ts
- [ ] Create request-logger.middleware.ts
- [ ] Create cors.middleware.ts
- [ ] Create logger.ts utility
- [ ] Create response.utils.ts

### Configuration
- [ ] Create config/index.ts for environment variables
- [ ] Create config/pricing.config.ts with API pricing data

### Data Layer
- [ ] Combine raw_transcript.md + training_scenarios.json
- [ ] Create data/scenarios.json (combined/formatted)
- [ ] Define scenario.types.ts
- [ ] Define scoring.types.ts
- [ ] Define api.types.ts

### External API Clients
- [ ] Create clients/openai.client.ts
- [ ] Create clients/grok.client.ts

### Scenarios Module
- [ ] Create scenarios.controller.ts
- [ ] Create scenarios.service.ts
- [ ] Create scenarios.repository.ts
- [ ] Implement GET /api/scenarios
- [ ] Implement GET /api/scenarios/:id
- [ ] Implement GET /api/scenarios/random
- [ ] Implement GET /api/roles

### Health Module
- [ ] Create health.controller.ts
- [ ] Implement GET /api/health

### STT Module (Basic)
- [ ] Create stt.controller.ts
- [ ] Create stt.service.ts
- [ ] Create transcribe.dto.ts
- [ ] Implement POST /api/stt/transcribe (Whisper)
- [ ] Add gpt-4o-transcribe support
- [ ] Add gpt-4o-mini-transcribe support

---

## Phase 2: Scoring Engine

### Scoring Module Setup
- [ ] Create scoring.controller.ts
- [ ] Create scoring.service.ts
- [ ] Create evaluate.dto.ts

### Scoring Engines
- [ ] Create structure.engine.ts
  - [ ] Callsign detection logic
  - [ ] Order validation (Receiver → Sender → Location → Intent)
  - [ ] Penalty calculation
- [ ] Create accuracy.engine.ts
  - [ ] Number normalization utility
  - [ ] Easy mode (semantic matching)
  - [ ] Medium mode (semantic + key phrases)
  - [ ] Hard mode (WER calculation)
- [ ] Create fluency.engine.ts
  - [ ] Filler word detection
  - [ ] Pause detection
  - [ ] Self-correction detection
  - [ ] Score calculation

### Cost Calculation
- [ ] Implement STT cost calculation
- [ ] Implement scoring cost calculation (token counting)
- [ ] Create cost aggregation utility

### Scoring Endpoint
- [ ] Implement POST /api/score/evaluate
- [ ] GPT-4o integration
- [ ] GPT-5.2 integration
- [ ] GPT-5-nano integration
- [ ] Grok-4.1-fast integration

### Pricing Module
- [ ] Create pricing.controller.ts
- [ ] Create pricing.service.ts
- [ ] Implement GET /api/pricing

---

## Phase 3: Frontend Shell

### Project Setup
- [ ] Initialize web/package.json with dependencies
- [ ] Create vite.config.ts
- [ ] Create tsconfig.json
- [ ] Create index.html

### Styles
- [ ] Create styles/globals.css with CSS variables
- [ ] Implement paper-on-dark theme from styleguide.md
- [ ] Create styles/components.css

### Base Components
- [ ] Create components/ui/Button.tsx
- [ ] Create components/ui/Card.tsx
- [ ] Create components/ui/Select.tsx
- [ ] Create components/ui/Slider.tsx
- [ ] Create components/ui/Badge.tsx
- [ ] Create components/ui/CalloutBar.tsx

### Layout Components
- [ ] Create components/layout/TabNav.tsx
- [ ] Create components/layout/Paper.tsx
- [ ] Create components/layout/PageContainer.tsx

### App Shell
- [ ] Create main.tsx entry point
- [ ] Create App.tsx with tab routing
- [ ] Implement responsive layout

### Types
- [ ] Create types/index.ts (shared frontend types)

### API Client
- [ ] Create lib/api.ts (fetch wrapper)
- [ ] Create lib/utils.ts (utilities)

---

## Phase 4: STT Test Tab

### Model Selection
- [ ] Create features/stt-test/ModelSelector.tsx
  - [ ] STT model dropdown
  - [ ] Scoring model dropdown

### Role & Scenario
- [ ] Create features/stt-test/RoleSelector.tsx
- [ ] Create features/stt-test/ScenarioDisplay.tsx
  - [ ] Title display
  - [ ] Objectives display
  - [ ] Context (previous transmissions)
  - [ ] Current transmission highlight

### Recording
- [ ] Create hooks/useRecording.ts (MediaRecorder)
- [ ] Create features/stt-test/RecordingControls.tsx
  - [ ] Record button
  - [ ] Stop button
  - [ ] Recording indicator
- [ ] (Optional) Waveform visualization

### Transcription
- [ ] Create hooks/useSTT.ts
- [ ] Create features/stt-test/TranscriptDisplay.tsx

### Scoring Display
- [ ] Create hooks/useScoring.ts
- [ ] Create features/stt-test/ScoreBreakdown.tsx
  - [ ] Accuracy score + details
  - [ ] Structure score + details
  - [ ] Fluency score + details
  - [ ] Total score badge

### NPC Response
- [ ] Create features/stt-test/NPCResponse.tsx
  - [ ] Typing animation effect
  - [ ] Message display

### Progress & Control
- [ ] Progress indicator (X of Y transmissions)
- [ ] Final score display
- [ ] REFRESH button functionality

### State Management
- [ ] Create stores/scenarioStore.ts

---

## Phase 5: Parameters Tab

### Components
- [ ] Create features/parameters/DifficultySelector.tsx
  - [ ] Easy/Medium/Hard radio buttons
- [ ] Create features/parameters/ParameterSliders.tsx
  - [ ] WER threshold slider
  - [ ] Filler penalty input
  - [ ] Max fillers input
  - [ ] Pause tolerance slider
- [ ] Create features/parameters/PromptEditor.tsx (optional)
  - [ ] Accuracy prompt textarea
  - [ ] Structure prompt textarea
  - [ ] Fluency prompt textarea

### Presets
- [ ] Near_Fetch preset (easy settings)
- [ ] Far_Fetch preset (hard settings)
- [ ] Custom preset support

### Persistence
- [ ] Create hooks/useLocalStorage.ts
- [ ] Create stores/parametersStore.ts
- [ ] Save/Load/Reset functionality

---

## Phase 6: Logs Tab

### Components
- [ ] Create features/logs/LogsTable.tsx
  - [ ] Session rows
  - [ ] Expandable details
  - [ ] Delete buttons
- [ ] Create features/logs/LogEntry.tsx
  - [ ] Transmission details
  - [ ] Individual scores
- [ ] Create features/logs/CostSummary.tsx
  - [ ] Per-session cost
  - [ ] Cumulative total

### State Management
- [ ] Create stores/logsStore.ts
- [ ] localStorage persistence
- [ ] Delete functionality

### Export
- [ ] JSON export
- [ ] CSV export

---

## Phase 7: Integration & Polish

### Testing
- [ ] Backend unit tests (scoring.service.test.ts)
- [ ] Backend integration tests (stt.controller.test.ts)
- [ ] Frontend component tests

### Error Handling
- [ ] API error states
- [ ] Microphone permission errors
- [ ] Network failure handling
- [ ] Loading states throughout

### Performance
- [ ] Bundle optimization
- [ ] API response caching
- [ ] Lazy loading (if needed)

### Polish
- [ ] Final UI review against styleguide.md
- [ ] Mobile responsiveness verification
- [ ] Accessibility audit
- [ ] Console error cleanup

### Documentation
- [ ] Update README.md (if needed)
- [ ] API documentation
- [ ] Setup instructions

---

## Priority Legend

| Priority | Description |
|----------|-------------|
| P0 | Critical - Blocks other work |
| P1 | High - Core functionality |
| P2 | Medium - Important features |
| P3 | Low - Nice to have |

---

## Status Legend

| Status | Symbol |
|--------|--------|
| Not Started | [ ] |
| In Progress | [~] |
| Completed | [x] |
| Blocked | [!] |

---

## Dependencies

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
                ↘                 ↗
                  (parallel possible)
```

- Phase 1 (Backend) and Phase 3 (Frontend Shell) can run in parallel after Phase 0
- Phase 2 (Scoring) depends on Phase 1 API clients
- Phase 4-6 (Tabs) depend on Phase 3 shell
- Phase 7 (Integration) requires all previous phases

---

## Notes

- Follow FULLSTACK_FUNDAMENTALS_PLAYBOOK.md patterns throughout
- Reference styleguide.md for all UI decisions
- Update changelog.md with each significant change
- Log issues in debug.md as encountered
