/**
 * Type definitions for Specter Sports Intelligence
 */

// ============================================================================
// Core Game Types
// ============================================================================

export type League = 'NBA' | 'NFL' | 'NCAAF' | 'NCAAB';

export interface GameData {
  id: string;
  league: League;
  homeTeam: string;
  homeAbbr: string;
  awayTeam: string;
  awayAbbr: string;
  time: string;           // ISO 8601
  spread: number;         // Negative = home favored
  total: number;
  homeML: number;
  awayML: number;
  homeScore?: number;
  awayScore?: number;
  status: 'scheduled' | 'live' | 'final';
  publicBetPct?: number;
  sharpAction?: boolean;
}

export interface TeamStats {
  team: string;
  wins: number;
  losses: number;
  pointsPerGame: number;
  pointsAllowedPerGame: number;
  offensiveRating: number;
  defensiveRating: number;
  pace: number;
  recentForm: number[];   // Last 10 game margins
}

// ============================================================================
// Model Types
// ============================================================================

export type Confidence = 'high' | 'medium' | 'low';
export type Recommendation = 'BET' | 'LEAN' | 'PASS' | 'FADE' | 'BLOCKED';

export interface ModelVote {
  model: 'bayes' | 'elo' | 'rules';
  probability: number;
  recommendation: string;
  confidence: Confidence;
}

export interface EnsembleResult {
  votes: ModelVote[];
  consensus: boolean;
  finalProbability: number;
  finalRecommendation: 'STRONG_BET' | Recommendation;
  agreement: string;
  summary: string;
}

// ============================================================================
// Elo Types
// ============================================================================

export interface TeamElo {
  team: string;
  rating: number;
  games: number;
  lastUpdated: string;
}

export interface EloResult {
  homeElo: number;
  awayElo: number;
  predictedHomeWinProb: number;
  expectedMargin: number;
  recommendation: 'HOME' | 'AWAY' | 'NEUTRAL';
}

// ============================================================================
// Rules Engine Types
// ============================================================================

export type RuleSeverity = 'warning' | 'critical' | 'auto-pass';

export interface RuleViolation {
  rule: string;
  team: 'home' | 'away';
  adjustment: number;
  severity: RuleSeverity;
  message: string;
}

export interface RulesResult {
  violations: RuleViolation[];
  adjustedProbability: number;
  recommendation: Recommendation;
  summary: string;
}

export interface GameContext {
  homeTeam: string;
  awayTeam: string;
  homeRestDays?: number;
  awayRestDays?: number;
  publicBetPct?: number;
  sharpAction?: boolean;
  isBackToBack?: { home: boolean; away: boolean };
  homeRecord?: { wins: number; losses: number };
  awayRecord?: { wins: number; losses: number };
  fatigueScore?: number;
  scheduleSpot?: 'NORMAL' | 'B2B' | '3_IN_4' | '4_IN_5' | 'TRAVEL_B2B';
  timeZoneShift?: number;
  isEarlyGame?: boolean;
  circadianDisadvantage?: 'HOME' | 'AWAY' | 'NONE';
}

// ============================================================================
// Temporal Types
// ============================================================================

export type ScheduleSpot = 'NORMAL' | 'B2B' | '3_IN_4' | '4_IN_5' | 'TRAVEL_B2B';
export type SeasonPhase = 'EARLY' | 'MID' | 'LATE' | 'PLAYOFF_PUSH';

export interface ScheduleContext {
  homeRestDays: number;
  awayRestDays: number;
  homeGamesLast7: number;
  awayGamesLast7: number;
  scheduleSpot: ScheduleSpot;
  fatigueAdvantage: 'HOME' | 'AWAY' | 'EVEN';
  fatigueScore: number;   // -10 to +10
}

export interface CircadianContext {
  gameLocalTimeHome: string;
  gameLocalTimeAway: string;
  isEarlyGameForAway: boolean;
  timeZoneShift: number;
  circadianDisadvantage: 'HOME' | 'AWAY' | 'NONE';
}

export interface SeasonalContext {
  seasonPhase: SeasonPhase;
  homeGamesPlayed: number;
  awayGamesPlayed: number;
  isPlayoffContender: { home: boolean; away: boolean };
}

export interface TemporalContext {
  schedule: ScheduleContext;
  circadian: CircadianContext;
  seasonal: SeasonalContext;
  summary: string;
}

// ============================================================================
// Velocity Types
// ============================================================================

export interface LineSnapshot {
  timestamp: string;
  spread: number;
  total: number;
  homeML: number;
  awayML: number;
}

export interface VelocityAnalysis {
  spreadVelocity: number;        // pts/hour
  totalVelocity: number;
  spreadMoved: number;
  totalMoved: number;
  hoursTracked: number;
  isSteamMove: boolean;
  steamDirection: 'HOME' | 'AWAY' | 'OVER' | 'UNDER' | null;
  lateMovement: boolean;
  summary: string;
}

// ============================================================================
// Verification Types
// ============================================================================

export interface SignalOutput {
  pick: string;
  reasoning: string;
  tweetText: string;
  confidence: number;
  keyFactors: string[];
}

export interface ValidationResult {
  passed: boolean;
  issues: string[];
  correctedText?: string;
}

// ============================================================================
// Output Types
// ============================================================================

export interface AnalysisResult {
  game: GameData;
  ensemble: EnsembleResult;
  temporal: TemporalContext;
  velocity: VelocityAnalysis;
  validation: ValidationResult;
  signal?: SignalOutput;
}
