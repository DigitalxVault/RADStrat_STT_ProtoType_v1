export interface StructureScoreResult {
  score: number;
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

const CALLSIGN_PATTERNS = [
  /^(SHEPHARD|SHEPHERD)/i,
  /^(REDCROSS)\s*\d*/i,
  /^(BLUECROSS)\s*\d*/i,
  /^(LOGIC)\s*\d*/i,
  /^(STALKER)\s*\d*/i,
  /^(SPARTAN)\s*\d*/i,
  /^(GUARDIAN)\s*\d*/i,
  /^(PHOENIX)\s*\d*/i,
  /^(TENDER)\s*\d*/i,
  /^(TOWER)/i,
  /^(GROUND)/i,
  /^(RESCUE)\s*\d*/i,
  /^(MEDIC)\s*\d*/i,
  /^(FIRE)\s*\d*/i,
];

const LOCATION_INDICATORS = [
  /\bat\s+\w+/i,
  /\bnear\s+\w+/i,
  /\bfrom\s+\w+/i,
  /\bto\s+\w+/i,
  /\bvia\s+\w+/i,
  /runway\s*\d+/i,
  /taxiway\s*\w+/i,
  /apron/i,
  /fuel\s*area/i,
  /medical\s*bay/i,
  /hangar/i,
];

export class StructureEngine {
  evaluate(transcript: string, context: StructureContext): StructureScoreResult {
    const normalizedTranscript = this.normalizeText(transcript);
    const detectedCallsigns = this.extractCallsigns(normalizedTranscript);
    const detectedLocation = this.detectLocation(normalizedTranscript);

    const receiverCorrect = this.checkReceiverPosition(detectedCallsigns, context.expectedReceiver);
    const senderCorrect = this.checkSenderPosition(detectedCallsigns, context.expectedSender);
    const locationPresent = context.requiresLocation ? detectedLocation !== null : true;
    const intentComplete = this.checkIntentPresence(normalizedTranscript, detectedCallsigns);

    let score = 0;
    if (receiverCorrect) score += 10;
    if (senderCorrect) score += 10;
    if (locationPresent) score += 5;
    if (intentComplete) score += 5;

    const explanation = this.buildExplanation(
      receiverCorrect, senderCorrect, locationPresent, intentComplete,
      context, detectedCallsigns
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
    return text.toUpperCase().replace(/[^\w\s,.-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private extractCallsigns(text: string): string[] {
    const callsigns: string[] = [];
    const words = text.split(/[\s,]+/);

    let i = 0;
    while (i < words.length) {
      const word = words[i];
      for (const pattern of CALLSIGN_PATTERNS) {
        if (pattern.test(word)) {
          const nextWord = words[i + 1];
          if (nextWord && /^\d+$/.test(nextWord)) {
            callsigns.push(`${word} ${nextWord}`);
            i++;
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
      if (match) return match[0];
    }
    return null;
  }

  private checkReceiverPosition(detectedCallsigns: string[], expectedReceiver: string): boolean {
    if (detectedCallsigns.length === 0) return false;
    return this.callsignsMatch(detectedCallsigns[0].toUpperCase().trim(), expectedReceiver.toUpperCase().trim());
  }

  private checkSenderPosition(detectedCallsigns: string[], expectedSender: string): boolean {
    if (detectedCallsigns.length < 2) return false;
    return this.callsignsMatch(detectedCallsigns[1].toUpperCase().trim(), expectedSender.toUpperCase().trim());
  }

  private callsignsMatch(actual: string, expected: string): boolean {
    if (actual === expected) return true;
    const normalize = (cs: string) => cs.replace(/SHEPHERD/g, 'SHEPHARD').replace(/\s+/g, ' ').trim();
    return normalize(actual) === normalize(expected);
  }

  private checkIntentPresence(transcript: string, callsigns: string[]): boolean {
    let remaining = transcript;
    for (const cs of callsigns) {
      remaining = remaining.replace(new RegExp(cs.replace(/\s+/g, '\\s*'), 'gi'), '');
    }
    remaining = remaining.trim();
    const words = remaining.split(/\s+/).filter(w => w.length > 2);
    return words.length >= 2;
  }

  private buildExplanation(
    receiverCorrect: boolean, senderCorrect: boolean, locationPresent: boolean,
    intentComplete: boolean, context: StructureContext, detected: string[]
  ): string {
    const issues: string[] = [];

    if (!receiverCorrect) {
      issues.push(`Receiver "${context.expectedReceiver}" should be FIRST. Detected: ${detected[0] || 'none'}`);
    }
    if (!senderCorrect) {
      issues.push(`Sender "${context.expectedSender}" should be SECOND. Detected: ${detected[1] || 'none'}`);
    }
    if (!locationPresent && context.requiresLocation) {
      issues.push('Location information missing');
    }
    if (!intentComplete) {
      issues.push('Message intent incomplete');
    }

    if (issues.length === 0) {
      return 'Structure is correct: [Receiver][Sender][Location][Intent] format followed.';
    }

    return `Structure issues: ${issues.join('; ')}`;
  }
}

export const structureEngine = new StructureEngine();
