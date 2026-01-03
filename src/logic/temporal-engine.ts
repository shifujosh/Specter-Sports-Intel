/**
 * Temporal Engine - Time-Based Analysis
 * 
 * Tracks fatigue, rest, and circadian factors that affect team performance.
 * These temporal signals are critical for identifying "trap games."
 */

import type { ScheduleSlot, TemporalFactors, RestAnalysis } from '../types';

// ============================================================================
// Configuration
// ============================================================================

const FULL_REST_DAYS = 2;    // Days needed for "full rest"
const B2B_PENALTY = -0.03;   // Win probability penalty for back-to-back
const CROSS_COUNTRY_PENALTY = -0.02; // Circadian disruption

// ============================================================================
// Temporal Engine
// ============================================================================

export class TemporalEngine {
  /**
   * Analyze rest and schedule factors for a team.
   */
  static analyzeRest(
    lastGameDate: Date,
    currentGameDate: Date,
    isHome: boolean
  ): RestAnalysis {
    const diffMs = currentGameDate.getTime() - lastGameDate.getTime();
    const restDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    const isBackToBack = restDays === 0;
    const isFullRest = restDays >= FULL_REST_DAYS;
    
    let fatigueScore = 0;
    if (isBackToBack) fatigueScore = 1.0;
    else if (restDays === 1) fatigueScore = 0.5;
    else fatigueScore = 0;
    
    // Home teams recover faster
    if (isHome && fatigueScore > 0) {
      fatigueScore *= 0.8;
    }
    
    return {
      restDays,
      isBackToBack,
      isFullRest,
      fatigueScore,
      adjustment: isBackToBack ? B2B_PENALTY : 0,
    };
  }

  /**
   * Detect schedule spots that historically cause upsets.
   */
  static detectScheduleSpot(
    recentGames: Date[],
    nextGame: Date
  ): ScheduleSlot {
    // 3-in-4 and 4-in-5 detection
    const fourDaysAgo = new Date(nextGame.getTime() - 4 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(nextGame.getTime() - 5 * 24 * 60 * 60 * 1000);
    
    const gamesInFour = recentGames.filter(d => d >= fourDaysAgo).length;
    const gamesInFive = recentGames.filter(d => d >= fiveDaysAgo).length;
    
    if (gamesInFive >= 4) return '4_IN_5';
    if (gamesInFour >= 3) return '3_IN_4';
    
    // Back-to-back detection
    const yesterday = new Date(nextGame.getTime() - 24 * 60 * 60 * 1000);
    const hasB2B = recentGames.some(d => 
      d.toDateString() === yesterday.toDateString()
    );
    
    return hasB2B ? 'B2B' : 'NORMAL';
  }

  /**
   * Calculate circadian disruption for travel.
   * West coast teams playing early (EST) games suffer more.
   */
  static calculateCircadianDisruption(
    teamTimezone: 'ET' | 'CT' | 'MT' | 'PT',
    gameTimezone: 'ET' | 'CT' | 'MT' | 'PT',
    gameHour: number // Local game time (0-23)
  ): number {
    const tzOffset: Record<string, number> = { ET: 0, CT: 1, MT: 2, PT: 3 };
    const hoursAhead = tzOffset[teamTimezone] - tzOffset[gameTimezone];
    
    // PT team playing 7pm ET game = 4pm body time (ok)
    // PT team playing 1pm ET game = 10am body time (bad)
    if (hoursAhead > 0 && gameHour < 17) {
      // West coast team, early eastern game
      return hoursAhead * CROSS_COUNTRY_PENALTY;
    }
    
    return 0;
  }

  /**
   * Combine all temporal factors into a single adjustment.
   */
  static getTemporalFactors(
    restAnalysis: RestAnalysis,
    scheduleSlot: ScheduleSlot,
    circadianPenalty: number
  ): TemporalFactors {
    let totalAdjustment = restAnalysis.adjustment + circadianPenalty;
    
    // Additional penalty for bad schedule spots
    if (scheduleSlot === '4_IN_5') totalAdjustment -= 0.04;
    else if (scheduleSlot === '3_IN_4') totalAdjustment -= 0.02;
    
    const description = this.describeFactors(
      restAnalysis,
      scheduleSlot,
      circadianPenalty
    );
    
    return {
      restDays: restAnalysis.restDays,
      scheduleSlot,
      fatigueScore: restAnalysis.fatigueScore,
      circadianPenalty,
      totalAdjustment: Math.round(totalAdjustment * 1000) / 1000,
      description,
    };
  }

  /**
   * Generate human-readable description of temporal factors.
   */
  private static describeFactors(
    rest: RestAnalysis,
    slot: ScheduleSlot,
    circadian: number
  ): string {
    const parts: string[] = [];
    
    if (rest.isBackToBack) parts.push('BACK-TO-BACK');
    else if (rest.restDays === 1) parts.push('1 day rest');
    else if (rest.isFullRest) parts.push('Full rest');
    
    if (slot === '4_IN_5') parts.push('4-in-5 games');
    else if (slot === '3_IN_4') parts.push('3-in-4 games');
    
    if (circadian < 0) parts.push('Circadian disadvantage');
    
    return parts.length > 0 ? parts.join(' | ') : 'Normal schedule';
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if temporal factors are significantly negative.
 */
export function hasScheduleSpotRisk(factors: TemporalFactors): boolean {
  return factors.totalAdjustment < -0.03;
}

/**
 * Format factors for LLM context injection.
 */
export function formatTemporalContext(factors: TemporalFactors): string {
  return `TEMPORAL: ${factors.description} (${(factors.totalAdjustment * 100).toFixed(1)}% adj)`;
}
