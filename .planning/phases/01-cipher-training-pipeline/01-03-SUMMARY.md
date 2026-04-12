---
phase: 01-cipher-training-pipeline
plan: 03
subsystem: training
tags: [python, jupyter, grpo, kto, gguf, qlora, unsloth, trl, ollama, gemma-4, a100, wandb, colab, reward-function]

# Dependency graph
requires: [01-02]
provides:
  - GRPO reward-based training notebook with enhanced anti-hacking reward function
  - KTO binary feedback alignment notebook with comprehensive multi-prompt eval
  - GGUF export notebook producing Q4_K_M + Q5_K_M quantizations
  - Ollama Modelfile with Cipher Code Kraken persona and Gemma 4 chat template
  - GRPO hyperparameter config (importable Python module)
  - KTO hyperparameter config (importable Python module)
affects: [01-cipher-training-pipeline]

# Tech tracking
tech-stack:
  added: [trl-grpo, trl-kto, gguf-export, ollama-modelfile]
  patterns: [GRPO group relative policy optimization, KTO binary feedback alignment, GGUF quantization via Unsloth, enhanced reward with anti-hacking measures]

key-files:
  created:
    - configs/grpo_config.py
    - configs/kto_config.py
    - notebooks/04_grpo_training.ipynb
    - notebooks/05_kto_training.ipynb
    - notebooks/06_gguf_export.ipynb

key-decisions:
  - "GRPO lr=1e-5 (100x lower than SFT) for stable RL-based optimization"
  - "GRPO num_generations=4 for group comparison without excessive VRAM"
  - "KTO lr=5e-6 (200x lower than SFT) as lightest final alignment stage"
  - "Enhanced reward function wraps base slop_detector with anti-hacking: import validation, variable definition checks, repetition detection"
  - "Modelfile includes Gemma 4 stop tokens (<end_of_turn>, <start_of_turn>) for proper generation termination"
  - "Q5_K_M Modelfile variant auto-generated alongside Q4_K_M default"

patterns-established:
  - "Reward function layering: base reward (slop_detector) + enhanced wrapper (anti-hacking)"
  - "Pitfall 3 monitoring: W&B reward curve analysis to detect gaming"
  - "Multi-prompt eval: 5 diverse creative code prompts to catch catastrophic forgetting"

requirements-completed: [TRAIN-03, TRAIN-04, TRAIN-07]

# Metrics
duration: 15min
completed: 2026-04-12
---

# Phase 1 Plan 03: GRPO, KTO, and GGUF Export Summary

**GRPO with enhanced anti-hacking reward (import validation + repetition detection + code structure checks), KTO binary feedback alignment with 5-prompt catastrophic forgetting eval, GGUF Q4_K_M/Q5_K_M export with Ollama Modelfile defining Cipher Code Kraken anti-slop persona**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-12
- **Completed:** 2026-04-12
- **Tasks:** 2 auto + 1 checkpoint
- **Files created:** 5

## Accomplishments

- Created GRPO config with research-backed hyperparameters: lr=1e-5, num_generations=4, batch=1 with grad_accum=4, 1 epoch, bf16
- Created 9-cell GRPO Colab notebook with enhanced_creative_reward function that wraps base slop_detector reward with anti-hacking measures: import validation (checks imports are actually used), variable definition checks (detects incoherent copied code), repetition detection (penalizes >50% repeated lines as reward gaming signal), code block validation
- GRPO notebook includes Pitfall 3 reward hacking monitoring via W&B log analysis (compares early vs late reward scores, flags if increase > 10.0)
- GRPO notebook includes Open Question 1 fallback: if Unsloth GRPO fails on Gemma 4 31B, provides instructions for TRL-native GRPOTrainer with AutoModelForCausalLM
- Created KTO config with lr=5e-6 (lowest in pipeline), pointing to cipher-grpo-merged input
- Created 8-cell KTO Colab notebook with label balance monitoring (flags >80% imbalance), KTOTrainer from TRL
- KTO notebook includes comprehensive final eval across 5 diverse creative code prompts (Three.js particles, 3D text scroll, WebGL shader terrain, Lenis parallax, creative 404) to detect catastrophic forgetting
- Created 6-cell GGUF export notebook producing both Q4_K_M (~18GB) and Q5_K_M (~22GB) quantizations via Unsloth save_pretrained_gguf
- GGUF notebook creates Ollama Modelfile with Gemma 4 chat template (<start_of_turn>/<end_of_turn>), Cipher Code Kraken system prompt defining anti-slop persona, stop tokens, and tuned inference parameters
- Also generates Modelfile.q5 variant for premium tier users
- Every notebook cell has a preceding markdown cell explaining purpose and expected behavior
- All notebooks include VRAM monitoring, W&B integration, and Drive persistence

