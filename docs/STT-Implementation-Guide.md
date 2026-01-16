# STT Implementation Guide - Working Patterns from RADStrat Console

> **Purpose**: This document captures the working STT (Speech-to-Text) implementation patterns from the RADStrat Admin Dashboard. Share this with developers experiencing issues with speech recognition, state management, or audio processing.

---

## Issues This Guide Addresses

1. **No costs calculated** → See Section 7
2. **State resets on tab switch** → See Section 5
3. **Wrong language output** → See Section 2.2
4. **"listener indicates synchronous response... message channel closed"** → See Section 3.3
5. **Recording not chunking in real-time** → See Section 4
6. **No microphone permission prompt** → See Section 3.1

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React)                             │
│                   useSTTSession Hook                             │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ 1. Request ephemeral token
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Express)                             │
│              POST /api/webrtc/session                            │
│           (VAD config, token generation)                         │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ 2. Creates session with OpenAI
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              OpenAI Realtime API                                 │
│     POST /v1/realtime/transcription_sessions                     │
│     (Returns ephemeral token + session_id)                       │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ 3. Returns token to frontend
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              Frontend WebSocket Connection                       │
│  wss://api.openai.com/v1/realtime?intent=transcription           │
│  Auth via subprotocol: openai-insecure-api-key.[token]          │
└─────────────────────────────────────────────────────────────────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
            ▼             ▼             ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ getUserMedia │ │ AudioContext │ │ ScriptProc   │
    │ (24kHz mono) │ │ Resample     │ │ PCM16 encode │
    └──────────────┘ └──────────────┘ └──────────────┘
                          │
                          │ Base64 audio chunks
                          ▼
        input_audio_buffer.append (WebSocket message)
                          │
                    Server-side VAD
                          │
            ┌─────────────┬─────────────┐
            ▼             ▼             ▼
   speech_started  speech_stopped  buffer.committed
                          │
        transcription.delta (interim) → gray text
                          │
        transcription.completed (final) → black text
                          │
                          ▼
              POST /api/evaluator/score
                          │
                          ▼
                    ScoreResult
```

---

## 2. Server-Side: Token Generation & Language Enforcement

### 2.1 Backend Route (Express)

**File**: `apps/server/src/routes/webrtcSession.ts`

```typescript
import express from 'express';

const router = express.Router();

