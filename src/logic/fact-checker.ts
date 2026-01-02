/**
 * Fact Checker - Verification Layer
 * 
 * Validates LLM-generated content against ground truth data.
 * Ensures no factual errors (spreads, teams, dates) reach output.
 */

import type { GameData, SignalOutput, ValidationResult } from '../types';

// ============================================================================
// Configuration
// ============================================================================

const SPREAD_TOLERANCE = 0.5;  // Max acceptable spread difference

// ============================================================================
// Fact Checker
// ============================================================================

export class FactChecker {
  /**
   * Validate generated signal against ground truth game data.
   */
  static validate(
    signal: SignalOutput,
    game: GameData
  ): ValidationResult {
    const issues: string[] = [];

    // Check spread references
    const spreadIssue = this.verifySpread(signal, game);
    if (spreadIssue) issues.push(spreadIssue);

    // Check team identity
    const teamIssue = this.verifyTeams(signal, game);
    if (teamIssue) issues.push(teamIssue);

    // Check date consistency
    const dateIssue = this.verifyDate(signal, game);
    if (dateIssue) issues.push(dateIssue);

    // Check statistical plausibility
    const statIssue = this.verifyStats(signal);
    if (statIssue) issues.push(statIssue);

    return {
      passed: issues.length === 0,
      issues,
    };
  }

  /**
   * Verify spread references in generated content.
   */
  private static verifySpread(signal: SignalOutput, game: GameData): string | null {
    // Extract spread claims from text
    const spreadPattern = /([+-]?\d+\.?\d*)\s*(?:point|pt)/i;
    const match = signal.reasoning.match(spreadPattern) || signal.tweetText.match(spreadPattern);

    if (match) {
      const claimedSpread = parseFloat(match[1]);
      const actualSpread = Math.abs(game.spread);

      if (Math.abs(Math.abs(claimedSpread) - actualSpread) > SPREAD_TOLERANCE) {
        return `Spread mismatch: claimed ${claimedSpread}, actual is ${game.spread}`;
      }
    }

    return null;
  }

  /**
   * Verify team identity (home/away not swapped).
   */
  private static verifyTeams(signal: SignalOutput, game: GameData): string | null {
    const text = (signal.reasoning + ' ' + signal.tweetText).toLowerCase();

    // Check for incorrect home/away claims
    const awayHomePattern = new RegExp(`${game.awayTeam.toLowerCase()}.*home`, 'i');
    const homeAwayPattern = new RegExp(`${game.homeTeam.toLowerCase()}.*road|away`, 'i');

    if (awayHomePattern.test(text)) {
      return `Team location error: ${game.awayTeam} is the away team, not home`;
    }

    if (homeAwayPattern.test(text)) {
      return `Team location error: ${game.homeTeam} is the home team, not away`;
    }

    return null;
  }

  /**
   * Verify date references match game date.
   */
  private static verifyDate(signal: SignalOutput, game: GameData): string | null {
    const text = signal.tweetText.toLowerCase();
    const gameDate = new Date(game.time);
    const dayOfWeek = gameDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const dayPatterns = [
      { day: 'monday', abbr: 'mon' },
      { day: 'tuesday', abbr: 'tue' },
      { day: 'wednesday', abbr: 'wed' },
      { day: 'thursday', abbr: 'thu' },
      { day: 'friday', abbr: 'fri' },
      { day: 'saturday', abbr: 'sat' },
      { day: 'sunday', abbr: 'sun' },
    ];

    for (const { day, abbr } of dayPatterns) {
      if ((text.includes(day) || text.includes(abbr)) && dayOfWeek !== day) {
        return `Date mismatch: claims "${day}" but game is on ${dayOfWeek}`;
      }
    }

    return null;
  }

  /**
   * Verify statistical claims are plausible.
   */
  private static verifyStats(signal: SignalOutput): string | null {
    const text = signal.reasoning;

    // Check for implausible PPG claims (NBA max ~35 PPG)
    const ppgPattern = /(\d+\.?\d*)\s*(?:ppg|points per game)/i;
    const ppgMatch = text.match(ppgPattern);
    if (ppgMatch) {
      const ppg = parseFloat(ppgMatch[1]);
      if (ppg > 45) {
        return `Implausible stat: ${ppg} PPG is unrealistic`;
      }
    }

    // Check for implausible win percentages
    const winPctPattern = /(\d+\.?\d*)\s*%\s*(?:win|winning)/i;
    const winPctMatch = text.match(winPctPattern);
    if (winPctMatch) {
      const pct = parseFloat(winPctMatch[1]);
      if (pct > 100) {
        return `Invalid percentage: ${pct}% exceeds 100`;
      }
    }

    return null;
  }

  /**
   * Format validation result for logging.
   */
  static formatResult(result: ValidationResult): string {
    if (result.passed) {
      return '✓ VERIFICATION PASSED';
    }

    const lines = [
      '✗ VERIFICATION FAILED',
      'Issues:',
      ...result.issues.map(i => `  - ${i}`),
    ];

    return lines.join('\n');
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Quick check if validation passed.
 */
export function isValid(result: ValidationResult): boolean {
  return result.passed;
}

/**
 * Get issue count.
 */
export function getIssueCount(result: ValidationResult): number {
  return result.issues.length;
}
