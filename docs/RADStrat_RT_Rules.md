# RADStrat — RT Phraseology Rules (Consolidated)

This document consolidates the RT rules RADStrat should enforce and the transcript examples should follow.

---

## 1) Core Transmission Structure (Default)

**Standard format (most calls):**  
`<RECEIVER CALLSIGN>, <SENDER CALLSIGN>, <LOCATION>, <INTENT / REQUEST / INSTRUCTION + KEY DETAILS>.`

**Rules**
- **Receiver first**, then **sender**.
- Include **location** (or “holding at … / at …”) when relevant.
- One clear intent per transmission where possible.
- Use **standard RT words** (Section 4) and avoid casual speech.

---

## 2) Movement Control: Requests & Instructions

### 2.1 Request patterns (vehicle/ground units)
Use one of these structures:

- **Proceed request (with route):**  
  `SHEPHARD, REDCROSS 1, at <START>, request clearance to proceed to <DEST> via <ROUTE>.`

- **Crossing request (runway/taxiway):**  
  `SHEPHARD, STALKER 2, holding at <HOLDING POINT>, request to cross <RUNWAY/TAXIWAY>.`

- **Position report (when required):**  
  `SHEPHARD, SAFETY VEHICLE 1, holding at <LOCATION>.`

### 2.2 Controller instruction patterns (accepted in RADStrat)
Controller may issue:

- `Proceed to <POINT> via <ROUTE>.`
- `Hold position.`
- `Hold short of <RUNWAY/TAXIWAY>.`
- `Cross Runway <DESIGNATOR>.`
- `Report vacated / Report runway vacated.`

---

## 3) Readback Discipline (Mandatory Items)

When an instruction includes critical movement control, the receiving unit must **read back** the **core action + critical identifier**.

**Mandatory readback items**
- **HOLD SHORT** of a runway/taxiway
- **CROSS** a runway (include the runway designator)
- **PROCEED** to a holding point / via a route (include key route/point)
- **VACATE / REPORT VACATED** (include runway and exit/taxiway if stated)

**Readback pattern**
- Controller: `Hold short of Runway ONE-SEVEN.`
- Vehicle: `Holding short of Runway ONE-SEVEN.`

---

## 4) Standard RT Vocabulary (Use / Avoid)

### 4.1 Use (preferred)
- **Acknowledge / comply:** `ROGER`, `WILCO`
- **Yes / No:** `AFFIRM`, `NEGATIVE`
- **Wait:** `STANDBY`
- **Repeat:** `SAY AGAIN`
- **Cannot comply:** `UNABLE` (+ reason if useful)
- **Fix a mistake:** `CORRECTION ...` then restate

### 4.2 Avoid (non-standard for RADStrat ground RT context)
Avoid casual fillers and discouraged terms such as:
- `OVER`, `OUT`, `BREAK`, `BREAK BREAK`, `WORDS TWICE`
- Vague speech: “okay okay”, “I think”, “maybe”, “you know”, “like…”

---

## 5) Letters, Numbers, and Identifiers

**Rules**
- Use **NATO phonetic alphabet** when spelling (ALPHA, BRAVO, CHARLIE…).
- Speak **runway/taxiway/route identifiers clearly and consistently** (e.g., “Runway ONE-SEVEN”, “Taxiway ALPHA”).
- Separate numbers from surrounding words with a slight pause.

---

## 6) Broadcast Mode (When Prompted)

Broadcasts are **not** the default “receiver/sender” format.

**Broadcast pattern**
1. `Standby for broadcast.` (may be repeated)
2. `<broadcast information>`
3. `End of broadcast.`

**Rule**
- Units should **not transmit** during “standby for broadcast”.

---

## 7) Handling Unclear / Incorrect Situations

If you did not hear, are unsure, or cannot comply:
- `SAY AGAIN last instruction.`
- `CONFIRM <specific item>.`
- `UNABLE <reason>.`
- `CORRECTION ... <restated message>.`

---

## 8) Transcript Normalization Notes (For Scoring)

To avoid penalizing STT artifacts, RADStrat scoring should:
- Normalize punctuation/casing
- Handle common variants (e.g., “stand by” vs “standby”)
- Accept minor re-ordering that preserves meaning (unless structure/readback is required)

