/**
 * Accuracy Scoring Engine
 * Evaluates content accuracy (50% of total score)
 * Varies by difficulty: Easy=semantic, Medium=balanced, Hard=WER-based
 */

import { DifficultyLevel } from '../../../types/index.js';

export interface AccuracyScoreResult {
  score: number; // 0-50
  matchedElements: string[];
  missingElements: string[];
  werScore?: number; // Word Error Rate (for hard mode)
  semanticScore?: number;
  explanation: string;
}

export interface AccuracyContext {
  expected: string;
  difficulty: DifficultyLevel;
  werThreshold?: number; // For hard mode
}

// Number word equivalences
const NUMBER_EQUIVALENCES: Record<string, string[]> = {
  '0': ['zero', 'oh'],
  '1': ['one', 'wun'],
  '2': ['two', 'too', 'to'],
  '3': ['three'],
  '4': ['four', 'for', 'fore'],
  '5': ['five', 'fife'],
  '6': ['six'],
  '7': ['seven'],
  '8': ['eight', 'ate'],
  '9': ['nine', 'niner'],
  '10': ['ten'],
  '11': ['eleven'],
  '12': ['twelve'],
};

// RT number pronunciation patterns
const RT_NUMBER_PATTERNS: Record<string, string[]> = {
  '20': ['two zero', 'twenty'],
  '30': ['three zero', 'thirty'],
  '27': ['two seven', 'twenty seven'],
  '09': ['zero nine', 'nine'],
  '01': ['zero one', 'one'],
  '18': ['one eight', 'eighteen'],
  '36': ['three six', 'thirty six'],
};

// Key information elements for RT communications
const KEY_ELEMENTS = [
  // Callsigns
  /\b(shephard|shepherd|redcross|bluecross|logic|stalker|spartan|guardian)\s*\d*/gi,
  // Actions
  /\b(request|cleared|proceed|hold|contact|standby|affirm|negative|roger|wilco)\b/gi,
  // Locations
  /\b(runway|taxiway|apron|gate|threshold|holding|intersection|fuel|medical|tower)\s*\w*/gi,
  // Numbers (runway numbers, etc.)
  /\b(runway\s*)?\d{1,2}[LRC]?\b/gi,
  // Urgency
  /\b(mayday|pan\s*pan|emergency|urgent|priority)\b/gi,
  // Clearances
  /\b(clearance|cleared|approved|authorized)\b/gi,
];

export class AccuracyEngine {
  /**
   * Evaluate transcript accuracy against expected message
   */
  evaluate(
    transcript: string,
    context: AccuracyContext
  ): AccuracyScoreResult {
    const normalizedTranscript = this.normalizeForComparison(transcript);
    const normalizedExpected = this.normalizeForComparison(context.expected);

    switch (context.difficulty) {
      case 'easy':
        return this.evaluateSemantic(normalizedTranscript, normalizedExpected);
      case 'medium':
        return this.evaluateBalanced(normalizedTranscript, normalizedExpected);
      case 'hard':
        return this.evaluateExact(
          normalizedTranscript,
          normalizedExpected,
          context.werThreshold || 20
        );
      default:
        return this.evaluateBalanced(normalizedTranscript, normalizedExpected);
    }
  }

  /**
   * Easy mode: Semantic similarity check
   * Key information must be present, phrasing can vary
   */
  private evaluateSemantic(
    transcript: string,
    expected: string
  ): AccuracyScoreResult {
    const expectedElements = this.extractKeyElements(expected);

    const matchedElements: string[] = [];
    const missingElements: string[] = [];

    for (const element of expectedElements) {
      if (this.elementPresent(element, transcript)) {
        matchedElements.push(element);
      } else {
        missingElements.push(element);
      }
    }

    // Calculate semantic score (0-1)
    const totalElements = expectedElements.length || 1;
    const semanticScore = matchedElements.length / totalElements;

    // Convert to 0-50 scale
    const score = Math.round(semanticScore * 50);

    return {
      score,
      matchedElements,
      missingElements,
      semanticScore,
      explanation: this.buildSemanticExplanation(
        matchedElements,
        missingElements,
        semanticScore
      ),
    };
  }

  /**
   * Medium mode: Balanced semantic + key phrases
   * Core meaning must match with some variation allowed
   */
  private evaluateBalanced(
    transcript: string,
    expected: string
  ): AccuracyScoreResult {
    // 60% semantic, 40% phrase matching
    const semanticResult = this.evaluateSemantic(transcript, expected);
    const phraseScore = this.evaluatePhraseMatching(transcript, expected);

    const combinedScore = Math.round(
      (semanticResult.semanticScore! * 0.6 + phraseScore * 0.4) * 50
    );

    return {
      score: combinedScore,
      matchedElements: semanticResult.matchedElements,
      missingElements: semanticResult.missingElements,
      semanticScore: semanticResult.semanticScore,
      explanation: `Balanced scoring: ${Math.round(semanticResult.semanticScore! * 100)}% semantic match, ${Math.round(phraseScore * 100)}% phrase match.`,
    };
  }

  /**
   * Hard mode: Exact word matching (WER-based)
   * Minimal variation tolerance
   */
  private evaluateExact(
    transcript: string,
    expected: string,
    werThreshold: number
  ): AccuracyScoreResult {
    const transcriptWords = this.tokenize(transcript);
    const expectedWords = this.tokenize(expected);

    // Calculate Word Error Rate using Levenshtein distance
    const wer = this.calculateWER(transcriptWords, expectedWords);
    const werPercentage = Math.round(wer * 100);

    // Convert WER to score (lower WER = higher score)
    // 0% WER = 50 points, 100% WER = 0 points
    const score = Math.max(0, Math.round(50 * (1 - wer)));

    // Find matched and missing words
    const matchedElements = transcriptWords.filter(w =>
      expectedWords.includes(w)
    );
    const missingElements = expectedWords.filter(
      w => !transcriptWords.includes(w)
    );

    return {
      score,
      matchedElements,
      missingElements,
      werScore: werPercentage,
      explanation: `Word Error Rate: ${werPercentage}%. ${
        werPercentage <= werThreshold
          ? 'Within acceptable threshold.'
          : `Exceeds ${werThreshold}% threshold.`
      }`,
    };
  }

