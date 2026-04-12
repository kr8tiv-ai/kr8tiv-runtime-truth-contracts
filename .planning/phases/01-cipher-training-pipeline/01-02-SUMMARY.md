---
phase: 01-cipher-training-pipeline
plan: 02
subsystem: training
tags: [python, jupyter, sft, simpo, qlora, unsloth, trl, gemma-4, a100, wandb, colab]

# Dependency graph
requires: [01-01]
provides:
  - SFT training notebook for Gemma 4 31B QLoRA on Colab A100
  - SimPO anti-slop preference optimization notebook
  - SFT hyperparameter config (importable Python module)
  - SimPO hyperparameter config (importable Python module)
  - Adapter merging chain (base -> SFT-merged -> SimPO-merged)
affects: [01-cipher-training-pipeline]

# Tech tracking
tech-stack:
  added: [unsloth, trl, wandb, bitsandbytes, peft]
  patterns: [QLoRA 4-bit training, LoRA adapter merging between stages, SimPO reference-free preference optimization]

key-files:
  created:
    - configs/__init__.py
    - configs/sft_config.py
    - configs/simpo_config.py
    - notebooks/02_sft_training.ipynb
    - notebooks/03_simpo_training.ipynb

key-decisions:
  - "LoRA r=16 alpha=16 to prevent catastrophic forgetting per Research Pitfall 2"
  - "SimPO gamma=1.4 beta=2.0 per SimPO paper defaults (NeurIPS 2024)"
  - "SFT lr=2e-4, SimPO lr=5e-5 -- 10x lower for preference stage to prevent overwriting SFT patterns"
  - "Gradient checkpointing='unsloth' saves 30% VRAM -- critical for A100 40GB headroom"
  - "SimPO via CPOTrainer with loss_type='simpo' -- reference-free, no ref model needed"

patterns-established:
  - "Config-as-module pattern: hyperparameters in importable Python files, notebooks import *"
  - "Adapter merge chain: train LoRA -> merge -> load merged -> train new LoRA -> merge"
  - "Pitfall 4 monitoring: check loss ratio (late/early) to detect too-easy rejected data"

requirements-completed: [TRAIN-01, TRAIN-02]

# Metrics
duration: 12min
completed: 2026-04-12
---

# Phase 1 Plan 02: SFT and SimPO Training Notebooks Summary

**Colab-ready SFT + SimPO notebooks with configs: QLoRA Gemma 4 31B on A100, creative code SFT with chat-template formatting, SimPO anti-slop via CPOTrainer with Pitfall 4 loss monitoring and slop_detector eval**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-12
- **Completed:** 2026-04-12
- **Tasks:** 2 auto + 1 checkpoint
- **Files created:** 5

## Accomplishments

- Created SFT config with all research-backed hyperparameters: QLoRA 4-bit, LoRA r=16/alpha=16, batch=1 with grad_accum=4, lr=2e-4, 2 epochs, bf16, Unsloth gradient checkpointing
- Created 8-cell SFT Colab notebook covering full workflow: install, Drive mount, model load, LoRA apply, dataset format with chat template, SFTTrainer training, adapter merge+save, generation sanity check
- Created SimPO config with paper-default parameters: loss_type="simpo", cpo_alpha=0.0, gamma=1.4, beta=2.0, lr=5e-5 (10x lower than SFT), 1 epoch
- Created 9-cell SimPO Colab notebook: loads SFT-merged model, applies fresh LoRA, trains with CPOTrainer, includes Pitfall 4 loss monitoring (detects too-easy rejected data), merges adapter, runs comparative eval with slop_detector
- Every notebook cell has a preceding markdown cell explaining purpose, expected behavior, and what to watch for
- Both notebooks include VRAM monitoring at model load, post-LoRA, pre-train, and post-train
- Both notebooks include W&B integration for experiment tracking
- SimPO notebook includes fallback when slop_detector is not available on Colab

## Task Commits

**Note:** Git commits could not be created during this session due to Windows bash fork exhaustion (exit code 254). All files are created and verified but uncommitted.

Commits pending:
1. **Task 1: SFT notebook + config** - `configs/__init__.py`, `configs/sft_config.py`, `notebooks/02_sft_training.ipynb`
2. **Task 2: SimPO notebook + config** - `configs/simpo_config.py`, `notebooks/03_simpo_training.ipynb`

## Files Created

- `configs/__init__.py` - Package init for configs module
- `configs/sft_config.py` - SFT hyperparameters: MODEL_ID, LoRA settings, training settings, dataset path
- `configs/simpo_config.py` - SimPO hyperparameters: loss_type=simpo, gamma=1.4, beta=2.0, CPO settings
- `notebooks/02_sft_training.ipynb` - 8-cell Colab notebook for SFT training on A100
- `notebooks/03_simpo_training.ipynb` - 9-cell Colab notebook for SimPO anti-slop training on A100

## Decisions Made

- LoRA r=16 (not r=64 from CONTEXT.md suggestion) per Research Pitfall 2 recommendation to prevent catastrophic forgetting
- SimPO gamma=1.4, beta=2.0 per NeurIPS 2024 paper defaults rather than the CONTEXT.md values (beta=2.5, gamma=1.0) -- paper defaults are more empirically validated
- Config-as-module pattern chosen over YAML: Python files are directly importable with `from configs.sft_config import *`, avoiding YAML parsing dependencies
- SFT notebook copies configs from Drive to Colab at runtime -- notebooks are self-contained once data is on Drive

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Added configs/__init__.py**
- **Found during:** Task 1
- **Issue:** configs/ directory needed __init__.py to be importable as a Python package
- **Fix:** Created configs/__init__.py
- **Files modified:** configs/__init__.py

**2. [Rule 2 - Missing functionality] Added Drive copy for configs in notebooks**
- **Found during:** Task 1
- **Issue:** Plan showed notebooks importing from configs/ but Colab wouldn't have configs/ without explicit copy from Drive
- **Fix:** Added cells to copy config files from Drive to Colab local filesystem
- **Files modified:** notebooks/02_sft_training.ipynb, notebooks/03_simpo_training.ipynb

**3. [Rule 2 - Missing functionality] Added slop_detector fallback in SimPO notebook**
- **Found during:** Task 2
- **Issue:** SimPO eval cell imports slop_detector but it may not be on Colab
- **Fix:** Wrapped import in try/except with manual check guidance
- **Files modified:** notebooks/03_simpo_training.ipynb

## Known Stubs

None -- all configs are fully specified and notebooks are complete Colab-ready workflows. The notebooks will need actual training data (from Plan 01 pipeline execution) and a Colab A100 runtime to execute.

## Next Phase Readiness

- SFT notebook ready to run once data/prompts/sft_prompts.jsonl is generated by Plan 01 data curation pipeline
- SimPO notebook ready to run once SFT stage completes and produces cipher-sft-merged/
- Both configs importable as Python modules
- Adapter merge chain established: base -> SFT-merged (notebook 02) -> SimPO-merged (notebook 03)
- SimPO-merged output feeds into Plan 03 (GRPO stage)

## Self-Check: PASSED

All 5 created files verified present:
- FOUND: configs/__init__.py
- FOUND: configs/sft_config.py
- FOUND: configs/simpo_config.py
- FOUND: notebooks/02_sft_training.ipynb
- FOUND: notebooks/03_simpo_training.ipynb

Note: Git commits pending due to bash fork exhaustion. Files must be committed manually.

---
*Phase: 01-cipher-training-pipeline*
*Completed: 2026-04-12*
