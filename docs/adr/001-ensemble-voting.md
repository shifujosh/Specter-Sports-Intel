# 1. Ensemble Voting for Prediction Consensus

**Date:** 2025-10-15

**Status:** Accepted

---

## Context

Sports prediction is inherently uncertain. A single model, no matter how sophisticated, will have blind spots:

- **LLMs** hallucinate numbers and miss quantitative edges
- **Statistical models** miss narrative factors (injuries, motivation)
- **Elo systems** are slow to reflect roster changes
- **Rules-based systems** can't capture novel situations

We needed an approach that combines multiple perspectives while guarding against any single model's failure mode.

### Options Evaluated

| Approach | Pros | Cons |
|----------|------|------|
| **Single LLM** | Simple, flexible | Hallucinates, no calibration |
| **Single Statistical Model** | Rigorous, calibrated | Misses context, slow to adapt |
| **Weighted Average** | Smooth output | Hides disagreement, averaging hides edges |
| **Majority Vote** | Requires agreement | Loses probability nuance |
| **Consensus with Override** | Combines voting + hard rules | More complex |

---

## Decision

Implement a **3-model ensemble with 2/3 consensus requirement** and rule-based override.

### Architecture

```
          ┌─────────────┐
          │   Bayesian  │──────┐
          │  (Bradley-  │      │
          │   Terry)    │      │
          └─────────────┘      │
                               ▼
          ┌─────────────┐    ┌───────────────┐
          │     Elo     │───▶│   Ensemble    │──▶ Final Decision
          │   Rating    │    │    Voter      │
          └─────────────┘    └───────────────┘
                               ▲
          ┌─────────────┐      │
          │    Rules    │──────┘
          │   Engine    │
          │  (OVERRIDE) │
          └─────────────┘
```

### Key Design Choices

1. **2/3 Requirement**: Two models must agree before recommending BET
2. **Rules Override**: A BLOCKED signal from Rules Engine always wins
3. **Probability Averaging**: Final probability is mean of agreeing models
4. **Confidence Tiers**: edge > 15% = high, 8-15% = medium, < 8% = low

---

## Consequences

### Positive

- **Reduced False Positives**: Single-model errors don't become recommendations
- **Calibrated Confidence**: Only strong signals get broadcast
- **Explainable**: Can show which models agreed/disagreed
- **Fail Safe**: When models disagree, we PASS rather than guess

### Negative

- **Reduced Volume**: Fewer recommendations (consensus is harder)
- **Latency**: Must run all three models before deciding
- **Complexity**: Three systems to maintain

### Mitigations

- Lower volume is acceptable; quality over quantity
- Models run in parallel (50-100ms total)
- Good abstractions (ModelVote interface) reduce maintenance burden

---

## Implementation Notes

```typescript
// Simplified vote aggregation
const betVotes = votes.filter(v => 
  v.recommendation === 'BET' || v.recommendation === 'HOME'
).length;

if (betVotes >= 2 && avgProb > 0.60) {
  final = 'STRONG_BET';
} else if (betVotes >= 2) {
  final = 'BET';
} else if (betVotes === 1) {
  final = 'LEAN';
} else {
  final = 'PASS';
}
```

---

## References

- [Ensemble Methods in Machine Learning](https://arxiv.org/abs/2104.02395)
- [Wisdom of Crowds (Surowiecki)](https://en.wikipedia.org/wiki/The_Wisdom_of_Crowds)
- [Ensemble Documentation](../ENSEMBLE.md)
