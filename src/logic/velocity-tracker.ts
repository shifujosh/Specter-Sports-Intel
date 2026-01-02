/**
 * Velocity Tracker - Line Movement Analysis
 * 
 * Tracks betting line movements to detect:
 * - Steam moves (sharp money action)
 * - Late movement (last 2 hours before game)
 * - Movement direction and velocity
 */

import type { LineSnapshot, VelocityAnalysis } from '../types';

// ============================================================================
// Configuration
// ============================================================================

const STEAM_THRESHOLD = 0.5;      // pts/hour to consider steam
const LATE_WINDOW_HOURS = 2;      // Hours before game for "late" detection

// ============================================================================
// Velocity Tracker
// ============================================================================

export class VelocityTracker {
  /**
   * Calculate line movement velocity from historical snapshots.
   */
  static analyze(snapshots: LineSnapshot[]): VelocityAnalysis {
    if (snapshots.length < 2) {
      return this.noDataResult();
    }

    // Sort by timestamp
    const sorted = [...snapshots].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    // Calculate time elapsed
    const startTime = new Date(first.timestamp).getTime();
    const endTime = new Date(last.timestamp).getTime();
    const hoursTracked = (endTime - startTime) / (1000 * 60 * 60);

    if (hoursTracked < 0.1) {
      return this.noDataResult();
    }

    // Calculate movement
    const spreadMoved = last.spread - first.spread;
    const totalMoved = last.total - first.total;

    // Calculate velocity (pts/hour)
    const spreadVelocity = spreadMoved / hoursTracked;
    const totalVelocity = totalMoved / hoursTracked;

    // Detect steam moves
    const { isSteamMove, steamDirection } = this.detectSteam(spreadVelocity, totalVelocity);

    // Check for late movement
    const lateMovement = this.detectLateMovement(sorted);

    // Generate summary
    const summary = this.generateSummary(
      spreadMoved,
      totalMoved,
      hoursTracked,
      isSteamMove,
      steamDirection,
      lateMovement
    );

    return {
      spreadVelocity: Math.round(spreadVelocity * 100) / 100,
      totalVelocity: Math.round(totalVelocity * 100) / 100,
      spreadMoved: Math.round(spreadMoved * 10) / 10,
      totalMoved: Math.round(totalMoved * 10) / 10,
      hoursTracked: Math.round(hoursTracked * 10) / 10,
      isSteamMove,
      steamDirection,
      lateMovement,
      summary,
    };
  }

  /**
   * Detect steam moves based on velocity thresholds.
   */
  private static detectSteam(
    spreadVelocity: number,
    totalVelocity: number
  ): { isSteamMove: boolean; steamDirection: VelocityAnalysis['steamDirection'] } {
    const absSpread = Math.abs(spreadVelocity);
    const absTotal = Math.abs(totalVelocity);

    // Spread steam takes priority
    if (absSpread >= STEAM_THRESHOLD) {
      return {
        isSteamMove: true,
        steamDirection: spreadVelocity > 0 ? 'HOME' : 'AWAY',
      };
    }

    // Total steam
    if (absTotal >= STEAM_THRESHOLD) {
      return {
        isSteamMove: true,
        steamDirection: totalVelocity > 0 ? 'OVER' : 'UNDER',
      };
    }

    return { isSteamMove: false, steamDirection: null };
  }

  /**
   * Detect significant movement in the last N hours.
   */
  private static detectLateMovement(sortedSnapshots: LineSnapshot[]): boolean {
    if (sortedSnapshots.length < 2) return false;

    const last = sortedSnapshots[sortedSnapshots.length - 1];
    const lastTime = new Date(last.timestamp).getTime();
    const cutoffTime = lastTime - LATE_WINDOW_HOURS * 60 * 60 * 1000;

    // Find snapshots within late window
    const recentSnapshots = sortedSnapshots.filter(
      s => new Date(s.timestamp).getTime() >= cutoffTime
    );

    if (recentSnapshots.length < 2) return false;

    const recentFirst = recentSnapshots[0];
    const spreadChange = Math.abs(last.spread - recentFirst.spread);
    const totalChange = Math.abs(last.total - recentFirst.total);

    // Late movement if > 0.5 pts in last window
    return spreadChange >= 0.5 || totalChange >= 0.5;
  }

  /**
   * Generate human-readable summary.
   */
  private static generateSummary(
    spreadMoved: number,
    totalMoved: number,
    hoursTracked: number,
    isSteamMove: boolean,
    steamDirection: string | null,
    lateMovement: boolean
  ): string {
    const parts: string[] = [];

    if (Math.abs(spreadMoved) >= 0.5) {
      const dir = spreadMoved > 0 ? 'toward HOME' : 'toward AWAY';
      parts.push(`Spread moved ${Math.abs(spreadMoved).toFixed(1)} pts ${dir} in ${hoursTracked.toFixed(1)}h`);
    }

    if (Math.abs(totalMoved) >= 0.5) {
      const dir = totalMoved > 0 ? 'UP' : 'DOWN';
      parts.push(`Total moved ${Math.abs(totalMoved).toFixed(1)} pts ${dir}`);
    }

    if (isSteamMove) {
      parts.push(`**STEAM MOVE DETECTED: ${steamDirection}**`);
    }

    if (lateMovement) {
      parts.push(`Late movement detected (last ${LATE_WINDOW_HOURS}h)`);
    }

    if (parts.length === 0) {
      return 'Line stable - minimal movement';
    }

    return parts.join(' | ');
  }

  /**
   * Return empty result when no data available.
   */
  private static noDataResult(): VelocityAnalysis {
    return {
      spreadVelocity: 0,
      totalVelocity: 0,
      spreadMoved: 0,
      totalMoved: 0,
      hoursTracked: 0,
      isSteamMove: false,
      steamDirection: null,
      lateMovement: false,
      summary: 'No line history available',
    };
  }

  /**
   * Format velocity analysis for context injection.
   */
  static formatForContext(analysis: VelocityAnalysis): string {
    if (analysis.hoursTracked === 0) {
      return '=== LINE VELOCITY ===\nNo line history available';
    }

    const lines = [
      '=== LINE VELOCITY ===',
      analysis.summary,
    ];

    if (analysis.isSteamMove) {
      lines.push(`VELOCITY: ${Math.abs(analysis.spreadVelocity).toFixed(2)} pts/hour`);
    }

    return lines.join('\n');
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if there's a steam move.
 */
export function hasSteam(analysis: VelocityAnalysis): boolean {
  return analysis.isSteamMove;
}

/**
 * Get steam direction if present.
 */
export function getSteamDirection(analysis: VelocityAnalysis): string | null {
  return analysis.steamDirection;
}

/**
 * Check if there's late movement.
 */
export function hasLateMovement(analysis: VelocityAnalysis): boolean {
  return analysis.lateMovement;
}
