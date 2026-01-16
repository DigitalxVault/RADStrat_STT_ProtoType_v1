export interface FluencyScoreResult {
  score: number;
  fillersDetected: string[];
  fillerCount: number;
  correctionsDetected: string[];
  correctionCount: number;
  pauseIndicators: number;
  fluencyRating: 'excellent' | 'good' | 'fair' | 'poor';
  explanation: string;
}

export interface FluencyContext {
  fillerPenalty: number;
  maxAllowedFillers: number;
  pauseTolerance: number;
}

const FILLER_PATTERNS = [
  /\b(um+)\b/gi,
  /\b(uh+)\b/gi,
  /\b(er+)\b/gi,
  /\b(ah+)\b/gi,
  /\b(like)\b(?!\s+(?:to|it|this|that|a|the|we|i|you|they|he|she))/gi,
  /\b(you know)\b/gi,
  /\b(basically)\b/gi,
  /\b(actually)\b/gi,
  /\b(i mean)\b/gi,
  /\b(kind of|kinda)\b/gi,
  /\b(sort of|sorta)\b/gi,
];

const CORRECTION_PATTERNS = [
  /\b(i mean|no wait|sorry|correction|rather)\b/gi,
  /\b(\w{2,})\s+\1\b/gi,
  /\b\w{2,}-\s/g,
];

const PAUSE_INDICATORS = [
  /\.{3,}/g,
  /\[pause\]/gi,
  /\(pause\)/gi,
  /-{2,}/g,
];

export class FluencyEngine {
  evaluate(transcript: string, context: FluencyContext): FluencyScoreResult {
    const normalizedTranscript = transcript.toLowerCase();

    const fillersDetected = this.detectFillers(normalizedTranscript);
    const fillerCount = fillersDetected.length;

    const correctionsDetected = this.detectCorrections(normalizedTranscript);
    const correctionCount = correctionsDetected.length;

    const pauseIndicators = this.detectPauses(transcript);

    const score = this.calculateScore(fillerCount, correctionCount, pauseIndicators, context);
    const fluencyRating = this.determineFluencyRating(score);

    return {
      score,
      fillersDetected,
      fillerCount,
      correctionsDetected,
      correctionCount,
      pauseIndicators,
      fluencyRating,
      explanation: this.buildExplanation(fillersDetected, correctionsDetected, pauseIndicators, score, fluencyRating),
    };
  }

  private detectFillers(text: string): string[] {
    const fillers: string[] = [];
    for (const pattern of FILLER_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        fillers.push(...matches.map(m => m.trim().toLowerCase()));
      }
    }
    return fillers;
  }

  private detectCorrections(text: string): string[] {
    const corrections: string[] = [];
    for (const pattern of CORRECTION_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        corrections.push(...matches.map(m => m.trim()));
      }
    }
    return [...new Set(corrections)];
  }

  private detectPauses(text: string): number {
    let pauseCount = 0;
    for (const pattern of PAUSE_INDICATORS) {
      const matches = text.match(pattern);
      if (matches) {
        pauseCount += matches.length;
      }
    }
    return pauseCount;
  }

  private calculateScore(
    fillerCount: number,
    correctionCount: number,
    pauseCount: number,
    context: FluencyContext
  ): number {
    let score = 20;

    const excessFillers = Math.max(0, fillerCount - context.maxAllowedFillers);
    const fillerDeduction = excessFillers * context.fillerPenalty;
    score -= fillerDeduction;

    score -= correctionCount * 1;
    score -= pauseCount * 0.5;

    return Math.max(0, Math.round(score));
  }

  private determineFluencyRating(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 18) return 'excellent';
    if (score >= 14) return 'good';
    if (score >= 8) return 'fair';
    return 'poor';
  }

  private buildExplanation(
    fillers: string[],
    corrections: string[],
    pauses: number,
    score: number,
    rating: string
  ): string {
    const parts: string[] = [];

    parts.push(`Fluency rating: ${rating} (${score}/20 points).`);

    if (fillers.length > 0) {
      const uniqueFillers = [...new Set(fillers)];
      parts.push(`Filler words (${fillers.length}): ${uniqueFillers.slice(0, 5).join(', ')}${uniqueFillers.length > 5 ? '...' : ''}`);
    }

    if (corrections.length > 0) {
      parts.push(`Self-corrections: ${corrections.length}`);
    }

    if (pauses > 0) {
      parts.push(`Hesitations: ${pauses}`);
    }

    if (fillers.length === 0 && corrections.length === 0 && pauses === 0) {
      parts.push('Clear and fluent delivery.');
    }

    return parts.join(' ');
  }
}

export const fluencyEngine = new FluencyEngine();
