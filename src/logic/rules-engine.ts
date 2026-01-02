/**
 * Rules Engine - Situational Handicapping Filter
 * 
 * Applies deterministic rules based on proven betting edges:
 * - Rest advantages
 * - Public fading
 * - Travel back-to-back penalties
 * - Fatigue adjustments
 * - Circadian disruption
 */

import type {
  GameContext,
  RuleViolation,
  RulesResult,
  RuleSeverity,
  Recommendation,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

const Config = {
  PUBLIC_FADE_THRESHOLD: 70,        // % public to trigger fade
  REST_CRITICAL_DIFF: 2,            // Days diff for critical penalty
  FATIGUE_SEVERE_THRESHOLD: 7,      // Score for severe fatigue
  FATIGUE_MODERATE_THRESHOLD: 4,    // Score for moderate fatigue
};

// ============================================================================
// Rule Implementations
// ============================================================================

type RuleCheck = (ctx: GameContext) => RuleViolation | null;

/**
 * REST DISADVANTAGE
 * Team on 0 days rest vs team on 2+ days = significant disadvantage
 */
const restDisadvantage: RuleCheck = (ctx) => {
  if (ctx.homeRestDays === undefined || ctx.awayRestDays === undefined) {
    return null;
  }

  // Home team at rest disadvantage
  if (ctx.homeRestDays === 0 && ctx.awayRestDays >= Config.REST_CRITICAL_DIFF) {
    return {
      rule: 'REST_DISADVANTAGE',
      team: 'home',
      adjustment: -0.05,
      severity: 'critical',
      message: `Home on 0 days rest vs ${ctx.awayRestDays}+ for away`,
    };
  }

  // Away team at rest disadvantage
  if (ctx.awayRestDays === 0 && ctx.homeRestDays >= Config.REST_CRITICAL_DIFF) {
    return {
      rule: 'REST_DISADVANTAGE',
      team: 'away',
      adjustment: -0.05,
      severity: 'critical',
      message: `Away on 0 days rest vs ${ctx.homeRestDays}+ for home`,
    };
  }

  // Moderate rest disadvantage
  if (ctx.homeRestDays === 0 && ctx.awayRestDays >= 1) {
    return {
      rule: 'REST_DISADVANTAGE',
      team: 'home',
      adjustment: -0.03,
      severity: 'warning',
      message: 'Home on back-to-back',
    };
  }

  return null;
};

/**
 * PUBLIC FADE
 * When public is heavy on one side with no sharp confirmation = fade trigger
 */
const publicFade: RuleCheck = (ctx) => {
  if (ctx.publicBetPct === undefined) {
    return null;
  }

  if (ctx.publicBetPct > Config.PUBLIC_FADE_THRESHOLD && !ctx.sharpAction) {
    return {
      rule: 'PUBLIC_FADE',
      team: 'home', // Public usually on home favorites
      adjustment: 0,
      severity: 'auto-pass',
      message: `${ctx.publicBetPct}% public with no sharp confirmation - FADE`,
    };
  }

  return null;
};

/**
 * TRAVEL B2B PENALTY
 * Cross-country travel on back-to-back = significant penalty
 */
const travelPenalty: RuleCheck = (ctx) => {
  if (ctx.scheduleSpot === 'TRAVEL_B2B') {
    return {
      rule: 'TRAVEL_B2B',
      team: 'away',
      adjustment: -0.04,
      severity: 'critical',
      message: 'Cross-country travel back-to-back penalty',
    };
  }

  return null;
};

/**
 * FATIGUE PENALTY
 * Uses fatigue score from TemporalEngine for graduated adjustments
 */
const fatiguePenalty: RuleCheck = (ctx) => {
  if (ctx.fatigueScore === undefined) {
    return null;
  }

  const absScore = Math.abs(ctx.fatigueScore);
  const disadvantagedTeam = ctx.fatigueScore > 0 ? 'away' : 'home';

  if (absScore >= Config.FATIGUE_SEVERE_THRESHOLD) {
    return {
      rule: 'FATIGUE_SEVERE',
      team: disadvantagedTeam,
      adjustment: -0.03,
      severity: 'critical',
      message: `Severe fatigue disadvantage (score: ${ctx.fatigueScore})`,
    };
  }

  if (absScore >= Config.FATIGUE_MODERATE_THRESHOLD) {
    return {
      rule: 'FATIGUE_MODERATE',
      team: disadvantagedTeam,
      adjustment: -0.02,
      severity: 'warning',
      message: `Moderate fatigue disadvantage (score: ${ctx.fatigueScore})`,
    };
  }

  return null;
};

/**
 * CIRCADIAN PENALTY
 * West coast team traveling east for early game
 */
const circadianPenalty: RuleCheck = (ctx) => {
  if (ctx.circadianDisadvantage === 'AWAY' && ctx.isEarlyGame) {
    return {
      rule: 'CIRCADIAN',
      team: 'away',
      adjustment: -0.02,
      severity: 'warning',
      message: 'West coast team with early eastern game',
    };
  }

  return null;
};

/**
 * SCHEDULE SPOT PENALTY
 * 3-in-4, 4-in-5 games = accumulated fatigue
 */
const scheduleSpotPenalty: RuleCheck = (ctx) => {
  switch (ctx.scheduleSpot) {
    case '3_IN_4':
      return {
        rule: 'SCHEDULE_3_IN_4',
        team: 'away', // Usually the traveling team
        adjustment: -0.02,
        severity: 'warning',
        message: '3 games in 4 nights - fatigue risk',
      };

    case '4_IN_5':
      return {
        rule: 'SCHEDULE_4_IN_5',
        team: 'away',
        adjustment: -0.03,
        severity: 'critical',
        message: '4 games in 5 nights - severe fatigue',
      };

    default:
      return null;
  }
};

// ============================================================================
// Rules Engine
// ============================================================================

const ALL_RULES: RuleCheck[] = [
  restDisadvantage,
  publicFade,
  travelPenalty,
  fatiguePenalty,
  circadianPenalty,
  scheduleSpotPenalty,
];

export class RulesEngine {
  /**
   * Evaluate all rules against game context.
   * Returns adjusted probability and any violations.
   */
  static evaluate(ctx: GameContext, baseProbability: number): RulesResult {
    const violations: RuleViolation[] = [];
    let totalAdjustment = 0;
    let blocked = false;

    // Run all rule checks
    for (const rule of ALL_RULES) {
      const violation = rule(ctx);
      if (violation) {
        violations.push(violation);
        totalAdjustment += violation.adjustment;

        if (violation.severity === 'auto-pass') {
          blocked = true;
        }
      }
    }

    // Apply adjustments (clamp to 0-1)
    const adjustedProb = Math.max(0, Math.min(1, baseProbability + totalAdjustment));

    // Determine recommendation
    let recommendation: Recommendation;
    if (blocked) {
      recommendation = 'BLOCKED';
    } else {
      recommendation = this.probToRecommendation(adjustedProb);
    }

    return {
      violations,
      adjustedProbability: Math.round(adjustedProb * 1000) / 1000,
      recommendation,
      summary: this.formatSummary(violations, adjustedProb, blocked),
    };
  }

  /**
   * Convert probability to recommendation.
   */
  private static probToRecommendation(prob: number): Recommendation {
    if (prob >= 0.58) return 'BET';
    if (prob >= 0.54) return 'LEAN';
    if (prob <= 0.42) return 'FADE';
    return 'PASS';
  }

  /**
   * Format result summary.
   */
  private static formatSummary(
    violations: RuleViolation[],
    adjustedProb: number,
    blocked: boolean
  ): string {
    if (blocked) {
      const blockReason = violations.find(v => v.severity === 'auto-pass');
      return `RULES: BLOCKED | ${blockReason?.message || 'Rule violation'}`;
    }

    if (violations.length === 0) {
      return 'RULES: CLEAR | No violations detected';
    }

    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;

    return `RULES: ${criticalCount} critical, ${warningCount} warnings | Adjusted: ${(adjustedProb * 100).toFixed(1)}%`;
  }

  /**
   * Format violations for LLM context injection.
   */
  static formatForContext(result: RulesResult): string {
    const lines = ['=== RULES CHECK ===', result.summary];

    if (result.violations.length > 0) {
      lines.push('Violations:');
      for (const v of result.violations) {
        const icon = v.severity === 'critical' ? '🔴' : v.severity === 'auto-pass' ? '⛔' : '🟡';
        lines.push(`  ${icon} [${v.team.toUpperCase()}] ${v.rule}: ${v.message}`);
      }
    }

    return lines.join('\n');
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if result is blocked by rules.
 */
export function isBlocked(result: RulesResult): boolean {
  return result.recommendation === 'BLOCKED';
}

/**
 * Get total penalty from all violations.
 */
export function getTotalPenalty(result: RulesResult): number {
  return result.violations.reduce((sum, v) => sum + Math.abs(v.adjustment), 0);
}