## Task Commits

**Note:** Git commits could not be created during this session due to Windows bash fork exhaustion (exit code 254). All files are created and verified but uncommitted.

Commits pending:
1. **Task 1: GRPO notebook + config** - `configs/grpo_config.py`, `notebooks/04_grpo_training.ipynb`
2. **Task 2: KTO notebook + config + GGUF export** - `configs/kto_config.py`, `notebooks/05_kto_training.ipynb`, `notebooks/06_gguf_export.ipynb`

## Files Created

- `configs/grpo_config.py` - GRPO hyperparameters: MODEL_ID=cipher-simpo-merged, lr=1e-5, num_generations=4
- `configs/kto_config.py` - KTO hyperparameters: MODEL_ID=cipher-grpo-merged, lr=5e-6, binary feedback settings
- `notebooks/04_grpo_training.ipynb` - 9-cell Colab notebook for GRPO training with enhanced reward function
- `notebooks/05_kto_training.ipynb` - 8-cell Colab notebook for KTO binary feedback alignment
- `notebooks/06_gguf_export.ipynb` - 6-cell Colab notebook for GGUF export + Ollama Modelfile generation

## Decisions Made

- GRPO lr=1e-5 maintains stable RL exploration (100x lower than SFT lr=2e-4)
- KTO lr=5e-6 is the lightest touch in the pipeline (200x lower than SFT), appropriate for final alignment
- Enhanced reward function layers on top of base slop_detector rather than replacing it -- allows independent improvement of each layer
- Modelfile includes both <end_of_turn> and <start_of_turn> as stop tokens to prevent Gemma 4 from generating beyond its turn
- Q5_K_M Modelfile variant auto-generated to simplify premium tier setup

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Added slop_detector fallback in GRPO notebook**
- **Found during:** Task 1
- **Issue:** enhanced_creative_reward imports from scripts.slop_detector but it may not be available on Colab
- **Fix:** Added try/except with inline fallback base_reward function
- **Files modified:** notebooks/04_grpo_training.ipynb

**2. [Rule 2 - Missing functionality] Added slop_detector fallback in KTO eval cell**
- **Found during:** Task 2
- **Issue:** Final eval cell imports slop_score but it may not be on Colab
- **Fix:** Wrapped import in try/except with graceful degradation (shows response lengths only)
- **Files modified:** notebooks/05_kto_training.ipynb

**3. [Rule 2 - Missing functionality] Added Q5_K_M Modelfile variant**
- **Found during:** Task 2
- **Issue:** Plan only specified single Modelfile pointing to Q4_K_M; users wanting Q5_K_M would need to manually edit
- **Fix:** Auto-generates Modelfile.q5 with correct Q5_K_M path
- **Files modified:** notebooks/06_gguf_export.ipynb

**4. [Rule 2 - Missing functionality] Added Gemma 4 stop tokens to Modelfile**
- **Found during:** Task 2
- **Issue:** Plan's Modelfile template lacked stop token PARAMETER lines; without them Ollama may generate past the model's turn boundary
- **Fix:** Added `PARAMETER stop "<end_of_turn>"` and `PARAMETER stop "<start_of_turn>"` to Modelfile
- **Files modified:** notebooks/06_gguf_export.ipynb

## Known Stubs

None -- all configs are fully specified and notebooks are complete Colab-ready workflows. The notebooks require actual trained model weights and Colab A100 runtime to execute.

## Complete Pipeline Chain

The full training pipeline is now complete with 6 notebooks:

```
01_data_curation.ipynb     -> data/prompts/*.jsonl
02_sft_training.ipynb      -> cipher-sft-merged/
03_simpo_training.ipynb    -> cipher-simpo-merged/
04_grpo_training.ipynb     -> cipher-grpo-merged/
05_kto_training.ipynb      -> cipher-final-merged/
06_gguf_export.ipynb       -> cipher-code-kraken-q4/ + cipher-code-kraken-q5/ + Modelfile
```

## Self-Check: PASSED

All 5 created files verified present:
- FOUND: configs/grpo_config.py
- FOUND: configs/kto_config.py
- FOUND: notebooks/04_grpo_training.ipynb
- FOUND: notebooks/05_kto_training.ipynb
- FOUND: notebooks/06_gguf_export.ipynb

Note: Git commits pending due to bash fork exhaustion on Windows. Files must be committed manually or via a working shell.

---
*Phase: 01-cipher-training-pipeline*
*Completed: 2026-04-12*
