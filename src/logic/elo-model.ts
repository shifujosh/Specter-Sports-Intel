/**
 * Elo Rating System - Team Power Rankings
 * 
 * Implements a standard Elo rating system with adjustments for:
 * - Home court advantage
 * - Margin of victory
 * - League-specific calibration
 */

import type { TeamElo, EloResult } from '../types';

// ============================================================================
// Configuration
// ============================================================================

const BASE_ELO = 1500;
const K_FACTOR = 20;
const HOME_ADVANTAGE = 100;

// ============================================================================
// Team Ratings (Simulated - would persist to database in production)
// ============================================================================

const eloRatings: Map<string, TeamElo> = new Map();

/**
 * Initialize NBA team Elo ratings based on prior season performance.
 */
export function initializeNbaElo(): void {
  const initialRatings: Record<string, number> = {
    // Elite Tier
    'Celtics': 1650, 'Thunder': 1620, 'Nuggets': 1600,
    // Contenders
    'Bucks': 1580, 'Timberwolves': 1575, 'Cavaliers': 1570,
    'Knicks': 1560, 'Suns': 1550, 'Mavericks': 1545,
    // Playoff Teams
    'Clippers': 1530, 'Pacers': 1525, 'Heat': 1520,
    'Magic': 1515, 'Kings': 1510, '76ers': 1505,
    'Pelicans': 1500, 'Lakers': 1495,
    // Bubble Teams
    'Warriors': 1480, 'Hawks': 1475, 'Bulls': 1470,
    'Rockets': 1465, 'Grizzlies': 1460,
    // Rebuilding
    'Jazz': 1450, 'Raptors': 1445, 'Nets': 1440,
    'Spurs': 1435, 'Trail Blazers': 1430, 'Hornets': 1425,
    'Pistons': 1420, 'Wizards': 1410,
  };

  for (const [team, rating] of Object.entries(initialRatings)) {
    eloRatings.set(team.toLowerCase(), {
      team,
      rating,
      games: 0,
      lastUpdated: new Date().toISOString(),
    });
  }
}

/**
 * Initialize NFL team Elo ratings.
 */
export function initializeNflElo(): void {
  const initialRatings: Record<string, number> = {
    // Elite
    'Chiefs': 1650, 'Eagles': 1620, '49ers': 1610, 'Lions': 1600,
    // Contenders
    'Bills': 1580, 'Ravens': 1575, 'Cowboys': 1560, 'Dolphins': 1550,
    'Bengals': 1545, 'Texans': 1540, 'Packers': 1535, 'Steelers': 1525,
    // Playoff Caliber
    'Browns': 1515, 'Rams': 1510, 'Seahawks': 1505, 'Jaguars': 1500,
    'Jets': 1495, 'Chargers': 1490, 'Broncos': 1485, 'Vikings': 1480,
    // Middle
    'Saints': 1470, 'Colts': 1465, 'Falcons': 1460, 'Raiders': 1455,
    'Bears': 1450, 'Titans': 1445, 'Buccaneers': 1440, 'Giants': 1435,
    // Rebuilding
    'Cardinals': 1425, 'Patriots': 1420, 'Commanders': 1415, 'Panthers': 1410,
  };

  for (const [team, rating] of Object.entries(initialRatings)) {
    eloRatings.set(team.toLowerCase(), {
      team,
      rating,
      games: 0,
      lastUpdated: new Date().toISOString(),
    });
  }
}

// ============================================================================
// Elo Calculations
// ============================================================================

/**
 * Get team Elo rating with fuzzy matching.
 */
function getTeamElo(teamName: string): number {
  const normalized = teamName.toLowerCase();

  // Direct match
  if (eloRatings.has(normalized)) {
    return eloRatings.get(normalized)!.rating;
  }

  // Fuzzy match on team name parts
  for (const [key, value] of eloRatings.entries()) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value.rating;
    }
  }

  // Default to base Elo if not found
  return BASE_ELO;
}

