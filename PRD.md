# RADStrat STT Prototype - Product Requirements Document

**Version**: 1.0.0
**Last Updated**: 2026-01-14
**Status**: In Development

---

## 1. Executive Summary

### 1.1 Product Overview
RADStrat is a Radio Telephony (RT) training prototype designed for airfield operations personnel. The application provides Speech-to-Text testing capabilities with AI-powered scoring to help users practice and improve their RT communication skills.

### 1.2 Problem Statement
Radio Telephony communication in airfield operations requires strict adherence to protocols, including proper callsign ordering, clear speech, and accurate message delivery. Current training methods lack immediate feedback and objective scoring mechanisms.

### 1.3 Solution
A web-based prototype that:
- Captures user speech via microphone
- Transcribes speech using multiple STT models
- Scores transmissions against expected responses
- Provides immediate, detailed feedback on structure, accuracy, and fluency
- Tracks progress and costs across training sessions

---

## 2. User Personas

### 2.1 Primary User: Trainee Operator
- **Role**: Airfield operations personnel in training
- **Goals**: Practice RT communication, receive objective feedback, track improvement
- **Pain Points**: Limited opportunities for realistic practice, subjective feedback
- **Technical Skill**: Basic computer literacy, familiar with RT protocols

### 2.2 Secondary User: Training Instructor
- **Role**: Oversees RT training programs
- **Goals**: Monitor trainee progress, evaluate cost-effectiveness of training
- **Pain Points**: Time-consuming manual evaluation, inconsistent grading
- **Technical Skill**: Moderate computer literacy

---

## 3. Functional Requirements

### 3.1 Tab Structure

#### FR-001: STT Test Tab
The primary interface for speech-to-text testing and scoring.

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001.1 | Display STT model selector (Whisper, gpt-4o-transcribe, gpt-4o-mini-transcribe) | Must Have |
| FR-001.2 | Display Scoring model selector (GPT-4o, GPT-5.2, GPT-5-nano, Grok-4.1-fast) | Must Have |
| FR-001.3 | Display Role selector dropdown with all available roles | Must Have |
| FR-001.4 | Load random scenario containing selected role | Must Have |
| FR-001.5 | Display scenario context (title, objectives, previous transmissions) | Must Have |
| FR-001.6 | Highlight current player transmission with expected response | Must Have |
| FR-001.7 | Provide Record/Stop buttons for microphone capture | Must Have |
| FR-001.8 | Display transcribed text after recording | Must Have |
| FR-001.9 | Display score breakdown (Accuracy, Structure, Fluency) | Must Have |
| FR-001.10 | Animate NPC responses with typing effect | Should Have |
| FR-001.11 | Show progress indicator (Transmission X of Y) | Must Have |
| FR-001.12 | Display final average score after scenario completion | Must Have |
| FR-001.13 | Provide REFRESH button to load new random scenario | Must Have |
| FR-001.14 | Display waveform visualization during recording | Could Have |

#### FR-002: Parameters Tab
Configuration interface for scoring parameters.

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-002.1 | Difficulty level selector (Easy, Medium, Hard) | Must Have |
| FR-002.2 | WER threshold slider (0-100%) | Should Have |
| FR-002.3 | Filler word penalty input (points per filler) | Must Have |
| FR-002.4 | Max allowed fillers input | Must Have |
| FR-002.5 | Pause tolerance slider (seconds) | Should Have |
| FR-002.6 | Editable scoring prompts (Accuracy, Structure, Fluency) | Could Have |
| FR-002.7 | Preset profiles (Near_Fetch, Far_Fetch, Custom) | Should Have |
| FR-002.8 | Save/Load/Reset buttons for parameters | Must Have |
| FR-002.9 | Persist parameters to localStorage | Must Have |