router.post('/', async (req, res) => {
  const startTime = Date.now();

  // VAD settings from request or defaults
  const vad = {
    threshold: req.body?.vad?.threshold ?? 0.3,        // 0.0-1.0
    prefixPaddingMs: req.body?.vad?.prefixPaddingMs ?? 500,
    silenceDurationMs: req.body?.vad?.silenceDurationMs ?? 2000,
  };

  try {
    const fetchRes = await fetch('https://api.openai.com/v1/realtime/transcription_sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio: {
          input: {
            format: {
              type: 'audio/pcm',
              rate: 24000  // CRITICAL: Must be 24kHz
            },
            transcription: {
              model: 'gpt-4o-transcribe',
              language: 'en'  // ← HARDCODE ENGLISH HERE
            },
            turn_detection: {
              type: 'server_vad',
              threshold: vad.threshold,
              prefix_padding_ms: vad.prefixPaddingMs,
              silence_duration_ms: vad.silenceDurationMs
            },
            noise_reduction: {
              type: 'near_field'  // Optimized for close microphone
            }
          }
        }
      }),
    });

    if (!fetchRes.ok) {
      const errorText = await fetchRes.text();
      console.error('OpenAI API error:', fetchRes.status, errorText);
      return res.status(fetchRes.status).json({ error: 'Failed to create session', details: errorText });
    }

    const sessionData = await fetchRes.json();
    const latencyMs = Date.now() - startTime;

    console.log(`Token created in ${latencyMs}ms, sessionId: ${sessionData.id}`);

    // Return mapped response to frontend
    res.json({
      sessionId: sessionData.id,
      clientSecret: sessionData.client_secret?.value || sessionData.client_secret,
      expiresAt: sessionData.client_secret?.expires_at,
      model: sessionData.model
    });
  } catch (err) {
    console.error('Token generation failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### 2.2 FIX: Wrong Language Output

**Problem**: Transcription returns non-English text.

**Solution**: Hardcode `language: 'en'` in the server-side session config:

```typescript
transcription: {
  model: 'gpt-4o-transcribe',
  language: 'en'  // ← THIS IS CRITICAL - Forces English output
}
```

**Why server-side?** The language setting must be sent when creating the ephemeral token, not from the frontend. The frontend only receives and uses the token.

---

## 3. Frontend: Microphone & WebSocket Connection

### 3.1 FIX: No Microphone Permission Prompt

**Problem**: Browser doesn't ask for microphone permission.

**Root Cause**: `getUserMedia()` not being called, or called with wrong constraints.

**Working Pattern**:

```typescript
// Step 1: Request microphone with SPECIFIC constraints
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    channelCount: 1,           // Mono audio
    echoCancellation: true,    // Browser noise processing
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 24000          // OpenAI expects 24kHz
  }
});

// Step 2: Log actual settings (helpful for debugging)
const audioTrack = stream.getAudioTracks()[0];
const settings = audioTrack.getSettings();
console.log('Microphone settings:', {
  deviceId: settings.deviceId,
  sampleRate: settings.sampleRate,
  channelCount: settings.channelCount
});
```

**Common Mistakes**:
- Not awaiting `getUserMedia()`
- Calling it in a non-user-gesture context (some browsers block this)
- Not handling the permission denial error
- Using `audio: true` without specific constraints

### 3.2 WebSocket Connection Pattern

```typescript
const connectWebSocket = async (clientSecret: string): Promise<WebSocket> => {
  const wsUrl = 'wss://api.openai.com/v1/realtime?intent=transcription';

  // Auth via WebSocket subprotocol (NOT headers!)
  const ws = new WebSocket(wsUrl, [
    'realtime',
    `openai-insecure-api-key.${clientSecret}`
  ]);

  // CRITICAL: Wait for BOTH open AND session.created
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('WebSocket connection timeout'));
    }, 15000);

    let wsOpened = false;

    ws.onopen = () => {
      console.log('WebSocket connected, waiting for session.created...');
      wsOpened = true;
    };

    ws.onmessage = (e) => {
      const event = JSON.parse(e.data);
      // OpenAI sends 'transcription_session.created' or 'session.created'
      if (event.type === 'transcription_session.created' || event.type === 'session.created') {
        clearTimeout(timeout);
        console.log('Session ready!');
        resolve(ws);
      }
    };

    ws.onerror = (err) => {
      clearTimeout(timeout);
      reject(err);
    };

    ws.onclose = (e) => {
      if (!wsOpened) {
        clearTimeout(timeout);
        reject(new Error(`WebSocket closed: ${e.code} ${e.reason}`));
      }
    };
  });
};
```

### 3.3 FIX: "listener indicates synchronous response... message channel closed"

**Problem**: This Chrome extension error appears when WebSocket closes unexpectedly.

**Common Causes**:
1. Sending audio BEFORE session is ready
2. Invalid audio format (not PCM16 24kHz)
3. Token expired or invalid

**Solution - Use a Session Ready Flag**:

```typescript
// Module-level ref to track session readiness
const sessionReadyRef = useRef(false);

// In WebSocket message handler:
ws.onmessage = (e) => {
  const event = JSON.parse(e.data);
  if (event.type === 'session.created' || event.type === 'transcription_session.created') {
    sessionReadyRef.current = true;  // ← NOW safe to send audio
  }
};

// In audio processing callback:
scriptProcessor.onaudioprocess = (e) => {
  // CRITICAL: Don't send audio until session is confirmed ready
  if (!sessionReadyRef.current) {
    console.log('Skipping audio - session not ready');
    return;
  }

  // ... process and send audio
};
```

---

## 4. FIX: Real-Time Audio Chunking

### 4.1 Problem: Recording Not Sending Chunks

**Symptoms**:
- Recording starts but nothing transcribes
- No audio data reaching OpenAI
- Long silence then maybe partial result

**Root Cause**: Not using `ScriptProcessorNode` or `AudioWorklet` for continuous streaming.

### 4.2 Working Audio Capture Pattern

```typescript
const setupAudioCapture = async (ws: WebSocket, stream: MediaStream) => {
  const audioContext = new AudioContext();
  const actualSampleRate = audioContext.sampleRate; // Usually 48000

  const TARGET_SAMPLE_RATE = 24000;
  const resampleRatio = TARGET_SAMPLE_RATE / actualSampleRate;

  // Create source from microphone stream
  const sourceNode = audioContext.createMediaStreamSource(stream);

  // ScriptProcessor for continuous audio access
  // Buffer size: 4096 samples = ~85ms at 48kHz
  const bufferSize = 4096;
  const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);

  let chunkCount = 0;

  scriptProcessor.onaudioprocess = (e) => {
    // Guard: Only process when recording AND session ready
    if (!isRecordingRef.current || ws.readyState !== WebSocket.OPEN) {
      return;
    }
    if (!sessionReadyRef.current) {
      return;  // Wait for session.created
    }

    const inputData = e.inputBuffer.getChannelData(0);

    // ═══════════════════════════════════════════════════════════
    // STEP 1: Resample from 48kHz to 24kHz (linear interpolation)
    // ═══════════════════════════════════════════════════════════
    const targetLength = Math.round(inputData.length * resampleRatio);
    const resampled = new Float32Array(targetLength);

    for (let i = 0; i < targetLength; i++) {
      const srcIdx = i / resampleRatio;
      const srcIdxFloor = Math.floor(srcIdx);
      const srcIdxCeil = Math.min(srcIdxFloor + 1, inputData.length - 1);
      const t = srcIdx - srcIdxFloor;
      // Linear interpolation
      resampled[i] = inputData[srcIdxFloor] * (1 - t) + inputData[srcIdxCeil] * t;
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Convert Float32 [-1,1] to Int16 PCM (little-endian)
    // ═══════════════════════════════════════════════════════════
    const pcm16Bytes = new Uint8Array(resampled.length * 2);
    const dataView = new DataView(pcm16Bytes.buffer);

    for (let i = 0; i < resampled.length; i++) {
      const s = Math.max(-1, Math.min(1, resampled[i]));  // Clamp
      const sample = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7FFF);
      dataView.setInt16(i * 2, sample, true);  // true = little-endian
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Base64 encode (chunked to avoid stack overflow)
    // ═══════════════════════════════════════════════════════════
    let binaryString = '';
    const chunkSize = 8192;
    for (let i = 0; i < pcm16Bytes.length; i += chunkSize) {
      const chunk = pcm16Bytes.subarray(i, Math.min(i + chunkSize, pcm16Bytes.length));
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64Audio = btoa(binaryString);

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Send to OpenAI
    // ═══════════════════════════════════════════════════════════
    chunkCount++;
    const payload = JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: base64Audio
    });

    try {
      ws.send(payload);
      if (chunkCount <= 5 || chunkCount % 30 === 0) {
        console.log(`Sent chunk #${chunkCount}: ${payload.length} bytes`);
      }
    } catch (err) {
      console.error('Failed to send audio chunk:', err);
    }
  };

  // CRITICAL: Connect both source AND destination
  sourceNode.connect(scriptProcessor);
  scriptProcessor.connect(audioContext.destination);  // Required for processing!

  return { audioContext, scriptProcessor, sourceNode };
};
```

### 4.3 Key Points

| Aspect | Value | Why |
|--------|-------|-----|
| **Sample Rate** | 24000 Hz | OpenAI requirement |
| **Format** | PCM16 little-endian | OpenAI requirement |
| **Buffer Size** | 4096 samples | ~85ms chunks, good balance |
| **Encoding** | Base64 | JSON transport |
| **Message Type** | `input_audio_buffer.append` | OpenAI protocol |

---

## 5. FIX: State Resetting on Tab Switch

### 5.1 Problem

User records, gets transcript & score, switches to another tab, comes back → everything is gone.

### 5.2 Solution: sessionStorage with Page Load Detection

```typescript
// ═══════════════════════════════════════════════════════════
// Module-level flag to detect browser refresh vs React navigation
// ═══════════════════════════════════════════════════════════
let isFirstPageLoad = true;