/**
 * Calculate expected win probability using Elo formula.
 * P(A wins) = 1 / (1 + 10^((Rb - Ra) / 400))
 */
function expectedWinProbability(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Convert Elo difference to expected point margin.
 * Roughly: 25 Elo points = 1 point margin
 */
function eloToMargin(eloDiff: number): number {
  return eloDiff / 25;
}

/**
 * Predict game outcome using Elo ratings.
 */
export function predictGame(homeTeam: string, awayTeam: string): EloResult {
  // Ensure ratings are initialized
  if (eloRatings.size === 0) {
    initializeNbaElo();
  }

  const homeElo = getTeamElo(homeTeam);
  const awayElo = getTeamElo(awayTeam);

  // Add home advantage
  const adjustedHomeElo = homeElo + HOME_ADVANTAGE;

  const homeWinProb = expectedWinProbability(adjustedHomeElo, awayElo);
  const eloDiff = adjustedHomeElo - awayElo;
  const expectedMargin = eloToMargin(eloDiff);

  let recommendation: EloResult['recommendation'];
  if (homeWinProb > 0.55) {
    recommendation = 'HOME';
  } else if (homeWinProb < 0.45) {
    recommendation = 'AWAY';
  } else {
    recommendation = 'NEUTRAL';
  }

  return {
    homeElo,
    awayElo,
    predictedHomeWinProb: Math.round(homeWinProb * 1000) / 1000,
    expectedMargin: Math.round(expectedMargin * 10) / 10,
    recommendation,
  };
}

/**
 * Update Elo ratings after a game result.
 * 
 * @param homeTeam - Home team name
 * @param awayTeam - Away team name
 * @param homeWon - Whether home team won
 * @param marginOfVictory - Point margin (optional, for MOV adjustment)
 */
export function updateElo(
  homeTeam: string,
  awayTeam: string,
  homeWon: boolean,
  marginOfVictory: number = 0
): void {
  const homeKey = homeTeam.toLowerCase();
  const awayKey = awayTeam.toLowerCase();

  const homeEloRecord = eloRatings.get(homeKey);
  const awayEloRecord = eloRatings.get(awayKey);

  if (!homeEloRecord || !awayEloRecord) return;

  const homeElo = homeEloRecord.rating + HOME_ADVANTAGE;
  const awayElo = awayEloRecord.rating;

  const expectedHome = expectedWinProbability(homeElo, awayElo);
  const actualHome = homeWon ? 1 : 0;

  // Margin of victory multiplier (caps at 2x for blowouts)
  const movMultiplier = Math.min(2, 1 + Math.log10(Math.abs(marginOfVictory) + 1) * 0.5);

  const eloChange = K_FACTOR * movMultiplier * (actualHome - expectedHome);

  homeEloRecord.rating += eloChange;
  homeEloRecord.games += 1;
  homeEloRecord.lastUpdated = new Date().toISOString();

  awayEloRecord.rating -= eloChange;
  awayEloRecord.games += 1;
  awayEloRecord.lastUpdated = new Date().toISOString();
}

/**
 * Format Elo prediction for LLM context.
 */
export function formatEloContext(result: EloResult, homeTeam: string, awayTeam: string): string {
  return `ELO: ${homeTeam} ${result.homeElo} vs ${awayTeam} ${result.awayElo} | ` +
    `Predicted: ${(result.predictedHomeWinProb * 100).toFixed(1)}% HOME | ` +
    `Margin: ${result.expectedMargin > 0 ? '+' : ''}${result.expectedMargin} | ` +
    `REC: ${result.recommendation}`;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all current Elo ratings.
 */
export function getAllRatings(): TeamElo[] {
  return Array.from(eloRatings.values()).sort((a, b) => b.rating - a.rating);
}

/**
 * Get top N teams by Elo.
 */
export function getTopTeams(n: number): TeamElo[] {
  return getAllRatings().slice(0, n);
}

// Initialize on module load
initializeNbaElo();
