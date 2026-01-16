# RADStrat RT Training Prototype v1

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)

**A real-time Radio Telephony (RT) training application for airfield communications**

[Features](#features) • [Tech Stack](#tech-stack) • [Quick Start](#quick-start) • [Architecture](#architecture) • [API Reference](#api-reference)

</div>

---

## Overview

RADStrat is a prototype application designed to train users in proper Radio Telephony (RT) phraseology for airfield ground operations. Users practice transmissions by speaking into their microphone, receiving real-time transcription and scoring feedback based on structure, accuracy, and fluency.

### Key Capabilities

- **Speech-to-Text Training** - Record voice transmissions and receive instant transcription
- **Multi-dimensional Scoring** - Structure (30pts), Accuracy (50pts), Fluency (20pts)
- **Scenario-based Learning** - Tree-structured scenarios with multiple roles and transmission sequences
- **Cost Tracking** - Real-time API cost monitoring for STT and scoring operations
- **Session Persistence** - Progress saved across browser sessions

---

## Features

| Feature | Description |
|---------|-------------|
| **STT Test Tab** | Core training interface with audio recording, transcription display, and scoring breakdown |
| **Parameters Tab** | Configure STT model, scoring model, and difficulty level |
| **Logs Tab** | View session history, cost analytics, and export capabilities |
| **Real-time Feedback** | Immediate scoring with detailed breakdown and LLM-enhanced suggestions |

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| ![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=white) | 19.0 | UI Framework |
| ![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white) | 5.3 | Type Safety |
| ![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white) | 6.2 | Build Tool |
| ![Zustand](https://img.shields.io/badge/Zustand-5.0-orange?logo=npm&logoColor=white) | 5.0 | State Management |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| ![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white) | 18+ | Runtime |
| ![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white) | 4.21 | Web Framework |
| ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white) | 5.8 | Type Safety |

### AI/ML Services

| Service | Models | Purpose |
|---------|--------|---------|
| ![OpenAI](https://img.shields.io/badge/OpenAI-API-412991?logo=openai&logoColor=white) | `whisper-1`, `gpt-4o-transcribe`, `gpt-4o`, `gpt-4o-mini` | STT & Scoring |
| ![xAI](https://img.shields.io/badge/xAI-Grok-000000?logo=x&logoColor=white) | `grok-4.1-fast` | Alternative Scoring |

### Design

| Aspect | Details |
|--------|---------|
| **Theme** | Steampunk Dark |
| **Colors** | `#1a1814` (background), `#d4af37` (accent gold), `#c9a227` (accent yellow) |
| **Typography** | System fonts with monospace for data |

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key
- (Optional) xAI/Grok API key

### Installation

```bash
# Clone the repository
git clone https://github.com/DigitalxVault/RADStrat_STT_ProtoType_v1.git
cd RADStrat_STT_ProtoType_v1

# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install web dependencies
cd web && npm install && cd ..
```

### Configuration

```bash
# Copy environment templates
cp server/.env.example server/.env

# Edit server/.env with your API keys
OPENAI_API_KEY=sk-your-openai-key
XAI_API_KEY=xai-your-grok-key  # Optional
PORT=3000
```

### Running the Application

```bash
# Start both server and client (from root directory)
npm run dev

# Or start individually:
# Terminal 1 - Server
cd server && npm run dev

# Terminal 2 - Web Client
cd web && npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000

---

## Architecture

```
RADStrat ProtoType v1/
├── server/                    # Express.js backend
│   ├── src/
│   │   ├── clients/          # OpenAI & Grok API clients
│   │   ├── config/           # Configuration & pricing
│   │   ├── data/             # Scenario JSON data
│   │   ├── modules/
│   │   │   ├── health/       # Health check endpoint
│   │   │   ├── pricing/      # Pricing information
│   │   │   ├── scenarios/    # Scenario management
│   │   │   ├── scoring/      # Scoring engines
│   │   │   └── stt/          # Speech-to-text
│   │   └── types/            # TypeScript definitions
│   └── package.json
│
├── web/                       # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/       # Shared components
│   │   │   └── features/     # Tab components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # API client
│   │   ├── stores/           # Zustand stores
│   │   ├── styles/           # Global CSS
│   │   └── types/            # TypeScript definitions
│   └── package.json
│
├── docs/                      # Documentation
│   ├── RADStrat_RT_Rules.md  # RT phraseology rules
│   ├── styleguide.md         # UI design guide
│   └── *.md                  # OpenAI API docs
│
└── package.json              # Root package with scripts
```

### Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│   Express   │────▶│   OpenAI    │
│   (React)   │◀────│   Server    │◀────│   / Grok    │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │
      │                   ▼
      │           ┌─────────────┐
      │           │   Scoring   │
      │           │   Engines   │
      │           └─────────────┘
      ▼
┌─────────────┐
│   Zustand   │
│   Store     │
└─────────────┘
```

---

## Scoring System

### Score Components

| Component | Max Points | Description |
|-----------|------------|-------------|
| **Structure** | 30 | Correct receiver-sender-location-intent order |
| **Accuracy** | 50 | Word-level match with expected transmission |
| **Fluency** | 20 | Absence of fillers, corrections, hesitations |

### Difficulty Levels

| Level | WER Threshold | Filler Penalty | Description |
|-------|---------------|----------------|-------------|
| Easy | 0.50 | 1 | Lenient matching, minimal penalties |
| Medium | 0.30 | 2 | Balanced requirements |
| Hard | 0.15 | 3 | Strict matching, heavy penalties |

---

## API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health check |
| `GET` | `/api/scenarios` | List all scenarios |
| `GET` | `/api/scenarios/:id` | Get scenario by ID |
| `GET` | `/api/scenarios/role/:callsign` | Get random scenario for role |
| `GET` | `/api/roles` | List available roles |
| `POST` | `/api/stt/transcribe` | Transcribe audio file |
| `POST` | `/api/stt/score` | Score transcript against expected |
| `GET` | `/api/pricing` | Get current pricing information |

### Example: Transcribe Audio

```bash
curl -X POST http://localhost:3000/api/stt/transcribe \
  -F "audio=@recording.webm" \
  -F "model=whisper"
```

### Example: Score Transcript

```bash
curl -X POST http://localhost:3000/api/stt/score \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "SHEPHARD, REDCROSS 1, at Medical Bay, request clearance to proceed.",
    "expected": "SHEPHARD, REDCROSS 1, at Medical Bay, request clearance to proceed to Fuel Area.",
    "model": "gpt-4o",
    "difficulty": "medium",
    "context": {
      "expectedReceiver": "SHEPHARD",
      "expectedSender": "REDCROSS 1",
      "requiresLocation": true
    }
  }'
```

---

## Scenario Format (v2)

Scenarios use a tree-based structure for flexible dialogue paths:

```typescript
interface ScenarioTreeNode {
  scenarioId: number;
  id: number;
  message: string;              // Expected transmission
  source: "ATC" | "P";          // Who speaks
  source_callsign: string;      // Speaker callsign
  destination: "ATC" | "P" | null;
  destination_callsign: string | null;
  next_pos: number | null;      // Next node on success
  next_neg: number | null;      // Next node on failure (future)
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | - | OpenAI API key for STT & scoring |
| `XAI_API_KEY` | No | - | xAI/Grok API key for alternative scoring |
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | development | Environment mode |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- OpenAI for Whisper and GPT models
- xAI for Grok models
- Radio Telephony standards from aviation authorities

---

<div align="center">

**Built with focus on realistic RT training**

[Report Bug](https://github.com/DigitalxVault/RADStrat_STT_ProtoType_v1/issues) • [Request Feature](https://github.com/DigitalxVault/RADStrat_STT_ProtoType_v1/issues)

</div>