---

# Example Transcripts (Gold-Standard)

## Scenario A — Proceed request + routing + hold
**Intent:** Ambulance (REDCROSS 1) requests to proceed; controller routes and issues hold; unit reads back.

1. **REDCROSS 1:**  
   `SHEPHARD, REDCROSS 1, at Medical Bay, request clearance to proceed to Fuel Area via Service Road ONE.`

2. **SHEPHARD:**  
   `REDCROSS 1, SHEPHARD, proceed via Service Road ONE, hold short of Taxiway ALPHA.`

3. **REDCROSS 1 (readback):**  
   `SHEPHARD, REDCROSS 1, proceeding via Service Road ONE, holding short of Taxiway ALPHA.`

4. **SHEPHARD:**  
   `REDCROSS 1, SHEPHARD, ROGER, report when holding at Taxiway ALPHA.`

5. **REDCROSS 1:**  
   `SHEPHARD, REDCROSS 1, holding at Taxiway ALPHA.`

---

## Scenario B — Runway crossing request + clearance + vacated report
**Intent:** Maintenance vehicle requests to cross runway; controller clears; vehicle reads back and reports vacated.

1. **STALKER 2:**  
   `SHEPHARD, STALKER 2, holding at Holding Point ALPHA, request to cross Runway ONE-SEVEN.`

2. **SHEPHARD:**  
   `STALKER 2, SHEPHARD, cross Runway ONE-SEVEN, then proceed to Dispersal THREE via Taxiway ALPHA.`

3. **STALKER 2 (readback):**  
   `SHEPHARD, STALKER 2, crossing Runway ONE-SEVEN, then proceeding to Dispersal THREE via Taxiway ALPHA.`

4. **SHEPHARD:**  
   `STALKER 2, SHEPHARD, ROGER, report runway vacated.`

5. **STALKER 2:**  
   `SHEPHARD, STALKER 2, runway vacated via Taxiway ALPHA.`

---

## Scenario C — Safety pause + multi-role coordination
**Intent:** A conducting party pauses an activity; safety vehicle coordinates; controller is informed.

1. **CONDUCTING:**  
   `SAFETY VEHICLE 1, CONDUCTING, at Training Pad SIERRA, request confirmation to activate roping lane and commence serial ONE.`

2. **SAFETY VEHICLE 1:**  
   `CONDUCTING, SAFETY VEHICLE 1, lane inspected and clear, serial ONE approved, maintain comms and report any unsafe condition.`

3. **CONDUCTING (readback of approval):**  
   `SAFETY VEHICLE 1, CONDUCTING, ROGER, commencing serial ONE, will report.`

4. **CONDUCTING:**  
   `SAFETY VEHICLE 1, CONDUCTING, observed hazard near boundary, request pause serial ONE and hold personnel.`

5. **SAFETY VEHICLE 1:**  
   `CONDUCTING, SAFETY VEHICLE 1, pause approved, hold all personnel, acknowledge when secured.`

6. **CONDUCTING (readback):**  
   `SAFETY VEHICLE 1, CONDUCTING, holding all personnel, will report when secured.`

7. **CONDUCTING (after secured):**  
   `SAFETY VEHICLE 1, CONDUCTING, personnel secured, serial ONE paused.`

8. **SAFETY VEHICLE 1 (inform controller if required):**  
   `SHEPHARD, SAFETY VEHICLE 1, at Training Pad SIERRA, serial ONE paused, personnel secured.`

---

## Scenario D — Broadcast discipline (standby + end of broadcast)
**Intent:** Controller issues a broadcast; units remain silent until end.

1. **SHEPHARD (broadcast):**  
   `All stations, SHEPHARD, standby for broadcast. Standby for broadcast.`

2. **SHEPHARD (broadcast):**  
   `All stations, movement restriction active adjacent Fuel Area, use Service Road ONE until further notice. End of broadcast.`

3. **REDCROSS 1 (after broadcast ends):**  
   `SHEPHARD, REDCROSS 1, at Medical Bay, request clearance to proceed to Fuel Area via Service Road ONE.`

---

## Scenario E — Correction / say again usage
**Intent:** Unit corrects itself; asks to repeat when unclear.

