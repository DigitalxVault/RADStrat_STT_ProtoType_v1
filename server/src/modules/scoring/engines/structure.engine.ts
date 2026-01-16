/**
 * Structure Scoring Engine
 * Evaluates RT communication structure compliance (30% of total score)
 * STRICT: Callsign placement must be exact [Receiver][Sender][Location][Intent]
 */

export interface StructureScoreResult {
  score: number; // 0-30
  receiverCorrect: boolean;
  senderCorrect: boolean;
  locationPresent: boolean;
  intentComplete: boolean;
  detectedOrder: string[];
  explanation: string;
}

export interface StructureContext {
  expectedReceiver: string;
  expectedSender: string;
  requiresLocation: boolean;
}

// Common callsign patterns for RT communications
const CALLSIGN_PATTERNS = [
  /^(SHEPHARD|SHEPHERD)/i,
  /^(REDCROSS)\s*\d*/i,
  /^(BLUECROSS)\s*\d*/i,
  /^(LOGIC)\s*\d*/i,
  /^(STALKER)\s*\d*/i,
  /^(SPARTAN)\s*\d*/i,
  /^(GUARDIAN)\s*\d*/i,
  /^(PHOENIX)\s*\d*/i,
  /^(EAGLE)\s*\d*/i,
  /^(FALCON)\s*\d*/i,
  /^(HAWK)\s*\d*/i,
  /^(TOWER)/i,
  /^(GROUND)/i,
  /^(APPROACH)/i,
  /^(DEPARTURE)/i,
  /^(CENTER)/i,
  /^(RADAR)/i,
  /^(RESCUE)\s*\d*/i,
  /^(MEDIC)\s*\d*/i,
  /^(FIRE)\s*\d*/i,
  /^(CRASH)\s*\d*/i,
];

// Location indicators in RT communications
const LOCATION_INDICATORS = [
  /\bat\s+\w+/i,
  /\bnear\s+\w+/i,
  /\bfrom\s+\w+/i,
  /\bto\s+\w+/i,
  /\bvia\s+\w+/i,
  /runway\s*\d+/i,
  /taxiway\s*\w+/i,
  /apron/i,
  /ramp/i,
  /gate\s*\d*/i,
  /threshold/i,
  /holding\s*point/i,
  /intersection/i,
  /fuel\s*area/i,
  /medical\s*bay/i,
  /hangar/i,
  /tower/i,
  /north|south|east|west/i,
];

export class StructureEngine {
  /**
   * Evaluate transcript structure against RT communication standards
   */
  evaluate(
    transcript: string,
    context: StructureContext
  ): StructureScoreResult {
    const normalizedTranscript = this.normalizeText(transcript);

    // Extract callsigns from transcript
    const detectedCallsigns = this.extractCallsigns(normalizedTranscript);
    const detectedLocation = this.detectLocation(normalizedTranscript);

    // Check receiver position (should be first)
    const receiverCorrect = this.checkReceiverPosition(
      detectedCallsigns,
      context.expectedReceiver
    );

    // Check sender position (should be second)
    const senderCorrect = this.checkSenderPosition(
      detectedCallsigns,
      context.expectedSender
    );

    // Check location presence (when required)
    const locationPresent = context.requiresLocation
      ? detectedLocation !== null
      : true; // Not required, so passes

    // Check intent completeness
    const intentComplete = this.checkIntentPresence(normalizedTranscript, detectedCallsigns);

    // Calculate score
    let score = 0;
    if (receiverCorrect) score += 10;
    if (senderCorrect) score += 10;
    if (locationPresent) score += 5;
    if (intentComplete) score += 5;

    // Build explanation
    const explanation = this.buildExplanation(
      receiverCorrect,
      senderCorrect,
      locationPresent,
      intentComplete,
      context,
      detectedCallsigns
    );

    return {
      score,
      receiverCorrect,
      senderCorrect,
      locationPresent,
      intentComplete,
      detectedOrder: detectedCallsigns,
      explanation,
    };
  }

