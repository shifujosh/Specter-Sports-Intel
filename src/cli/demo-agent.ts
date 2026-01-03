/**
 * Demo Agent - Simulated Analysis Workflow
 * 
 * This demonstrates the Specter analysis pipeline using mock data.
 * No real API calls or proprietary logic is included.
 */

import { EnsembleVoter } from '../logic/ensemble-voter.js';
import { FactChecker } from '../logic/fact-checker.js';
import { VelocityTracker } from '../logic/velocity-tracker.js';
import { TemporalEngine } from '../logic/temporal-engine.js';
import type { GameData, EnsembleResult, VelocityAnalysis, TemporalFactors } from '../types/index.js';

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_GAMES: GameData[] = [
  {
    id: 'demo-1',
    league: 'NBA',
    homeTeam: 'Boston Celtics',
    homeAbbr: 'BOS',
    awayTeam: 'Los Angeles Lakers',
    awayAbbr: 'LAL',
    time: new Date().toISOString(),
    spread: -7.5,
    total: 224.5,
    homeML: -280,
    awayML: +230,
    status: 'scheduled',
    publicBetPct: 0.72,
    sharpAction: false,
  },
  {
    id: 'demo-2',
    league: 'NBA',
    homeTeam: 'Golden State Warriors',
    homeAbbr: 'GSW',
    awayTeam: 'Phoenix Suns',
    awayAbbr: 'PHX',
    time: new Date().toISOString(),
    spread: -3.5,
    total: 231.0,
    homeML: -160,
    awayML: +140,
    status: 'scheduled',
    publicBetPct: 0.55,
    sharpAction: true,
  },
  {
    id: 'demo-3',
    league: 'NBA',
    homeTeam: 'Milwaukee Bucks',
    homeAbbr: 'MIL',
    awayTeam: 'Miami Heat',
    awayAbbr: 'MIA',
    time: new Date().toISOString(),
    spread: -5.0,
    total: 218.5,
    homeML: -200,
    awayML: +170,
    status: 'scheduled',
    publicBetPct: 0.68,
    sharpAction: false,
  },
];

// ============================================================================
// Console Styling
// ============================================================================

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(msg: string, color = COLORS.reset): void {
  console.log(`${color}${msg}${COLORS.reset}`);
}

function header(msg: string): void {
  console.log();
  log(`${'═'.repeat(70)}`, COLORS.cyan);
  log(`  ${msg}`, COLORS.bright + COLORS.cyan);
  log(`${'═'.repeat(70)}`, COLORS.cyan);
}

function step(num: number, msg: string): void {
  log(`\n[STEP ${num}] ${msg}`, COLORS.bright + COLORS.yellow);
}

function success(msg: string): void {
  log(`  ✓ ${msg}`, COLORS.green);
}

function warn(msg: string): void {
  log(`  ⚠ ${msg}`, COLORS.yellow);
}

function info(msg: string): void {
  log(`  → ${msg}`, COLORS.dim);
}

// ============================================================================
// Demo Workflow
// ============================================================================

interface DemoOptions {
  league: string;
  date: string;
  verbose?: boolean;
}