const STORAGE_KEY_TRANSCRIPT = 'stt-current-transcript';
const STORAGE_KEY_SCORE = 'stt-current-score';

function useSTTSession() {
  // ═══════════════════════════════════════════════════════════
  // Initialize state from sessionStorage (but clear on refresh)
  // ═══════════════════════════════════════════════════════════
  const [finalTranscript, setFinalTranscript] = useState<string>(() => {
    if (isFirstPageLoad) {
      // Browser refresh - clear old data
      try {
        sessionStorage.removeItem(STORAGE_KEY_TRANSCRIPT);
        sessionStorage.removeItem(STORAGE_KEY_SCORE);
      } catch { /* ignore */ }
      return '';
    }
    // Tab navigation - restore from storage
    try {
      return sessionStorage.getItem(STORAGE_KEY_TRANSCRIPT) || '';
    } catch {
      return '';
    }
  });

  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(() => {
    if (isFirstPageLoad) return null;
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_SCORE);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // ═══════════════════════════════════════════════════════════
  // Mark first page load as complete after initial render
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    isFirstPageLoad = false;
  }, []);

  // ═══════════════════════════════════════════════════════════
  // Persist to sessionStorage on every change
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    try {
      if (finalTranscript) {
        sessionStorage.setItem(STORAGE_KEY_TRANSCRIPT, finalTranscript);
      }
    } catch { /* ignore */ }
  }, [finalTranscript]);

  useEffect(() => {
    try {
      if (scoreResult) {
        sessionStorage.setItem(STORAGE_KEY_SCORE, JSON.stringify(scoreResult));
      }
    } catch { /* ignore */ }
  }, [scoreResult]);

  // ... rest of hook
}
```

### 5.3 Why This Works

| Scenario | `isFirstPageLoad` | Behavior |
|----------|-------------------|----------|
| Browser refresh (F5) | `true` (module reloads) | Clear sessionStorage, start fresh |
| Tab navigation | `false` (module stays) | Restore from sessionStorage |
| New browser tab | `true` (new module) | Start fresh |
| Close & reopen browser | `true` + empty storage | Start fresh |

### 5.4 Storage Strategy Summary

| Data | Storage | Persistence |
|------|---------|-------------|
| Current transcript | `sessionStorage` | Survives tab navigation, cleared on refresh |
| Current score | `sessionStorage` | Survives tab navigation, cleared on refresh |
| User profiles | `localStorage` | Permanent |
| Test history | `localStorage` | Permanent |

---

## 6. Handling Transcription Events

### 6.1 Event Types from OpenAI

```typescript
ws.onmessage = (e) => {
  const event = JSON.parse(e.data);

  switch (event.type) {
    // ═══════════════════════════════════════════════════════
    // Session lifecycle
    // ═══════════════════════════════════════════════════════
    case 'session.created':
    case 'transcription_session.created':
      console.log('Session ready');
      sessionReadyRef.current = true;
      break;

    // ═══════════════════════════════════════════════════════
    // VAD (Voice Activity Detection) events
    // ═══════════════════════════════════════════════════════
    case 'input_audio_buffer.speech_started':
      console.log('Speech detected');
      break;

    case 'input_audio_buffer.speech_stopped':
      console.log('Speech stopped - VAD will auto-commit');
      break;

    case 'input_audio_buffer.committed':
      console.log('Audio buffer committed, item_id:', event.item_id);
      break;

    // ═══════════════════════════════════════════════════════
    // Transcription results
    // ═══════════════════════════════════════════════════════
    case 'conversation.item.input_audio_transcription.delta':
      // Interim result - show in gray/muted text
      if (event.delta) {
        setInterimTranscript(prev => prev + event.delta);
      }
      break;

    case 'conversation.item.input_audio_transcription.completed':
      // Final result for this speech segment
      console.log('Final transcript:', event.transcript);
      if (event.transcript) {
        // Append to accumulated transcript
        setFinalTranscript(prev => {
          const updated = prev ? prev + ' ' + event.transcript : event.transcript;
          finalTranscriptRef.current = updated;  // Sync ref immediately
          return updated;
        });
        setInterimTranscript('');  // Clear interim
      }
      break;

    // ═══════════════════════════════════════════════════════
    // Errors
    // ═══════════════════════════════════════════════════════
    case 'error':
      const errorCode = event.error?.code;
      if (errorCode === 'input_audio_buffer_commit_empty') {
        // Safe to ignore - VAD already committed the buffer
        console.log('Ignoring empty buffer commit (VAD handled it)');
      } else {
        console.error('WebSocket error:', event.error);
        setError(event.error?.message || 'Unknown error');
      }
      break;
  }
};
```

### 6.2 Critical: Use Refs for Synchronous Access

**Problem**: React state is async, but `stopSession()` needs the latest transcript immediately.

**Solution**: Keep state AND ref in sync:

```typescript
const finalTranscriptRef = useRef<string>('');

