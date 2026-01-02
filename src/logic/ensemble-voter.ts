/**
 * Ensemble Voter - Multi-Model Consensus System
 * 
 * Aggregates predictions from three independent models:
 * 1. Bayesian Win Probability (Bradley-Terry)
 * 2. Elo Rating Model
 * 3. Rules Engine (situational filters)
 * 
 * Only recommends BET when 2/3 models agree.
 */

import type {
  ModelVote,
  EnsembleResult,
  Confidence,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

const STRONG_BET_THRESHOLD = 0.60;
const HIGH_CONFIDENCE_EDGE = 0.15;
const MEDIUM_CONFIDENCE_EDGE = 0.08;

// ============================================================================
// Ensemble Voter
// ============================================================================

export class EnsembleVoter {
  /**
   * Combine predictions from multiple models into a final decision.
   * 
   * @param bayesianProb - Win probability from Bayesian model (0-1)
   * @param bayesianRec - Recommendation from Bayesian model
   * @param eloProb - Win probability from Elo model (0-1)
   * @param eloRec - Recommendation from Elo model (HOME/AWAY/NEUTRAL)
   * @param rulesProb - Adjusted probability from Rules Engine
   * @param rulesRec - Recommendation from Rules Engine (BET/PASS/BLOCKED)
   */
  static vote(
    bayesianProb: number | null,
    bayesianRec: string | null,
    eloProb: number,
    eloRec: string,
    rulesProb: number,
    rulesRec: string
  ): EnsembleResult {
    const votes: ModelVote[] = [];

    // Bayesian vote (optional - may not be available)
    if (bayesianProb !== null && bayesianRec !== null) {
      votes.push({
        model: 'bayes',
        probability: bayesianProb,
        recommendation: bayesianRec,
        confidence: this.getConfidence(bayesianProb),
      });
    }

    // Elo vote
    votes.push({
      model: 'elo',
      probability: eloProb,
      recommendation: eloRec,
      confidence: this.getConfidence(eloProb),
    });

    // Rules vote
    votes.push({
      model: 'rules',
      probability: rulesProb,
      recommendation: rulesRec,
      confidence: rulesRec === 'BLOCKED' ? 'high' : this.getConfidence(rulesProb),
    });

    // Check for blockers - Rules Engine override
    const blocked = votes.find(v => v.recommendation === 'BLOCKED');
    if (blocked) {
      return {
        votes,
        consensus: true,
        finalProbability: rulesProb,
        finalRecommendation: 'BLOCKED',
        agreement: 'BLOCKED by rules',
        summary: 'ENSEMBLE: BLOCKED - RulesEngine override',
      };
    }

    // Count agreeing models
    const betVotes = votes.filter(v =>
      v.recommendation === 'BET' || v.recommendation === 'HOME'
    ).length;

    const passVotes = votes.filter(v =>
      v.recommendation === 'PASS' || v.recommendation === 'NEUTRAL'
    ).length;

    const fadeVotes = votes.filter(v =>
      v.recommendation === 'FADE' || v.recommendation === 'AWAY'
    ).length;

    // Calculate weighted average probability
    const totalProb = votes.reduce((sum, v) => sum + v.probability, 0);
    const avgProb = totalProb / votes.length;

    // Determine consensus
    const modelCount = votes.length;
    const consensus = betVotes >= 2 || passVotes >= 2 || fadeVotes >= 2;

    // Final recommendation based on vote count
    let finalRecommendation: EnsembleResult['finalRecommendation'];
    let agreement: string;

    if (betVotes >= 2 && avgProb > STRONG_BET_THRESHOLD) {
      finalRecommendation = 'STRONG_BET';
      agreement = `${betVotes}/${modelCount} models agree BET`;
    } else if (betVotes >= 2) {
      finalRecommendation = 'BET';
      agreement = `${betVotes}/${modelCount} models agree BET`;
    } else if (fadeVotes >= 2) {
      finalRecommendation = 'FADE';
      agreement = `${fadeVotes}/${modelCount} models agree FADE`;
    } else if (betVotes === 1 && passVotes <= 1) {
      finalRecommendation = 'LEAN';
      agreement = `Split decision - ${betVotes} BET, ${passVotes} PASS`;
    } else {
      finalRecommendation = 'PASS';
      agreement = `No consensus - ${betVotes} BET, ${passVotes} PASS, ${fadeVotes} FADE`;
    }

    const summary = `ENSEMBLE: ${finalRecommendation} (${(avgProb * 100).toFixed(1)}%) | ${agreement}`;

    return {
      votes,
      consensus,
      finalProbability: Math.round(avgProb * 1000) / 1000,
      finalRecommendation,
      agreement,
      summary,
    };
  }

  /**
   * Determine confidence level from probability edge.
   * Edge is the distance from 50% (coin flip).
   */
  private static getConfidence(prob: number): Confidence {
    const edge = Math.abs(prob - 0.5);
    if (edge > HIGH_CONFIDENCE_EDGE) return 'high';
    if (edge > MEDIUM_CONFIDENCE_EDGE) return 'medium';
    return 'low';
  }

  /**
   * Format ensemble result for injection into LLM context.
   */
  static formatForContext(result: EnsembleResult): string {
    const lines = [
      result.summary,
      ...result.votes.map(v =>
        `  ${v.model.toUpperCase()}: ${(v.probability * 100).toFixed(1)}% | ${v.recommendation} (${v.confidence})`
      ),
    ];
    return lines.join('\n');
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Simple helper to determine if we should proceed with the bet.
 */
export function shouldBet(result: EnsembleResult): boolean {
  return result.finalRecommendation === 'STRONG_BET' || result.finalRecommendation === 'BET';
}

/**
 * Get the confidence level as a numeric score (0-1).
 */
export function confidenceToScore(confidence: Confidence): number {
  switch (confidence) {
    case 'high': return 1.0;
    case 'medium': return 0.6;
    case 'low': return 0.3;
  }
}