  private normalizeText(text: string): string {
    return text
      .toUpperCase()
      .replace(/[^\w\s,.-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractCallsigns(text: string): string[] {
    const callsigns: string[] = [];
    const words = text.split(/[\s,]+/);

    let i = 0;
    while (i < words.length) {
      const word = words[i];

      // Check if current word matches a callsign pattern
      for (const pattern of CALLSIGN_PATTERNS) {
        if (pattern.test(word)) {
          // Check if next word is a number (e.g., "REDCROSS 1")
          const nextWord = words[i + 1];
          if (nextWord && /^\d+$/.test(nextWord)) {
            callsigns.push(`${word} ${nextWord}`);
            i++; // Skip the number
          } else {
            callsigns.push(word);
          }
          break;
        }
      }
      i++;
    }

    return callsigns;
  }

  private detectLocation(text: string): string | null {
    for (const pattern of LOCATION_INDICATORS) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }
    return null;
  }

  private checkReceiverPosition(
    detectedCallsigns: string[],
    expectedReceiver: string
  ): boolean {
    if (detectedCallsigns.length === 0) return false;

    const normalizedExpected = expectedReceiver.toUpperCase().trim();
    const firstCallsign = detectedCallsigns[0].toUpperCase().trim();

    // Check if first detected callsign matches expected receiver
    return this.callsignsMatch(firstCallsign, normalizedExpected);
  }

  private checkSenderPosition(
    detectedCallsigns: string[],
    expectedSender: string
  ): boolean {
    if (detectedCallsigns.length < 2) return false;

    const normalizedExpected = expectedSender.toUpperCase().trim();
    const secondCallsign = detectedCallsigns[1].toUpperCase().trim();

    // Check if second detected callsign matches expected sender
    return this.callsignsMatch(secondCallsign, normalizedExpected);
  }

  private callsignsMatch(actual: string, expected: string): boolean {
    // Direct match
    if (actual === expected) return true;

    // Normalize variations (SHEPHARD vs SHEPHERD, spaces vs no spaces)
    const normalizeCallsign = (cs: string) =>
      cs.replace(/SHEPHERD/g, 'SHEPHARD')
        .replace(/\s+/g, ' ')
        .trim();

    return normalizeCallsign(actual) === normalizeCallsign(expected);
  }

  private checkIntentPresence(
    transcript: string,
    callsigns: string[]
  ): boolean {
    // Remove callsigns from transcript to check remaining content
    let remaining = transcript;
    for (const cs of callsigns) {
      remaining = remaining.replace(new RegExp(cs.replace(/\s+/g, '\\s*'), 'gi'), '');
    }

    remaining = remaining.trim();

    // Intent should have at least some meaningful content (3+ words)
    const words = remaining.split(/\s+/).filter(w => w.length > 2);
    return words.length >= 2;
  }

  private buildExplanation(
    receiverCorrect: boolean,
    senderCorrect: boolean,
    locationPresent: boolean,
    intentComplete: boolean,
    context: StructureContext,
    detected: string[]
  ): string {
    const issues: string[] = [];

    if (!receiverCorrect) {
      issues.push(
        `Receiver callsign "${context.expectedReceiver}" should be FIRST. ` +
        `Detected: ${detected[0] || 'none'}`
      );
    }

    if (!senderCorrect) {
      issues.push(
        `Sender callsign "${context.expectedSender}" should be SECOND. ` +
        `Detected: ${detected[1] || 'none'}`
      );
    }

    if (!locationPresent && context.requiresLocation) {
      issues.push('Location information missing (required for this transmission)');
    }

    if (!intentComplete) {
      issues.push('Message intent/purpose is incomplete or unclear');
    }

    if (issues.length === 0) {
      return 'Structure is correct: [Receiver][Sender][Location][Intent] format followed.';
    }

    return `Structure issues: ${issues.join('; ')}`;
  }
}

export const structureEngine = new StructureEngine();