1. **STALKER 3:**  
   `SHEPHARD, STALKER 3, at Taxiway— CORRECTION, at Service Road TWO, request proceed to Hangar ONE.`

2. **SHEPHARD:**  
   `STALKER 3, SHEPHARD, say again your current location.`

3. **STALKER 3:**  
   `SHEPHARD, STALKER 3, at Service Road TWO.`

4. **SHEPHARD:**  
   `STALKER 3, SHEPHARD, proceed to Hangar ONE via Service Road TWO.`

5. **STALKER 3 (readback):**
   `SHEPHARD, STALKER 3, proceeding to Hangar ONE via Service Road TWO.`

---

# Scenario Data Format (v2.0)

This section documents the tree-based scenario data structure used in RADStrat v2.

## Overview

Scenarios are stored as tree-based structures where each transmission is a node linked to the next via `next_pos` (positive/continue) and `next_neg` (negative/branch) pointers. This enables future support for branching dialogue paths based on player responses.

## Data Location

**File**: `server/src/data/scenarios_v2.json`

## Data Structure

### Root Structure

```typescript
interface ScenariosV2Data {
  version: string;           // Format version (e.g., "2.0")
  generated: string;         // ISO timestamp when generated
  scenarios: ScenarioV2[];   // Array of all scenarios
}
```

### Scenario Structure

```typescript
interface ScenarioV2 {
  id: number;                // Numeric scenario ID (1-based)
  scenario_id: string;       // Original string ID (e.g., "redcross_1")
  series_id: SeriesId;       // Series: "REDCROSS" | "BLUECROSS" | "LOGIC" | "STALKER"
  title: string;             // Human-readable title
  description: string;       // Brief description
  objectives: string[];      // Learning objectives
  start_node: number;        // ID of the first node
  nodes: ScenarioTreeNode[]; // All nodes in this scenario
}
```

### Node Structure

```typescript
interface ScenarioTreeNode {
  scenarioId: number;              // Parent scenario ID
  id: number;                      // Unique node ID within scenario (1-based)
  message: string;                 // RT message content (model answer)
  source: "ATC" | "P";             // Source type
  source_callsign: string;         // Original callsign (e.g., "REDCROSS 1")
  source_n: number;                // Instance number (0 for SHEPHARD)
  destination: "ATC" | "P" | null; // Target type (null for broadcasts)
  destination_callsign: string | null;  // Target callsign
  destination_n: number | null;    // Target instance number
  next_pos: number | null;         // Next node ID for positive advancement
  next_neg: number | null;         // Next node ID for negative advancement (branching)
}
```

## Callsign Mapping

| Callsign | source/destination | source_n/destination_n |
|----------|-------------------|------------------------|
| SHEPHARD | "ATC" | 0 |
| REDCROSS 1 | "P" | 1 |
| REDCROSS 2 | "P" | 2 |
| TENDER 1 | "P" | 1 |
| SPARTAN 1 | "P" | 1 |
| LOGIC 1 | "P" | 1 |
| STALKER 1 | "P" | 1 |
| STALKER 2 | "P" | 2 |

## Example Node

```json
{
  "scenarioId": 1,
  "id": 1,
  "message": "SHEPHARD, SPARTAN 1, at Command Post, aircraft crash reported at Fuel Area, request activation of REDCROSS and TENDER support.",
  "source": "P",
  "source_callsign": "SPARTAN 1",
  "source_n": 1,
  "destination": "ATC",
  "destination_callsign": "SHEPHARD",
  "destination_n": 0,
  "next_pos": 2,
  "next_neg": null
}
```

## Player Turn Identification

A node is a player turn when `source_callsign` matches the selected player role:

```typescript
const isPlayerTurn = node.source_callsign.toUpperCase() === playerCallsign.toUpperCase();
```

## Navigation

### Linear Advancement (Current)
- Follow `next_pos` to advance through the scenario
- `next_pos = null` indicates end of scenario

### Branching (Future)
- `next_neg` reserved for alternative paths (e.g., incorrect responses)
- Currently all `next_neg = null` (linear paths only)

## Broadcasts

When a transmission is a broadcast (no specific receiver):
- `destination = null`
- `destination_callsign = null`
- `destination_n = null`

---