#### FR-003: Logs Tab
Session history and cost tracking interface.

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-003.1 | Display session history table | Must Have |
| FR-003.2 | Show timestamp, scenario, role, transmission count per session | Must Have |
| FR-003.3 | Show average score per session | Must Have |
| FR-003.4 | Show STT cost, scoring cost, total cost per session | Must Have |
| FR-003.5 | Expandable rows for individual transmission details | Should Have |
| FR-003.6 | Display cumulative cost total (running sum) | Must Have |
| FR-003.7 | Delete button per log entry | Must Have |
| FR-003.8 | Export button (JSON/CSV download) | Should Have |
| FR-003.9 | Persist logs to localStorage | Must Have |

### 3.2 Scoring System

#### FR-004: Structure Scoring (30%)
**STRICT - No leniency on callsign placement**

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-004.1 | Validate receiver callsign is FIRST (10 points) | Must Have |
| FR-004.2 | Validate sender callsign is SECOND (10 points) | Must Have |
| FR-004.3 | Check location present when required (5 points) | Must Have |
| FR-004.4 | Check intent/message completeness (5 points) | Must Have |
| FR-004.5 | Apply -10 penalty per misplaced callsign | Must Have |
| FR-004.6 | Apply -10 penalty per missing required callsign | Must Have |
| FR-004.7 | Return detected element order in response | Should Have |

#### FR-005: Accuracy Scoring (50%)
**Varies by difficulty level**

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-005.1 | Easy mode: Semantic similarity check | Must Have |
| FR-005.2 | Medium mode: Semantic + key phrases | Must Have |
| FR-005.3 | Hard mode: Exact word matching (WER-based) | Must Have |
| FR-005.4 | Number normalization ("1" = "One" = "ONE") | Must Have |
| FR-005.5 | RT number format ("TWO-ZERO" = "20" = "twenty") | Must Have |
| FR-005.6 | Return matched/missing elements list | Should Have |

#### FR-006: Fluency Scoring (20%)
**Based on speech quality indicators**

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-006.1 | Detect filler words (um, uh, like, you know, etc.) | Must Have |
| FR-006.2 | Apply configurable penalty per filler | Must Have |
| FR-006.3 | Detect self-corrections (repeated/revised phrases) | Should Have |
| FR-006.4 | Detect long pauses (based on threshold) | Should Have |
| FR-006.5 | Return fluency rating (excellent/good/fair/poor) | Should Have |
| FR-006.6 | Minimum score floor at 0 | Must Have |

### 3.3 API Integration

#### FR-007: Speech-to-Text

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-007.1 | Support Whisper API for transcription | Must Have |
| FR-007.2 | Support gpt-4o-transcribe | Must Have |
| FR-007.3 | Support gpt-4o-mini-transcribe | Must Have |
| FR-007.4 | Return transcript, duration, and cost | Must Have |
| FR-007.5 | Handle API errors gracefully | Must Have |

#### FR-008: Scoring Evaluation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-008.1 | Support GPT-4o for scoring | Must Have |
| FR-008.2 | Support GPT-5.2 for scoring | Must Have |
| FR-008.3 | Support GPT-5-nano for scoring | Must Have |
| FR-008.4 | Support Grok-4.1-fast for scoring | Must Have |
| FR-008.5 | Return structured scoring response | Must Have |
| FR-008.6 | Calculate and return cost per evaluation | Must Have |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | Page load time | < 3 seconds |
| NFR-002 | STT transcription response | < 10 seconds |
| NFR-003 | Scoring evaluation response | < 5 seconds |
| NFR-004 | UI responsiveness | 60 FPS animations |

### 4.2 Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-005 | API error handling | Graceful degradation |
| NFR-006 | localStorage persistence | 100% data retention |
| NFR-007 | Session recovery | Resume after refresh |

### 4.3 Security

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-008 | API key protection | Server-side only |
| NFR-009 | Audio data handling | No permanent storage |
| NFR-010 | CORS configuration | Whitelist origins |

### 4.4 Usability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-011 | Microphone permission UX | Clear prompts |
| NFR-012 | Error messaging | User-friendly language |
| NFR-013 | Loading states | Visual feedback |

---

## 5. UI/UX Specifications

### 5.1 Design System Reference
All UI follows `docs/styleguide.md` specifications.

