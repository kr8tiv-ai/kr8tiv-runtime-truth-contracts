---
status: partial
phase: 01-cipher-training-pipeline
source: [01-VERIFICATION.md]
started: 2026-04-18T04:00:39Z
updated: 2026-04-18T04:00:39Z
---

## Current Test

[awaiting human testing on Colab A100 + local Ollama]

## Tests

### 1. Run 01_data_curation.ipynb on Colab with GITHUB_TOKEN
expected: SFT 2000+ rows (roadmap target 8K+), SimPO 1000+ pairs, GRPO 500+, KTO 500+ written to data/prompts/
result: [pending]

### 2. Run 02_sft_training.ipynb on Colab Pro+ A100 40GB
expected: Gemma 4 31B loads in QLoRA 4-bit without OOM, SFT loss decreases over 2 epochs, cipher-sft-merged/ saved to Drive, W&B dashboard shows training metrics
result: [pending]

### 3. Run 03_simpo_training.ipynb after SFT completes
expected: CPOTrainer runs with loss_type=simpo, Pitfall 4 loss ratio between 0.3-0.8 (neither too-easy nor too-hard rejects), cipher-simpo-merged/ saved
result: [pending]

### 4. Run 04_grpo_training.ipynb with enhanced_creative_reward
expected: GRPO converges with num_generations=4, W&B reward curve shows increase < 10.0 (no reward hacking per Pitfall 3), cipher-grpo-merged/ saved
result: [pending]

### 5. Run 05_kto_training.ipynb then evaluate 5 diverse creative prompts
expected: KTO trains without label imbalance >80%, 5-prompt eval shows no catastrophic forgetting (Three.js particles, shader, Lenis, creative 404 still render), cipher-final-merged/ saved
result: [pending]

### 6. Run 06_gguf_export.ipynb then load in Ollama
expected: cipher-code-kraken-q4 (~18GB) and cipher-code-kraken-q5 (~22GB) files exist, Modelfile contains Gemma 4 stop tokens, `ollama run cipher-code-kraken-q4` produces in-character Cipher response
result: [pending]

### 7. Confirm total Colab compute units < 1100 (budget ceiling $100 / 34% headroom)
expected: W&B + Colab compute dashboard shows sub-budget total across SFT + SimPO + GRPO + KTO stages
result: [pending]

### 8. Persona classifier confirms >90% personality adherence on held-out eval set (TRAIN-05)
expected: A persona classifier script or KTO held-out eval produces pass rate >90% on Cipher Code Kraken voice
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
