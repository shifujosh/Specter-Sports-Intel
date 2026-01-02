# 2. Verification-First Output Pipeline

**Date:** 2025-10-18

**Status:** Accepted

---

## Context

LLMs hallucinate. This is a fundamental limitation, not a bug to be fixed. When generating sports analytics content:

- Spreads are stated incorrectly
- Team names are swapped
- Dates are miscalculated
- Statistics are fabricated

In production, incorrect outputs damage credibility and can mislead users making financial decisions.

### The Incident (Pre-Verification)

Early in development, the system posted a tweet claiming "Lakers -4.5 at home tonight" when the Lakers were actually +7.5 on the road. This was a complete inversion of reality that passed through the system because we trusted the LLM output.

---

## Decision

Implement a **mandatory verification gate** between LLM generation and output emission. All generated content must pass deterministic fact-checking before broadcast.

### Architecture

```
    ┌─────────────────────────────────────────────────┐
    │                    BEFORE                        │
    │                                                  │
    │   LLM ────────────────────────────────▶ Output   │
    │                                                  │
    └─────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────┐
    │                    AFTER                         │
    │                                                  │
    │   LLM ──▶ Fact Checker ──▶ Gate ──▶ Output      │
    │               │           │                      │
    │               ▼           │ fail                 │
    │          Ground Truth     ▼                      │
    │              DB      Regenerate                  │
    │                                                  │
    └─────────────────────────────────────────────────┘
```

### Key Design Choices

1. **Deterministic Checker**: The Fact Checker is NOT an LLM. It is a logic engine that compares structured values.

2. **Ground Truth Database**: Firebase Firestore serves as the source of truth for game data.

3. **Regeneration Loop**: On failure, we regenerate with error context (up to 2 retries).

4. **Fail Silent**: After max retries, we skip the game rather than output incorrect information.

---

## Implementation

### Verification Checks

| Check | Method |
|-------|--------|
| Spread accuracy | Compare to DB within 0.5 pts |
| Team identity | Match homeTeam/awayTeam exactly |
| Date consistency | Parse day references, compare to game date |
| Stat plausibility | Check against known ceilings (no 50 PPG) |

### Regeneration

```typescript
async function analyzeWithVerification(game: GameData): Promise<Signal | null> {
  const MAX_RETRIES = 2;
  let issues: string[] = [];
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const signal = await llm.analyze(game, { previousIssues: issues });
    const validation = await factChecker.validate(signal, game);
    
    if (validation.passed) {
      return signal;
    }
    
    issues = validation.issues;
    console.warn(`Attempt ${attempt + 1} failed:`, issues);
  }
  
  // All retries exhausted - fail silent
  return null;
}
```

---

## Consequences

### Positive

- **Zero Factual Errors**: Since implementation, 0 incorrect spreads/teams have been broadcasted
- **User Trust**: Community knows outputs are verified
- **Debugging Aid**: Verification logs show exactly what failed

### Negative

- **Increased Latency**: ~50ms per verification + regeneration time on failures
- **Reduced Throughput**: ~8% of generations require regeneration
- **Database Dependency**: Ground truth DB must be up-to-date

### Mitigations

- Verification is fast (50ms) compared to LLM generation (500ms+)
- Regeneration rate is acceptable for quality improvement
- Real-time data feeds keep DB current

---

## Trade-offs Considered

### Why not use a second LLM to verify?

LLMs verifying LLMs is turtles all the way down. The verifier can hallucinate just as easily as the generator.

### Why not use retrieval-augmented generation (RAG)?

RAG helps with context but doesn't guarantee accuracy. Even with perfect retrieval, the LLM can misread or ignore the retrieved data.

### Why not just fine-tune?

Fine-tuning can reduce hallucination rates but not eliminate them. For mission-critical data, we need deterministic guarantees.

---

## References

- [Verification Documentation](../VERIFICATION.md)
- [LLM Hallucination Survey](https://arxiv.org/abs/2311.05232)
