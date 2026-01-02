# 3. Rules Engine for Situational Handicapping

**Date:** 2025-11-02

**Status:** Accepted

---

## Context

Statistical models and LLMs miss real-world situational factors that matter in sports betting:

- A team on a back-to-back after cross-country travel
- Public money heavily favoring one side with no sharp confirmation
- A heavy favorite after a statement win (trap game)
- Schedule congestion (3 games in 4 nights)

These are well-documented edges in the sports betting community, but models don't naturally capture them.

### Problem Statement

Models predicted a 60% home win probability. But:
- Home team is on 0 days rest
- Away team had 3 days off
- 75% of public bets on home team
- No sharp action on home team

The model is blind to these red flags.

---

## Decision

Implement a **Rules Engine** that applies deterministic situational adjustments and can BLOCK recommendations that violate hard constraints.

### Architecture

```
              ┌─────────────────────────────────┐
              │         Base Probability        │
              │         (from Elo/Bayes)        │
              └──────────────┬──────────────────┘
                             │
                             ▼
    ┌────────────────────────────────────────────────┐
    │                 RULES ENGINE                    │
    │                                                 │
    │  ┌──────────────┐   ┌──────────────┐           │
    │  │ Rest Check   │   │ Public Fade  │           │
    │  │ (-3 to -5)   │   │ (auto-FADE)  │           │
    │  └──────────────┘   └──────────────┘           │
    │                                                 │
    │  ┌──────────────┐   ┌──────────────┐           │
    │  │ Travel B2B   │   │ Trap Game    │           │
    │  │ (-4 pts)     │   │ (WARNING)    │           │
    │  └──────────────┘   └──────────────┘           │
    │                                                 │
    │  ┌──────────────┐   ┌──────────────┐           │
    │  │ Fatigue      │   │ Circadian    │           │
    │  │ (graduated)  │   │ (-2 pts)     │           │
    │  └──────────────┘   └──────────────┘           │
    │                                                 │
    └──────────────────────┬─────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────────────┐
              │       Adjusted Probability      │
              │   + Violation Warnings/Blocks   │
              └─────────────────────────────────┘
```

---

## Rules Implemented

### 1. Rest Disadvantage

| Scenario | Penalty |
|----------|---------|
| 0 days rest vs 2+ days | -5 points |
| 0 days rest vs 1 day | -3 points |
| 1 day rest vs 3+ days | -2 points |

```typescript
function restDisadvantage(ctx: GameContext): RuleViolation | null {
  const homeDiff = ctx.awayRestDays - ctx.homeRestDays;
  
  if (ctx.homeRestDays === 0 && ctx.awayRestDays >= 2) {
    return {
      rule: 'REST_DISADVANTAGE',
      team: 'home',
      adjustment: -0.05,  // -5%
      severity: 'critical',
      message: 'Home on 0 days rest vs 2+ for away'
    };
  }
  return null;
}
```

### 2. Public Fade

When >70% of public bets are on one side with no sharp confirmation, fade the public.

```typescript
function publicFade(ctx: GameContext): RuleViolation | null {
  if (ctx.publicBetPct && ctx.publicBetPct > 70 && !ctx.sharpAction) {
    return {
      rule: 'PUBLIC_FADE',
      team: ctx.publicBetPct > 50 ? 'home' : 'away', // Fade popular side
      adjustment: 0,
      severity: 'auto-pass',
      message: `${ctx.publicBetPct}% public with no sharp confirmation`
    };
  }
  return null;
}
```

### 3. Travel Back-to-Back

Cross-country travel combined with back-to-back games.

```typescript
function travelBackToBack(ctx: GameContext): RuleViolation | null {
  if (ctx.scheduleSpot === 'TRAVEL_B2B') {
    return {
      rule: 'TRAVEL_B2B',
      team: 'away',
      adjustment: -0.04,  // -4%
      severity: 'critical',
      message: 'Cross-country travel on back-to-back'
    };
  }
  return null;
}
```

### 4. Fatigue Score (Graduated)

Uses the Temporal Engine's fatigue score for graduated adjustments.

| Fatigue Score | Penalty |
|--------------|---------|
| > 7 (severe) | -3% |
| 4-7 (moderate) | -2% |
| 2-4 (mild) | -1% |

### 5. Circadian Disruption

West coast team traveling east for a game starting before 4 PM local time.

```typescript
function circadianDisruption(ctx: GameContext): RuleViolation | null {
  if (ctx.circadianDisadvantage === 'AWAY' && ctx.isEarlyGame) {
    return {
      rule: 'CIRCADIAN',
      team: 'away',
      adjustment: -0.02,
      severity: 'warning',
      message: 'West coast team with early eastern game'
    };
  }
  return null;
}
```

---

## Implementation

### RulesResult

```typescript
interface RulesResult {
  violations: RuleViolation[];
  adjustedProbability: number;
  recommendation: 'BET' | 'LEAN' | 'PASS' | 'FADE' | 'BLOCKED';
  summary: string;
}
```

### Evaluation

```typescript
class RulesEngine {
  static evaluate(ctx: GameContext, baseProbability: number): RulesResult {
    const violations: RuleViolation[] = [];
    let adjustment = 0;
    let blocked = false;
    
    // Run all rules
    const checks = [
      restDisadvantage,
      publicFade,
      travelBackToBack,
      fatiguePenalty,
      circadianDisruption,
      trapGame
    ];
    
    for (const check of checks) {
      const violation = check(ctx);
      if (violation) {
        violations.push(violation);
        adjustment += violation.adjustment;
        if (violation.severity === 'auto-pass') {
          blocked = true;
        }
      }
    }
    
    const adjustedProb = Math.max(0, Math.min(1, baseProbability + adjustment));
    
    return {
      violations,
      adjustedProbability: adjustedProb,
      recommendation: blocked ? 'BLOCKED' : this.probToRec(adjustedProb),
      summary: this.formatSummary(violations)
    };
  }
}
```

---

## Consequences

### Positive

- **Edge Capture**: Exploits well-documented situational factors
- **Defensive**: Prevents betting into known traps
- **Transparent**: Violations are logged and explainable
- **Override Power**: Can BLOCK even when models say BET

### Negative

- **Rigidity**: Rules are binary, no nuance
- **Maintenance**: Must manually update for rule changes
- **Data Dependency**: Requires schedule data, public betting data

### Mitigations

- Combine with ensemble (rules is 1 of 3 votes)
- Log all violations for later analysis
- Integrate with real-time data feeds

---

## References

- [Architecture Documentation](../ARCHITECTURE.md)
- [Situational Handicapping (Sharp Sports Betting)](https://www.sportsbettingprofessor.com/)