  /**
   * Normalize text for comparison
   * Handles number equivalences and RT conventions
   */
  private normalizeForComparison(text: string): string {
    let normalized = text.toUpperCase().trim();

    // Normalize punctuation
    normalized = normalized.replace(/[^\w\s]/g, ' ');

    // Normalize whitespace
    normalized = normalized.replace(/\s+/g, ' ');

    // Normalize number words to digits
    normalized = this.normalizeNumbers(normalized);

    // Normalize common RT variations
    normalized = normalized
      .replace(/SHEPHERD/g, 'SHEPHARD')
      .replace(/NEGATIVE/g, 'NEGATIVE')
      .replace(/AFFIRM/g, 'AFFIRM');

    return normalized.trim();
  }

  /**
   * Normalize numbers (convert words to digits and vice versa for comparison)
   */
  private normalizeNumbers(text: string): string {
    let result = text;

    // Convert number words to digits
    for (const [digit, words] of Object.entries(NUMBER_EQUIVALENCES)) {
      for (const word of words) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        result = result.replace(regex, digit);
      }
    }

    // Handle RT number patterns (e.g., "TWO ZERO" → "20")
    for (const [number, patterns] of Object.entries(RT_NUMBER_PATTERNS)) {
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.replace(/\s+/g, '\\s+'), 'gi');
        result = result.replace(regex, number);
      }
    }

    return result;
  }

  /**
   * Extract key information elements from text
   */
  private extractKeyElements(text: string): string[] {
    const elements: Set<string> = new Set();

    for (const pattern of KEY_ELEMENTS) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(m => elements.add(m.toUpperCase().trim()));
      }
    }

    return Array.from(elements);
  }

  /**
   * Check if a key element is present in text (with fuzzy matching)
   */
  private elementPresent(element: string, text: string): boolean {
    const normalizedElement = element.toUpperCase().trim();
    const normalizedText = text.toUpperCase();

    // Direct match
    if (normalizedText.includes(normalizedElement)) return true;

    // Fuzzy match for numbers
    const elementWithNormalizedNumbers = this.normalizeNumbers(normalizedElement);
    const textWithNormalizedNumbers = this.normalizeNumbers(normalizedText);

    return textWithNormalizedNumbers.includes(elementWithNormalizedNumbers);
  }

  /**
   * Evaluate phrase matching between transcript and expected
   */
  private evaluatePhraseMatching(transcript: string, expected: string): number {
    const transcriptPhrases = this.extractPhrases(transcript);
    const expectedPhrases = this.extractPhrases(expected);

    if (expectedPhrases.length === 0) return 1;

    let matches = 0;
    for (const phrase of expectedPhrases) {
      if (transcriptPhrases.some(tp => this.phrasesMatch(tp, phrase))) {
        matches++;
      }
    }

    return matches / expectedPhrases.length;
  }

  /**
   * Extract meaningful phrases (2-3 word combinations)
   */
  private extractPhrases(text: string): string[] {
    const words = text.split(/\s+/);
    const phrases: string[] = [];

    for (let i = 0; i < words.length - 1; i++) {
      phrases.push(`${words[i]} ${words[i + 1]}`);
      if (i < words.length - 2) {
        phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
      }
    }

    return phrases;
  }

  /**
   * Check if two phrases match (with some tolerance)
   */
  private phrasesMatch(phrase1: string, phrase2: string): boolean {
    const p1 = phrase1.toUpperCase();
    const p2 = phrase2.toUpperCase();

    // Direct match
    if (p1 === p2) return true;

    // Number-normalized match
    if (this.normalizeNumbers(p1) === this.normalizeNumbers(p2)) return true;

    return false;
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text
      .split(/\s+/)
      .filter(w => w.length > 0)
      .map(w => w.toUpperCase());
  }

  /**
   * Calculate Word Error Rate using Levenshtein distance
   */
  private calculateWER(hypothesis: string[], reference: string[]): number {
    if (reference.length === 0) {
      return hypothesis.length === 0 ? 0 : 1;
    }

    const m = reference.length;
    const n = hypothesis.length;

    // Create distance matrix
    const d: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    // Initialize first column
    for (let i = 0; i <= m; i++) {
      d[i][0] = i;
    }

    // Initialize first row
    for (let j = 0; j <= n; j++) {
      d[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = reference[i - 1] === hypothesis[j - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1, // Deletion
          d[i][j - 1] + 1, // Insertion
          d[i - 1][j - 1] + cost // Substitution
        );
      }
    }

    // WER = edit distance / reference length
    return d[m][n] / m;
  }

  /**
   * Build explanation for semantic evaluation
   */
  private buildSemanticExplanation(
    _matched: string[],
    missing: string[],
    score: number
  ): string {
    const percentage = Math.round(score * 100);

    if (missing.length === 0) {
      return `All key information present (${percentage}% match).`;
    }

    return `${percentage}% semantic match. Missing: ${missing.slice(0, 3).join(', ')}${
      missing.length > 3 ? ` (+${missing.length - 3} more)` : ''
    }`;
  }
}

export const accuracyEngine = new AccuracyEngine();
