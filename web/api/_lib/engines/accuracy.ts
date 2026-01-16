import type { DifficultyLevel } from '../types';

export interface AccuracyScoreResult {
  score: number;
  matchedElements: string[];
  missingElements: string[];
  werScore?: number;
  semanticScore?: number;
  explanation: string;
}

export interface AccuracyContext {
  expected: string;
  difficulty: DifficultyLevel;
  werThreshold?: number;
}

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
};

const KEY_ELEMENTS = [
  /\b(shephard|shepherd|redcross|bluecross|logic|stalker|spartan|guardian|tender)\s*\d*/gi,
  /\b(request|cleared|proceed|hold|contact|standby|affirm|negative|roger|wilco)\b/gi,
  /\b(runway|taxiway|apron|gate|threshold|holding|intersection|fuel|medical|tower)\s*\w*/gi,
  /\b(runway\s*)?\d{1,2}[LRC]?\b/gi,
  /\b(mayday|pan\s*pan|emergency|urgent|priority)\b/gi,
  /\b(clearance|cleared|approved|authorized)\b/gi,
];

export class AccuracyEngine {
  evaluate(transcript: string, context: AccuracyContext): AccuracyScoreResult {
    const normalizedTranscript = this.normalizeForComparison(transcript);
    const normalizedExpected = this.normalizeForComparison(context.expected);

    switch (context.difficulty) {
      case 'easy':
        return this.evaluateSemantic(normalizedTranscript, normalizedExpected);
      case 'medium':
        return this.evaluateBalanced(normalizedTranscript, normalizedExpected);
      case 'hard':
        return this.evaluateExact(normalizedTranscript, normalizedExpected, context.werThreshold || 20);
      default:
        return this.evaluateBalanced(normalizedTranscript, normalizedExpected);
    }
  }

  private evaluateSemantic(transcript: string, expected: string): AccuracyScoreResult {
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

    const totalElements = expectedElements.length || 1;
    const semanticScore = matchedElements.length / totalElements;
    const score = Math.round(semanticScore * 50);

    return {
      score,
      matchedElements,
      missingElements,
      semanticScore,
      explanation: this.buildSemanticExplanation(matchedElements, missingElements, semanticScore),
    };
  }

  private evaluateBalanced(transcript: string, expected: string): AccuracyScoreResult {
    const semanticResult = this.evaluateSemantic(transcript, expected);
    const phraseScore = this.evaluatePhraseMatching(transcript, expected);

    const combinedScore = Math.round((semanticResult.semanticScore! * 0.6 + phraseScore * 0.4) * 50);

    return {
      score: combinedScore,
      matchedElements: semanticResult.matchedElements,
      missingElements: semanticResult.missingElements,
      semanticScore: semanticResult.semanticScore,
      explanation: `Balanced: ${Math.round(semanticResult.semanticScore! * 100)}% semantic, ${Math.round(phraseScore * 100)}% phrase match.`,
    };
  }

  private evaluateExact(transcript: string, expected: string, werThreshold: number): AccuracyScoreResult {
    const transcriptWords = this.tokenize(transcript);
    const expectedWords = this.tokenize(expected);

    const wer = this.calculateWER(transcriptWords, expectedWords);
    const werPercentage = Math.round(wer * 100);
    const score = Math.max(0, Math.round(50 * (1 - wer)));

    const matchedElements = transcriptWords.filter(w => expectedWords.includes(w));
    const missingElements = expectedWords.filter(w => !transcriptWords.includes(w));

    return {
      score,
      matchedElements,
      missingElements,
      werScore: werPercentage,
      explanation: `Word Error Rate: ${werPercentage}%. ${werPercentage <= werThreshold ? 'Within threshold.' : `Exceeds ${werThreshold}% threshold.`}`,
    };
  }

  private normalizeForComparison(text: string): string {
    let normalized = text.toUpperCase().trim();
    normalized = normalized.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
    normalized = this.normalizeNumbers(normalized);
    normalized = normalized.replace(/SHEPHERD/g, 'SHEPHARD');
    return normalized.trim();
  }

  private normalizeNumbers(text: string): string {
    let result = text;
    for (const [digit, words] of Object.entries(NUMBER_EQUIVALENCES)) {
      for (const word of words) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        result = result.replace(regex, digit);
      }
    }
    return result;
  }

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

  private elementPresent(element: string, text: string): boolean {
    const normalizedElement = element.toUpperCase().trim();
    const normalizedText = text.toUpperCase();

    if (normalizedText.includes(normalizedElement)) return true;

    const elementWithNormalizedNumbers = this.normalizeNumbers(normalizedElement);
    const textWithNormalizedNumbers = this.normalizeNumbers(normalizedText);

    return textWithNormalizedNumbers.includes(elementWithNormalizedNumbers);
  }

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

  private phrasesMatch(phrase1: string, phrase2: string): boolean {
    const p1 = phrase1.toUpperCase();
    const p2 = phrase2.toUpperCase();
    if (p1 === p2) return true;
    if (this.normalizeNumbers(p1) === this.normalizeNumbers(p2)) return true;
    return false;
  }

  private tokenize(text: string): string[] {
    return text.split(/\s+/).filter(w => w.length > 0).map(w => w.toUpperCase());
  }

  private calculateWER(hypothesis: string[], reference: string[]): number {
    if (reference.length === 0) return hypothesis.length === 0 ? 0 : 1;

    const m = reference.length;
    const n = hypothesis.length;
    const d: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) d[i][0] = i;
    for (let j = 0; j <= n; j++) d[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = reference[i - 1] === hypothesis[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      }
    }

    return d[m][n] / m;
  }

  private buildSemanticExplanation(_matched: string[], missing: string[], score: number): string {
    const percentage = Math.round(score * 100);

    if (missing.length === 0) {
      return `All key information present (${percentage}% match).`;
    }

    return `${percentage}% semantic match. Missing: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ` (+${missing.length - 3} more)` : ''}`;
  }
}

export const accuracyEngine = new AccuracyEngine();
