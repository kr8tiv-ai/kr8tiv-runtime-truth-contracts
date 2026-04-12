# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-11)

**Core value:** Genesis holders get AI companions that feel alive -- specialized local models with personality, voice, and domain mastery running privately on their own hardware.
**Current focus:** Phase 1: Cipher Training Pipeline

## Current Position

Phase: 1 of 10 (Cipher Training Pipeline)
Plan: 2 of TBD in current phase
Status: Executing (checkpoint: human-verify on 01-02)
Last activity: 2026-04-12 -- Plan 01-02 tasks 1-2 complete (SFT + SimPO notebooks/configs), awaiting human verification

Progress: [██░░░░░░░░] ~4%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: ~13.5 min
- Total execution time: ~0.45 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-cipher-training-pipeline | 2 | ~27 min | ~13.5 min |

**Recent Trend:**
- Last 5 plans: 01-01 (~15 min), 01-02 (~12 min)
- Trend: Stable

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
- [01-02] LoRA r=16 (not r=64) per Research Pitfall 2 to prevent catastrophic forgetting
- [01-02] SimPO gamma=1.4 beta=2.0 per NeurIPS paper defaults (over CONTEXT.md values)
- [01-02] Config-as-module pattern: Python files importable with `from configs.X import *`

### Pending Todos

None yet.

### Blockers/Concerns

- Research flagged Ollama memory leaks -- mitigated in Phase 10 via session manager
- GPU fallback detection is critical -- silent CPU inference would ruin UX (Phase 3)
- $100 budget is tight -- compute tracker (TRAIN-06) must be active from first training run

## Session Continuity

Last session: 2026-04-12
Stopped at: Completed 01-02-PLAN.md tasks 1-2 (SFT + SimPO notebooks/configs). Checkpoint: human-verify pending. Commits pending due to bash fork exhaustion.
Resume file: None