// When updating state, also update ref FIRST (synchronously)
case 'conversation.item.input_audio_transcription.completed':
  if (event.transcript) {
    const updated = finalTranscript + ' ' + event.transcript;
    finalTranscriptRef.current = updated;  // ← SYNC (immediate)
    setFinalTranscript(updated);            // ← ASYNC (batched)
  }
  break;

// In stopSession, read from ref (always current)
const stopSession = async () => {
  // ... stop recording logic

  const transcript = finalTranscriptRef.current.trim();  // ← Always fresh
  if (transcript) {
    await scoreTranscript(transcript, question, profile);
  }
};
```

---

## 7. FIX: Cost Calculation

### 7.1 Simple Cost Formula

```typescript
function calculateCost(audioDurationMs: number): number {
  // OpenAI Realtime transcription: ~$0.006 per minute
  const minutes = audioDurationMs / 60000;
  const transcriptionCost = minutes * 0.006;

  // Evaluator (GPT-4o-mini): ~$0.001 per evaluation
  const evaluatorCost = 0.001;

  return transcriptionCost + evaluatorCost;
}
```

### 7.2 Track Audio Duration

```typescript
const startTimeRef = useRef<number>(0);

const startSession = () => {
  startTimeRef.current = Date.now();
  // ... start recording
};

