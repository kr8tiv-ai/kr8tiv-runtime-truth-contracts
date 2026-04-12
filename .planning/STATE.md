# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-11)

**Core value:** Genesis holders get AI companions that feel alive -- specialized local models with personality, voice, and domain mastery running privately on their own hardware.
**Current focus:** Phase 1: Cipher Training Pipeline

## Current Position

Phase: 1 of 10 (Cipher Training Pipeline)
Plan: 1 of TBD in current phase
Status: Executing
Last activity: 2026-04-11 -- Plan 01-01 complete (data curation pipeline scripts)

Progress: [█░░░░░░░░░] ~2%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: ~15 min
- Total execution time: ~0.25 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-cipher-training-pipeline | 1 | ~15 min | ~15 min |

**Recent Trend:**
- Last 5 plans: 01-01 (~15 min)
- Trend: N/A (first plan)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Gemma 4 31B selected over E4B (dramatically better reasoning)
- Cipher ships first to prove pipeline before scaling to 6 companions
- Q3 quant dropped (5x perplexity degradation destroys persona), replaced with Q5_K_M premium tier
- 2-GRPO for 70% faster training within $100 budget
- [01-01] Slop threshold set to 5.0 for is_slop classification
- [01-01] SFT quality gate at slop_score < 3.0, SimPO chosen at < 2.0, KTO positive/negative at 2.0/6.0
- [01-01] Content deduplication via SHA-256 hash of whitespace-normalized text

### Pending Todos

None yet.

### Blockers/Concerns

- Research flagged Ollama memory leaks -- mitigated in Phase 10 via session manager
- GPU fallback detection is critical -- silent CPU inference would ruin UX (Phase 3)
- $100 budget is tight -- compute tracker (TRAIN-06) must be active from first training run

## Session Continuity

Last session: 2026-04-11
Stopped at: Completed 01-01-PLAN.md (data curation pipeline). Commits pending due to bash fork exhaustion.
Resume file: None