export async function runDemo(options: DemoOptions): Promise<void> {
  const startTime = Date.now();
  
  header(`SPECTER ANALYSIS WORKFLOW - ${options.league.toUpperCase()}`);
  log(`  Date: ${options.date}`, COLORS.dim);
  log(`  Mode: DEMO (Mock Data)`, COLORS.dim);

  // Phase 1: Reconnaissance
  step(1, 'RECONNAISSANCE - Fetching game data');
  await simulateDelay(500);
  
  const games = MOCK_GAMES.filter(g => 
    g.league.toLowerCase() === options.league.toLowerCase()
  );
  
  success(`Found ${games.length} games for ${options.date}`);
  games.forEach(g => info(`${g.awayAbbr} @ ${g.homeAbbr} | Spread: ${g.spread > 0 ? '+' : ''}${g.spread}`));

  // Phase 2: Analysis (per game)
  step(2, 'ANALYSIS - Running ensemble voting');
  
  const results: Array<{
    game: GameData;
    ensemble: EnsembleResult;
    velocity: VelocityAnalysis;
    temporal: TemporalFactors;
  }> = [];

  for (const game of games) {
    await simulateDelay(300);
    
    log(`\n  ┌─ ${game.awayTeam} @ ${game.homeTeam}`, COLORS.bright);
    
    // Simulate model outputs
    const bayesProb = 0.5 + (Math.abs(game.spread) / 20);
    const eloProb = 0.5 + (Math.abs(game.spread) / 25);
    const rulesProb = game.sharpAction ? bayesProb + 0.05 : bayesProb - 0.03;
    
    const ensemble = EnsembleVoter.vote(
      bayesProb,
      game.spread < 0 ? 'HOME' : 'AWAY',
      eloProb,
      game.spread < 0 ? 'HOME' : 'AWAY',
      rulesProb,
      game.publicBetPct && game.publicBetPct > 0.7 && !game.sharpAction ? 'FADE' : 'BET'
    );
    
    // Simulate velocity
    const velocity = VelocityTracker.analyze([
      { timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), spread: game.spread + 1, total: game.total, homeML: game.homeML, awayML: game.awayML },
      { timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), spread: game.spread + 0.5, total: game.total, homeML: game.homeML, awayML: game.awayML },
      { timestamp: new Date().toISOString(), spread: game.spread, total: game.total, homeML: game.homeML, awayML: game.awayML },
    ]);
    
    // Simulate temporal
    const restAnalysis = TemporalEngine.analyzeRest(
      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      new Date(),
      true
    );
    const temporal = TemporalEngine.getTemporalFactors(
      restAnalysis,
      TemporalEngine.detectScheduleSpot([], new Date()),
      0
    );
    
    results.push({ game, ensemble, velocity, temporal });
    
    // Display results
    log(`  │  Bayesian: ${(bayesProb * 100).toFixed(1)}%`, COLORS.dim);
    log(`  │  Elo:      ${(eloProb * 100).toFixed(1)}%`, COLORS.dim);
    log(`  │  Rules:    ${(rulesProb * 100).toFixed(1)}%`, COLORS.dim);
    log(`  │`, COLORS.dim);
    
    const recColor = ensemble.finalRecommendation.includes('BET') ? COLORS.green : 
                     ensemble.finalRecommendation === 'PASS' ? COLORS.yellow : COLORS.red;
    log(`  └─ ENSEMBLE: ${ensemble.finalRecommendation} (${(ensemble.finalProbability * 100).toFixed(1)}%) | ${ensemble.agreement}`, recColor);
    
    if (velocity.isSteamMove) {
      warn(`Steam Move Detected: ${velocity.steamDirection}`);
    }
  }

  // Phase 3: Verification
  step(3, 'VERIFICATION - Fact-checking outputs');
  await simulateDelay(400);
  
  let passCount = 0;
  for (const r of results) {
    const mockSignal = {
      pick: `${r.game.homeAbbr} ${r.game.spread}`,
      reasoning: `The ${r.game.homeTeam} are ${Math.abs(r.game.spread)}-point favorites at home.`,
      tweetText: `SIGNAL: ${r.game.homeAbbr} ${r.game.spread}`,
      confidence: r.ensemble.finalProbability,
      keyFactors: ['home court', 'spread value'],
    };
    
    const validation = FactChecker.validate(mockSignal, r.game);
    if (validation.passed) {
      success(`${r.game.awayAbbr} @ ${r.game.homeAbbr} - VERIFIED`);
      passCount++;
    } else {
      warn(`${r.game.awayAbbr} @ ${r.game.homeAbbr} - FAILED: ${validation.issues.join(', ')}`);
    }
  }
  
  info(`${passCount}/${results.length} signals passed verification`);

  // Phase 4: Signal Generation
  step(4, 'SIGNAL - Generating recommendations');
  await simulateDelay(300);
  
  const signals = results.filter(r => 
    r.ensemble.finalRecommendation === 'BET' || 
    r.ensemble.finalRecommendation === 'STRONG_BET'
  );
  
  if (signals.length === 0) {
    info('No actionable signals for today. Consensus not reached.');
  } else {
    success(`${signals.length} actionable signal(s) generated`);
    signals.forEach(s => {
      const pick = s.game.spread < 0 ? s.game.homeAbbr : s.game.awayAbbr;
      const spread = s.game.spread < 0 ? s.game.spread : -s.game.spread;
      log(`\n  ┌────────────────────────────────────────┐`, COLORS.green);
      log(`  │  SIGNAL: ${pick} ${spread > 0 ? '+' : ''}${spread.toFixed(1)}`.padEnd(41) + '│', COLORS.bright + COLORS.green);
      log(`  │  Confidence: ${(s.ensemble.finalProbability * 100).toFixed(1)}%`.padEnd(41) + '│', COLORS.green);
      log(`  │  ${s.ensemble.agreement}`.padEnd(41) + '│', COLORS.green);
      log(`  └────────────────────────────────────────┘`, COLORS.green);
    });
  }

  // Phase 5: Output Generation
  step(5, 'OUTPUT - Visual asset generation');
  await simulateDelay(300);
  
  if (signals.length > 0) {
    info('Generating match cards... (simulated)');
    await simulateDelay(200);
    success('Match cards generated: 3 files');
    
    info('Preparing social posts... (simulated)');
    await simulateDelay(200);
    success('Twitter thread drafted');
    success('Discord embed prepared');
  } else {
    info('No signals to broadcast. Staying silent.');
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  header('WORKFLOW COMPLETE');
  log(`  Duration: ${elapsed}s`, COLORS.dim);
  log(`  Games Analyzed: ${games.length}`, COLORS.dim);
  log(`  Signals Generated: ${signals.length}`, COLORS.dim);
  log(`  Verification Rate: ${((passCount / results.length) * 100).toFixed(0)}%`, COLORS.dim);
  console.log();
  
  log('This was a DEMO run with mock data.', COLORS.yellow);
  log('Production version includes real-time odds, LLM analysis, and automated posting.', COLORS.dim);
  console.log();
}

// ============================================================================
// Helpers
// ============================================================================

function simulateDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