### 5.2 Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--color-background` | `#1a1a1a` | Page background |
| `--color-paper` | `#f5f5dc` | Content containers |
| `--color-paper-dark` | `#e8e8d0` | Paper shadows |
| `--color-ink` | `#2c2c2c` | Primary text |
| `--color-ink-light` | `#5c5c5c` | Secondary text |
| `--color-accent` | `#FFD400` | Primary actions, highlights |
| `--color-success` | `#4a7c4e` | Success states |
| `--color-warning` | `#c9a227` | Warning states |
| `--color-error` | `#8b3a3a` | Error states |

### 5.3 Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Headings | Inter Tight | 700 | 1.5-2.5rem |
| Body | Inter | 400 | 1rem |
| Labels | Inter | 500 | 0.875rem |
| Monospace | JetBrains Mono | 400 | 0.875rem |

### 5.4 Component Specifications

#### Paper Container
- Background: `var(--color-paper)`
- Border-radius: 4px
- Shadow: 4px 4px 0 `var(--color-paper-dark)`
- Padding: 24px (desktop), 16px (mobile)

#### Primary Button
- Background: `var(--color-accent)`
- Text: `var(--color-ink)`
- Border-radius: 4px
- Padding: 12px 24px
- Hover: Darken 10%

#### Score Badge
- Border-radius: 50%
- Size: 64px x 64px
- Background: Score-based color gradient
- Text: Bold, centered percentage

### 5.5 Layout

#### Desktop (>768px)
- Max content width: 1200px
- Sidebar for navigation (optional)
- Multi-column layouts where appropriate

#### Mobile (<768px)
- Full-width content
- Stacked layouts
- Touch-friendly targets (44px min)

---

## 6. API Specifications

### 6.1 Backend Endpoints

#### POST /api/stt/transcribe
**Request:**
```json
{
  "audio": "base64-encoded-audio",
  "model": "whisper" | "gpt-4o-transcribe" | "gpt-4o-mini-transcribe"
}
```

**Response:**
```json
{
  "transcript": "string",
  "duration": 5.2,
  "cost": 0.0312
}
```

#### POST /api/score/evaluate
**Request:**
```json
{
  "transcript": "user spoken text",
  "expected": "expected text",
  "model": "gpt-4o" | "gpt-5.2" | "gpt-5-nano" | "grok-4.1-fast",
  "difficulty": "easy" | "medium" | "hard",
  "parameters": {
    "werThreshold": 20,
    "fillerPenalty": 2,
    "maxFillers": 3,
    "pauseTolerance": 2
  }
}
```

**Response:**
```json
{
  "accuracy": {
    "score": 45,
    "details": "explanation"
  },
  "structure": {
    "score": 30,
    "details": "explanation"
  },
  "fluency": {
    "score": 18,
    "fillers": ["um", "uh"],
    "pauses": 1
  },
  "total": 93,
  "cost": 0.0025
}
```

#### GET /api/scenarios
**Response:**
```json
{
  "scenarios": [
    {
      "scenario_id": "REDCROSS_001",
      "series_id": "REDCROSS",
      "title": "Aircraft crash (Fuel Area)",
      "objectives": ["..."],
      "transmissions": [...]
    }
  ]
}
```

#### GET /api/scenarios/random?role=REDCROSS_1
**Response:**
```json
{
  "scenario": {
    "scenario_id": "REDCROSS_002",
    "...": "..."
  }
}
```

#### GET /api/roles
**Response:**
```json
{
  "roles": [
    { "callsign": "REDCROSS 1", "name": "Medical Response 1", "description": "..." },
    { "callsign": "BLUECROSS 1", "name": "Fire Response 1", "description": "..." }
  ]
}
```

#### GET /api/pricing
**Response:**
```json
{
  "openai": {
    "whisper": { "perMinute": 0.006 },
    "gpt-4o-transcribe": { "perMinute": 0.006 },
    "gpt-4o": { "input": 2.50, "output": 10.00 }
  },
  "grok": {
    "grok-4.1-fast": { "input": 0.20, "output": 0.50 }
  }
}
```

---

## 7. Data Models

