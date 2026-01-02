/**
 * Specter Sports Intelligence Demo
 * 
 * Demonstrates the complete analysis pipeline:
 * 1. Elo prediction
 * 2. Rules Engine evaluation
 * 3. Velocity tracking
 * 4. Ensemble voting
 * 5. Fact checking
 */

import {
  EnsembleVoter,
  RulesEngine,
  predictGame,
  formatEloContext,
  VelocityTracker,
  FactChecker,
} from '../src';

import type {
  GameData,
  GameContext,
  LineSnapshot,
  SignalOutput,
} from '../src';

// ============================================================================
// Demo Data
// ============================================================================

const sampleGame: GameData = {
  id: 'nba_lal_bos_20250102',
  league: 'NBA',
  homeTeam: 'Boston Celtics',
  homeAbbr: 'BOS',
  awayTeam: 'Los Angeles Lakers',
  awayAbbr: 'LAL',
  time: '2025-01-02T19:30:00-05:00',
  spread: -7.5,
  total: 224.5,
  homeML: -300,
  awayML: 240,
  status: 'scheduled',
  publicBetPct: 68,
  sharpAction: false,
};

const gameContext: GameContext = {
  homeTeam: 'Boston Celtics',
  awayTeam: 'Los Angeles Lakers',
  homeRestDays: 2,
  awayRestDays: 0,  // Lakers on back-to-back
  publicBetPct: 68,
  sharpAction: false,
  scheduleSpot: 'TRAVEL_B2B',
  fatigueScore: 6,
  isEarlyGame: false,
  circadianDisadvantage: 'AWAY',
};

const lineSnapshots: LineSnapshot[] = [
  { timestamp: '2025-01-01T10:00:00Z', spread: -6.5, total: 225.0, homeML: -260, awayML: 220 },
  { timestamp: '2025-01-01T14:00:00Z', spread: -7.0, total: 224.5, homeML: -280, awayML: 230 },
  { timestamp: '2025-01-02T08:00:00Z', spread: -7.5, total: 224.5, homeML: -300, awayML: 240 },
  { timestamp: '2025-01-02T16:00:00Z', spread: -8.0, total: 224.0, homeML: -320, awayML: 260 },
];

// ============================================================================
// Demo Runner
// ============================================================================

function runDemo(): void {
  console.log('='.repeat(60));
  console.log('   SPECTER SPORTS INTELLIGENCE');
  console.log('   Analysis Pipeline Demo');
  console.log('='.repeat(60));
  console.log();

  // 1. Elo Prediction
  console.log('1. ELO RATING PREDICTION');
  console.log('-'.repeat(50));
  
  const eloPrediction = predictGame(sampleGame.homeTeam, sampleGame.awayTeam);
  console.log(formatEloContext(eloPrediction, sampleGame.homeTeam, sampleGame.awayTeam));
  console.log();

  // 2. Rules Engine
  console.log('2. RULES ENGINE EVALUATION');
  console.log('-'.repeat(50));
  
  const rulesResult = RulesEngine.evaluate(gameContext, eloPrediction.predictedHomeWinProb);
  console.log(RulesEngine.formatForContext(rulesResult));
  console.log();

  // 3. Velocity Tracking
  console.log('3. LINE VELOCITY ANALYSIS');
  console.log('-'.repeat(50));
  
  const velocityResult = VelocityTracker.analyze(lineSnapshots);
  console.log(VelocityTracker.formatForContext(velocityResult));
  console.log();

  // 4. Ensemble Voting
  console.log('4. ENSEMBLE VOTING');
  console.log('-'.repeat(50));
  
  // Simulate Bayesian probability (would come from external model)
  const bayesianProb = 0.65;
  const bayesianRec = 'BET';
  
  const ensembleResult = EnsembleVoter.vote(
    bayesianProb,
    bayesianRec,
    eloPrediction.predictedHomeWinProb,
    eloPrediction.recommendation,
    rulesResult.adjustedProbability,
    rulesResult.recommendation
  );
  
  console.log(EnsembleVoter.formatForContext(ensembleResult));
  console.log();

  // 5. Generate Signal (simulated LLM output)
  console.log('5. SIMULATED LLM SIGNAL');
  console.log('-'.repeat(50));
  
  const signal: SignalOutput = {
    pick: 'Boston Celtics -7.5',
    reasoning: 'The Celtics are 7.5-point favorites at home against a Lakers team on a back-to-back. ' +
      'Boston has a significant rest advantage (2 days vs 0) and the Elo model gives them a 63% win probability. ' +
      'Line has moved from -6.5 to -8.0, indicating sharp money on Boston.',
    tweetText: 'SPECTER SIGNAL: Celtics -7.5 at home tonight. Lakers on a travel B2B from the West Coast. ' +
      'Sharp money moving the line 1.5 points. Trust the process.',
    confidence: 0.72,
    keyFactors: ['Rest advantage', 'Sharp line movement', 'Home court'],
  };
  
  console.log(`Pick: ${signal.pick}`);
  console.log(`Confidence: ${(signal.confidence * 100).toFixed(0)}%`);
  console.log(`Key Factors: ${signal.keyFactors.join(', ')}`);
  console.log();

  // 6. Fact Checking
  console.log('6. FACT CHECKER VERIFICATION');
  console.log('-'.repeat(50));
  
  const validationResult = FactChecker.validate(signal, sampleGame);
  console.log(FactChecker.formatResult(validationResult));
  console.log();

  // 7. Final Decision
  console.log('='.repeat(60));
  console.log('   FINAL DECISION');
  console.log('='.repeat(60));
  console.log();
  
  if (!validationResult.passed) {
    console.log('❌ BLOCKED - Verification failed');
    console.log('   Would regenerate with corrections...');
  } else if (ensembleResult.finalRecommendation === 'BLOCKED') {
    console.log('⛔ BLOCKED - Rules Engine override');
    console.log('   Reason:', rulesResult.summary);
  } else if (ensembleResult.consensus) {
    console.log(`✓ ${ensembleResult.finalRecommendation}`);
    console.log(`   Probability: ${(ensembleResult.finalProbability * 100).toFixed(1)}%`);
    console.log(`   Agreement: ${ensembleResult.agreement}`);
    console.log();
    console.log('   Ready to broadcast to Twitter/Discord');
  } else {
    console.log('⚠ PASS - No consensus');
    console.log(`   ${ensembleResult.agreement}`);
  }
  
  console.log();
  console.log('='.repeat(60));
}

// Run the demo
runDemo();
