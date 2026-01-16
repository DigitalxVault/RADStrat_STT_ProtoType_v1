/**
 * Fluency Scoring Engine
 * Evaluates speech fluency (20% of total score)
 * Detects filler words, self-corrections, and hesitations
 */

export interface FluencyScoreResult {
  score: number; // 0-20
  fillersDetected: string[];
  fillerCount: number;
  correctionsDetected: string[];
  correctionCount: number;
  pauseIndicators: number;
  fluencyRating: 'excellent' | 'good' | 'fair' | 'poor';
  explanation: string;
}

export interface FluencyContext {
  fillerPenalty: number; // Points deducted per filler
  maxAllowedFillers: number; // Fillers before penalty applies
  pauseTolerance: number; // Seconds allowed for pauses
}

// Filler words and verbal disfluencies
const FILLER_PATTERNS = [
  /\b(um+)\b/gi,
  /\b(uh+)\b/gi,
  /\b(er+)\b/gi,
  /\b(ah+)\b/gi,
  /\b(like)\b(?!\s+(?:to|it|this|that|a|the|we|i|you|they|he|she))/gi, // "like" as filler
  /\b(you know)\b/gi,
  /\b(basically)\b/gi,
  /\b(actually)\b/gi,
  /\b(so)\b(?=\s*,|\s*\.{2,}|\s+um|\s+uh)/gi, // "so" as hesitation
  /\b(well)\b(?=\s*,|\s*\.{2,}|\s+um|\s+uh)/gi, // "well" as hesitation
  /\b(i mean)\b/gi,
  /\b(kind of|kinda)\b/gi,
  /\b(sort of|sorta)\b/gi,
  /\b(right)\b(?=\s*,|\s*\?)/gi, // filler "right"
  /\b(okay|ok)\b(?=\s+so|\s+um|\s+uh)/gi, // filler "okay"
];

// Patterns indicating self-corrections
const CORRECTION_PATTERNS = [
  // Explicit corrections
  /\b(i mean|no wait|sorry|correction|rather)\b/gi,
  // Repeated words (immediate repetition)
  /\b(\w{2,})\s+\1\b/gi,
  // Cut-off words (indicated by hyphen or incomplete)
  /\b\w{2,}-\s/g,
  // Restarts after pause indicators
  /\.{2,}\s*\b(i|we|the|a|this|that)\b/gi,
];

// Pause indicators (transcription conventions)
const PAUSE_INDICATORS = [
  /\.{3,}/g, // Ellipsis
  /\[pause\]/gi,
  /\[long pause\]/gi,
  /\(pause\)/gi,
  /-{2,}/g, // Dashes indicating pause
  /\s{3,}/g, // Multiple spaces (sometimes indicates pause)
];

export class FluencyEngine {
  /**
   * Evaluate transcript fluency
   */
  evaluate(
    transcript: string,
    context: FluencyContext
  ): FluencyScoreResult {
    const normalizedTranscript = transcript.toLowerCase();

    // Detect filler words
    const fillersDetected = this.detectFillers(normalizedTranscript);
    const fillerCount = fillersDetected.length;

    // Detect self-corrections
    const correctionsDetected = this.detectCorrections(normalizedTranscript);
    const correctionCount = correctionsDetected.length;

    // Detect pause indicators
    const pauseIndicators = this.detectPauses(transcript);

    // Calculate score
    const score = this.calculateScore(
      fillerCount,
      correctionCount,
      pauseIndicators,
      context
    );

    // Determine fluency rating
    const fluencyRating = this.determineFluencyRating(score);

    return {
      score,
      fillersDetected,
      fillerCount,
      correctionsDetected,
      correctionCount,
      pauseIndicators,
      fluencyRating,
      explanation: this.buildExplanation(
        fillersDetected,
        correctionsDetected,
        pauseIndicators,
        score,
        fluencyRating
      ),
    };
  }

  /**
   * Detect filler words in transcript
   */
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

  /**
   * Detect self-corrections in transcript
   */
  private detectCorrections(text: string): string[] {
    const corrections: string[] = [];

    for (const pattern of CORRECTION_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        corrections.push(...matches.map(m => m.trim()));
      }
    }

    // Remove duplicates
    return [...new Set(corrections)];
  }

  /**
   * Detect pause indicators in transcript
   */
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

  /**
   * Calculate fluency score based on detected issues
   */
  private calculateScore(
    fillerCount: number,
    correctionCount: number,
    pauseCount: number,
    context: FluencyContext
  ): number {
    let score = 20; // Start with full score

    // Apply filler penalty
    const excessFillers = Math.max(0, fillerCount - context.maxAllowedFillers);
    const fillerDeduction = excessFillers * context.fillerPenalty;
    score -= fillerDeduction;

    // Apply correction penalty (1 point each)
    score -= correctionCount * 1;

    // Apply pause penalty (0.5 points each)
    score -= pauseCount * 0.5;

    // Floor at 0
    return Math.max(0, Math.round(score));
  }

  /**
   * Determine fluency rating based on score
   */
  private determineFluencyRating(
    score: number
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 18) return 'excellent';
    if (score >= 14) return 'good';
    if (score >= 8) return 'fair';
    return 'poor';
  }

  /**
   * Build explanation of fluency evaluation
   */
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
      parts.push(
        `Filler words detected (${fillers.length}): ${uniqueFillers.slice(0, 5).join(', ')}${
          uniqueFillers.length > 5 ? '...' : ''
        }`
      );
    }

    if (corrections.length > 0) {
      parts.push(`Self-corrections detected: ${corrections.length}`);
    }

    if (pauses > 0) {
      parts.push(`Hesitations/pauses: ${pauses}`);
    }

    if (fillers.length === 0 && corrections.length === 0 && pauses === 0) {
      parts.push('Clear and fluent delivery.');
    }

    return parts.join(' ');
  }

  /**
   * Analyze speech patterns for additional insights
   */
  analyzePatterns(transcripts: string[]): {
    commonFillers: string[];
    averageFillerRate: number;
    improvementAreas: string[];
  } {
    const allFillers: string[] = [];
    let totalWords = 0;

    for (const transcript of transcripts) {
      const fillers = this.detectFillers(transcript.toLowerCase());
      allFillers.push(...fillers);
      totalWords += transcript.split(/\s+/).length;
    }

    // Count filler frequencies
    const fillerCounts = new Map<string, number>();
    for (const filler of allFillers) {
      fillerCounts.set(filler, (fillerCounts.get(filler) || 0) + 1);
    }

    // Sort by frequency
    const sortedFillers = [...fillerCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([filler]) => filler);

    // Calculate average filler rate (fillers per 100 words)
    const averageFillerRate = totalWords > 0
      ? (allFillers.length / totalWords) * 100
      : 0;

    // Identify improvement areas
    const improvementAreas: string[] = [];
    if (averageFillerRate > 5) {
      improvementAreas.push('Reduce filler word usage');
    }
    if (sortedFillers.includes('um') || sortedFillers.includes('uh')) {
      improvementAreas.push('Practice speaking without verbal pauses');
    }
    if (sortedFillers.includes('like') || sortedFillers.includes('you know')) {
      improvementAreas.push('Eliminate conversational fillers');
    }

    return {
      commonFillers: sortedFillers.slice(0, 5),
      averageFillerRate: Math.round(averageFillerRate * 10) / 10,
      improvementAreas,
    };
  }
}

export const fluencyEngine = new FluencyEngine();