### 7.1 Scenario
```typescript
interface Scenario {
  scenario_id: string;
  series_id: "REDCROSS" | "BLUECROSS" | "LOGIC" | "STALKER";
  title: string;
  objectives: string[];
  transmissions: Transmission[];
}
```

### 7.2 Transmission
```typescript
interface Transmission {
  seq: number;
  from: string;              // Sender callsign
  to: string | string[];     // Receiver callsign(s)
  message: string;
  location?: string;
  isPlayerTurn?: boolean;    // Computed based on selected role
}
```

### 7.3 Role
```typescript
interface Role {
  callsign: string;
  name: string;
  description: string;
  series: string[];          // Which scenario series this role appears in
}
```

### 7.4 LogEntry
```typescript
interface LogEntry {
  id: string;
  timestamp: Date;
  scenario: {
    id: string;
    title: string;
  };
  role: string;
  sttModel: string;
  scoringModel: string;
  difficulty: string;
  transmissions: TransmissionLog[];
  averageScore: number;
  totalCost: {
    stt: number;
    scoring: number;
    total: number;
  };
}
```

### 7.5 TransmissionLog
```typescript
interface TransmissionLog {
  seq: number;
  expected: string;
  transcript: string;
  scores: {
    accuracy: number;
    structure: number;
    fluency: number;
    total: number;
  };
  cost: {
    stt: number;
    scoring: number;
  };
  duration: number;
}
```

### 7.6 Parameters
```typescript
interface Parameters {
  difficulty: "easy" | "medium" | "hard";
  werThreshold: number;        // 0-100
  fillerPenalty: number;       // Points per filler
  maxFillers: number;          // Before penalty applies
  pauseTolerance: number;      // Seconds
  prompts: {
    accuracy: string;
    structure: string;
    fluency: string;
  };
}
```

---

## 8. Scoring System Details

### 8.1 Structure Score (30 points max)

**Required RT Format:**
```
[Receiver Callsign] [Sender Callsign] [Location (if applicable)] [Intent/Message]
```

**Scoring Breakdown:**
| Element | Points | Condition |
|---------|--------|-----------|
| Receiver First | 10 | Receiver callsign detected at start |
| Sender Second | 10 | Sender callsign follows receiver |
| Location | 5 | Location present when required by scenario |
| Intent | 5 | Message content is complete |

**Penalties:**
| Violation | Penalty |
|-----------|---------|
| Wrong callsign order | -10 per misplaced |
| Missing callsign | -10 per missing |
| Missing location (when required) | -5 |

### 8.2 Accuracy Score (50 points max)

**Easy Mode:**
- Semantic similarity evaluation
- Key information presence check
- Flexible phrasing accepted
- Scoring: 0-50 based on semantic match %

**Medium Mode:**
- Semantic similarity + key phrase matching
- Core meaning must match
- Some variation tolerated
- Scoring: Weighted combination

**Hard Mode:**
- Word Error Rate (WER) based scoring
- Exact word matching
- Minimal variation tolerance
- Scoring: (1 - WER) * 50

**Number Normalization (All Modes):**
- "1" = "One" = "ONE" = "one" (equivalent)
- "TWO-ZERO" = "20" = "two zero" (equivalent)
- Applied before comparison

### 8.3 Fluency Score (20 points max)

**Filler Words Detected:**
- "um", "uh", "like", "you know", "basically", "actually", "so", "well"

**Scoring Formula:**
```
fluencyScore = 20 - (fillerCount * fillerPenalty) - (pauseCount * pausePenalty)
fluencyScore = max(0, fluencyScore)  // Floor at 0
```

**Default Parameters:**
- Filler Penalty: 2 points
- Max Fillers Before Penalty: 0
- Pause Tolerance: 2 seconds
- Pause Penalty: 1 point

---

## 9. Cost Tracking

### 9.1 STT Costs (per minute of audio)

| Model | Cost/Minute |
|-------|-------------|
| Whisper | $0.006 |
| gpt-4o-transcribe | $0.006 |
| gpt-4o-mini-transcribe | $0.003 |

### 9.2 Scoring Costs (per 1M tokens)