const stopSession = () => {
  const audioDurationMs = Date.now() - startTimeRef.current;
  const cost = calculateCost(audioDurationMs);

  setTelemetry(prev => ({
    ...prev,
    audioDurationMs,
    estimatedCost: cost
  }));
};
```

### 7.3 Display in UI

```tsx
<div className="cost-display">
  Cost: ${telemetry.estimatedCost.toFixed(4)}
</div>
```

---

## 8. Complete Flow Summary

```
1. USER CLICKS "TALK"
   ↓
2. POST /api/webrtc/session → Get ephemeral token
   ↓
3. getUserMedia() → Browser asks for mic permission
   ↓
4. new WebSocket(url, [subprotocols]) → Connect to OpenAI
   ↓
5. Wait for 'session.created' event → sessionReadyRef = true
   ↓
6. ScriptProcessor.onaudioprocess fires every ~85ms
   ├─ Check: sessionReadyRef.current === true?
   ├─ Resample: 48kHz → 24kHz
   ├─ Encode: Float32 → PCM16 → Base64
   └─ Send: { type: 'input_audio_buffer.append', audio }
   ↓
7. OpenAI server-side VAD detects speech
   ├─ 'input_audio_buffer.speech_started'
   ├─ 'input_audio_buffer.speech_stopped'
   └─ 'input_audio_buffer.committed'
   ↓
8. Transcription results arrive
   ├─ 'transcription.delta' → Update interim (gray text)
   └─ 'transcription.completed' → Update final (black text)
   ↓
9. USER CLICKS "STOP"
   ↓
10. Calculate cost from audioDurationMs
    ↓
11. POST /api/evaluator/score → LLM evaluates transcript
    ↓
12. Display score + persist to sessionStorage
```

---

## 9. Debugging Checklist

### Audio Issues
- [ ] Is `getUserMedia()` being called with explicit constraints?
- [ ] Is the browser actually prompting for permission?
- [ ] Check `audioTrack.getSettings()` - is sampleRate 24000 or 48000?
- [ ] Is resampling happening if native rate ≠ 24000?
- [ ] Is ScriptProcessor connected to BOTH source AND destination?

### WebSocket Issues
- [ ] Is token valid and not expired?
- [ ] Are you using subprotocol auth: `openai-insecure-api-key.${token}`?
- [ ] Are you waiting for `session.created` before sending audio?
- [ ] Check `ws.readyState` before each send

### Transcription Issues
- [ ] Is `language: 'en'` set in server-side config?
- [ ] Is audio format PCM16 little-endian at 24kHz?
- [ ] Are chunks being sent continuously (check console logs)?
- [ ] Is server VAD configured (not client VAD)?

### State Issues
- [ ] Using sessionStorage (not localStorage) for session data?
- [ ] Is `isFirstPageLoad` flag implemented?
- [ ] Are refs synced before state updates?

---

## 10. Key Files Reference

| File | Purpose |
|------|---------|
| `apps/server/src/routes/webrtcSession.ts` | Token generation, VAD config, language setting |
| `apps/web/src/hooks/useSTTSession.ts` | Main STT logic, audio capture, WebSocket handling |
| `apps/web/src/pages/STTTest.tsx` | UI, recording button, state display |
| `apps/web/src/components/TranscriptDisplay.tsx` | Shows interim/final transcript |
| `apps/web/src/components/ScoreDisplay.tsx` | Shows evaluation scores |

---

*Generated from RADStrat Admin Dashboard codebase - a working OpenAI Realtime STT implementation.*