| Model | Input | Output |
|-------|-------|--------|
| GPT-4o | $2.50 | $10.00 |
| GPT-5.2 | $1.75 | $14.00 |
| GPT-5-nano | $0.05 | $0.40 |
| Grok-4.1-fast | $0.20 | $0.50 |

### 9.3 Estimated Usage Per Evaluation
- Input tokens: ~500
- Output tokens: ~200

### 9.4 Cost Calculation
```javascript
sttCost = audioDurationMinutes * modelCostPerMinute
scoringCost = (inputTokens / 1_000_000 * inputPrice) +
              (outputTokens / 1_000_000 * outputPrice)
transmissionCost = sttCost + scoringCost
sessionCost = sum(transmissionCosts)
```

---

## 10. Roles Reference

### 10.1 Available Roles

| Callsign | Series | Description |
|----------|--------|-------------|
| SHEPHARD | All | Ground Control |
| REDCROSS 1 | REDCROSS | Medical Response Unit 1 |
| BLUECROSS 1 | BLUECROSS | Fire Response Unit 1 |
| LOGIC 1 | LOGIC | Security Unit 1 |
| STALKER 1 | STALKER | Platform/Maintenance Unit 1 |
| SPARTAN 1 | All | Aircraft/Emergency Reporter |
| GUARDIAN 1 | LOGIC | Security Support |
| EAGLE 1 | Various | Air Traffic |

### 10.2 Series Overview

| Series | Theme | Scenario Count |
|--------|-------|----------------|
| REDCROSS | Aircraft Emergencies | 5 |
| BLUECROSS | Domestic Emergencies | 5 |
| LOGIC | Security Incidents | 5 |
| STALKER | Platform/Maintenance | 5 |

---

## 11. Success Criteria

### 11.1 Functional Success
- [ ] User can select STT model, scoring model, and role
- [ ] Random scenario loads with player's transmissions highlighted
- [ ] Microphone recording works and sends audio to backend
- [ ] STT transcription returns accurate text
- [ ] Scoring evaluates Structure (strict callsigns), Accuracy, Fluency
- [ ] Difficulty levels affect accuracy scoring behavior
- [ ] NPC responses animate after player submission
- [ ] Progress through all player transmissions in scenario
- [ ] Final average score displayed
- [ ] Parameters adjustable and persisted
- [ ] All sessions logged with costs
- [ ] Cumulative cost tracking works
- [ ] REFRESH loads new scenario
- [ ] UI follows paper-on-dark style guide

### 11.2 Performance Success
- [ ] Page load < 3 seconds
- [ ] STT response < 10 seconds
- [ ] Scoring response < 5 seconds
- [ ] Smooth 60fps animations

### 11.3 Quality Success
- [ ] No critical bugs in core flow
- [ ] Graceful error handling
- [ ] Mobile-responsive layout
- [ ] Accessible UI (keyboard navigation, screen reader support)

---

## 12. Out of Scope (v1.0)

- Unity integration
- Multi-user sessions
- User authentication
- Cloud storage for logs
- Audio playback of recordings
- Voice synthesis for NPC responses
- Advanced analytics dashboard
- Custom scenario creation
- Leaderboards/competition features

---

## 13. Technical Architecture

### 13.1 Stack Overview

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TypeScript |
| Backend | Node.js + Express + TypeScript |
| External APIs | OpenAI (Whisper, GPT), Grok |
| Storage | Browser localStorage |
| Styling | CSS Custom Properties |

### 13.2 File Structure
See `tasks.md` for detailed file structure following FULLSTACK_FUNDAMENTALS_PLAYBOOK.md patterns.

---

## 14. References

- `docs/styleguide.md` - Design system specifications
- `docs/training_scenarios.json` - Scenario data
- `docs/raw_transcript.md` - Additional scenario data
- `docs/openai_pricing.md` - OpenAI pricing reference
- `docs/grok-pricing.md` - Grok pricing reference
- `docs/FULLSTACK_FUNDAMENTALS_PLAYBOOK.md` - Architecture patterns
- `docs/Transcript Template.md` - RT structure template

---

**Document History:**
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-14 | Dev Lead | Initial PRD creation |
