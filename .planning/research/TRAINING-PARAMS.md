# Gemma 4 31B Fine-Tuning Hyperparameter Research

**Researched:** 2026-04-12
**Domain:** LLM Fine-tuning (SFT, SimPO, GRPO, KTO) on Gemma 4 31B Dense
**Confidence:** HIGH (verified across Unsloth docs, TRL docs, original papers, practitioner guides)
**Goal:** Beat frontier performance in domain-specific tasks

---

## 1. LoRA Rank and Alpha

### Recommendation: r=64, alpha=64, use_rslora=True

**Confidence: HIGH** (verified via Unsloth docs, Databricks research, rsLoRA paper, practitioner configs)

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Rank (r)** | **64** | Sweet spot for 31B models. r=16 is TOO LOW for frontier-beating quality. r=128 is viable but diminishing returns without rsLoRA. Qwen3-VL-30B configs use r=64 successfully. |
| **Alpha** | **64** (alpha = r) | Unsloth recommends alpha >= r. alpha = r gives scaling factor of 1.0. The "alpha = 2*r" heuristic is more aggressive -- use it only if underfitting. |
| **rsLoRA** | **True** | CRITICAL at r=64. Standard LoRA scaling (alpha/r) causes gradient collapse at higher ranks. rsLoRA uses alpha/sqrt(r) instead, which unlocks actual performance gains from higher ranks. Research shows r=256 with standard LoRA performs no better than r=16, but rsLoRA nearly doubles the gap. |
| **LoRA Dropout** | **0** | Unsloth default. Dropout is unnecessary with proper regularization and limited epochs. |
| **Target Modules** | **all-linear** | q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj. Research confirms targeting both attention AND MLP layers is crucial for matching full fine-tuning. |
| **Bias** | **"none"** | Standard for LoRA fine-tuning. |

### Why NOT r=16?
- At 31B parameters, the model has enormous representational capacity
- r=16 constrains the adapter to ~0.03% of parameters -- too few for complex domain adaptation
- r=64 gives ~0.12% trainable parameters -- still efficient but expressive enough
- rsLoRA makes higher ranks actually work (fixes the gradient scaling issue)

### Why NOT r=128?
- Viable but 2x memory cost over r=64 with typically <2% quality improvement
- Use r=128 only if: (a) dataset is very large (>50K examples), (b) task requires broad adaptation, (c) VRAM permits
- If using r=128, rsLoRA is even more critical

### Code
```python
model = FastModel.get_peft_model(
    model,
    r=64,
    lora_alpha=64,
    lora_dropout=0,
    target_modules="all-linear",
    use_rslora=True,
    bias="none",
    random_state=3407,
)
```

---

## 2. Learning Rates (EXACT values per stage)

**Confidence: HIGH** (cross-verified across TRL docs, SimPO paper, KTO paper, Unsloth guides)

| Stage | Learning Rate | Range to Grid Search | Notes |
|-------|--------------|---------------------|-------|
| **SFT (QLoRA)** | **2e-4** | 1e-4 to 3e-4 | Unsloth default. Reduce to 2e-5 for extended multi-epoch training. |
| **SimPO** | **5e-7** | 3e-7 to 1e-6 | SimPO paper recommends grid search over {3e-7, 5e-7, 8e-7, 1e-6}. Must be much lower than SFT. |
| **GRPO** | **5e-6** | 1e-6 to 1e-5 | Unsloth recommends 5e-6 for RL stages. DeepSeek-R1 used similar ranges. |
| **KTO** | **5e-7** | 5e-7 to 5e-6 | TRL docs: "strongly recommend keeping LR between 5e-7 and 5e-6". For beta=0.1, do NOT exceed 1e-6. |

### Critical Notes
- SFT LR is 100-1000x higher than alignment stage LRs -- this is intentional and correct
- For preference optimization (SimPO/KTO), the LR is the single most impactful hyperparameter
- Lower beta values require correspondingly lower learning rates
- If training diverges, cut LR in half before changing other params

---

## 3. Batch Size and Gradient Accumulation

**Confidence: HIGH** (Unsloth docs + memory analysis)

### A100 40GB with Gemma 4 31B QLoRA (r=64)

| Setting | Value | Notes |
|---------|-------|-------|
| **per_device_train_batch_size** | **1** | Memory-constrained at 31B even with QLoRA. May push to 2 with shorter sequences. |
| **gradient_accumulation_steps** | **4** (SFT) / **8** (alignment) | Effective batch: 4 for SFT, 8 for alignment. SimPO paper recommends effective batch of 128 -- use multi-GPU or higher accumulation. |
| **Effective batch size** | **4** (SFT minimum) / **16-128** (alignment ideal) | KTO docs: "Use per-step batch size of at least 4, effective batch 16-128". SimPO: "keep total batch size fixed at 128". |

### Memory Budget (A100 40GB)
- Gemma 4 31B QLoRA (4-bit): ~22GB base model
- LoRA adapters (r=64, all-linear): ~2-3GB
- Optimizer states (paged_adamw_8bit): ~2-3GB
- Activations + gradient checkpointing: ~8-10GB
- **Remaining for batch/context: ~3-5GB**

### For GRPO Specifically
- num_generations dramatically impacts memory (all generations held simultaneously for advantage computation)
- With 8 generations on A100 40GB, max context is ~4-6K tokens
- Unsloth's memory-efficient GRPO reduces this by ~8x

---

## 4. Context Length

**Confidence: HIGH** (Unsloth docs + memory analysis)

| Configuration | Max Context | Notes |
|--------------|-------------|-------|
| **SFT on A100 40GB** | **8192** | Unsloth default max_seq_length. Achievable with gradient checkpointing. |
| **Alignment (SimPO/KTO)** | **4096-8192** | Pairs need 2x the memory. Start at 4096, push to 8192 if fits. |
| **GRPO on A100 40GB** | **4096** (standard) / **8192** (Unsloth optimized) | GRPO memory scales with num_generations * context_length. Unsloth's memory-efficient implementation is essential. |

### Key Requirements
- **Flash Attention**: Enabled by default in Unsloth. Reduces memory from O(n^2) to O(n) for attention.
- **use_gradient_checkpointing = "unsloth"**: NOT just True -- use the string "unsloth" for Unsloth-specific optimizations that extend context.
- Can push to 8192 on SFT reliably. Beyond 8192 requires multi-GPU or A100 80GB.

---

## 5. Epochs

**Confidence: MEDIUM-HIGH** (general best practice + domain-specific tuning)

| Stage | Epochs | Risk Profile |
|-------|--------|-------------|
| **SFT** | **1-3** (start with 1) | >3 epochs risks overfitting, especially on small datasets. 1 epoch if dataset >10K examples. 2-3 epochs if dataset 1K-5K. |
| **SimPO** | **1** | Preference optimization is extremely sensitive to overfitting. 1 epoch is standard. If dataset is very small (<1K pairs), consider 2 epochs with reduced LR. |
| **GRPO** | **N/A (step-based)** | Online RL -- measured in steps not epochs. Typical: 500-2000 training steps. Monitor reward plateau. |
| **KTO** | **1-2** | TRL docs: "opt for more epochs" rather than higher LR. But 1 epoch is the safe default. |

### Overfitting Detection
- Monitor eval loss diverging from train loss
- Watch for reward hacking in GRPO (reward increases but quality drops)
- For SimPO/KTO: if reward margin stops increasing or decreases, stop training

---

## 6. Warmup

**Confidence: HIGH** (consistent across all sources)

| Stage | Warmup | Notes |
|-------|--------|-------|
| **SFT** | **warmup_ratio=0.03** or **warmup_steps=5-10** | Unsloth default is 5 steps. For larger datasets, 3-5% warmup ratio. |
| **SimPO** | **warmup_ratio=0.1** | 10% warmup is standard for preference optimization. Helps stability with very low LRs. |
| **GRPO** | **warmup_ratio=0.1** | RL training benefits from longer warmup to stabilize initial policy. |
| **KTO** | **warmup_ratio=0.1** | Same as other alignment stages. |

---

## 7. Weight Decay

**Confidence: HIGH** (Unsloth docs)

| Setting | Value | Notes |
|---------|-------|-------|
| **weight_decay** | **0.001** | Unsloth's recommended default for SFT. Light regularization. |
| **For alignment stages** | **0.0 to 0.01** | Most alignment implementations use 0 or very light decay. The implicit KL penalty provides regularization. |

---

## 8. Optimizer

**Confidence: HIGH** (verified comparison across sources)

### Recommendation: `adamw_8bit` (primary) / `paged_adamw_8bit` (fallback)

| Optimizer | When to Use | Tradeoff |
|-----------|------------|----------|
| **adamw_8bit** | **Default choice.** Fits in VRAM for QLoRA 31B on A100 40GB. | Best convergence with 8-bit quantized states. ~2-3GB optimizer states. |
| **paged_adamw_8bit** | If OOM with adamw_8bit (e.g., longer context or larger batch). | Pages optimizer states to CPU when GPU is full. ~5-15% slower throughput. |
| **AdaFactor** | NOT RECOMMENDED | Unstable training, inconsistent results across initializations. Memory savings vs adamw_8bit are marginal with modern quantization. |

### Why NOT AdaFactor?
- Training instability is well-documented (different inits yield very different results)
- With 8-bit AdamW and QLoRA, memory savings of AdaFactor are negligible
- AdamW has "robust convergence properties and superior regularization"
- The O(n+m) factored memory of AdaFactor is only meaningful for full fine-tuning, not LoRA

---

## 9. Learning Rate Scheduler

**Confidence: HIGH** (recent 2026 research)

### Recommendation: `cosine` for SFT, `cosine` for alignment

| Stage | Scheduler | Notes |
|-------|-----------|-------|
| **SFT (1-2 epochs)** | **cosine** | Standard choice. Linear also works well for short runs. Recent research (2026) shows linear-to-zero is competitive. |
| **SFT (3+ epochs)** | **cosine** | Cosine benefits longer training runs more than linear. |
| **SimPO/KTO** | **cosine** | Standard in alignment literature. |
| **GRPO** | **cosine** | Standard. |

### 2026 Update: Emerging Alternatives
- **Linear decay-to-zero (D2Z)**: Recent ICLR 2026 paper shows D2Z "consistently outperforms other schedules at compute-optimal dataset sizes." Viable alternative.
- **Warmup-Stable-Only (WSO)**: Removes decay entirely. "Achieves highest performance after SFT." Experimental but promising.
- **Practical advice**: Cosine is battle-tested and safe. D2Z and WSO are worth experimenting with if you have compute budget for ablations.

---

## 10. SimPO-Specific Hyperparameters

**Confidence: HIGH** (verified from NeurIPS 2024 paper + official GitHub + TRL CPOConfig)

### Implementation: Use TRL's `CPOTrainer` with `loss_type="simpo"`

| Parameter | Value | Notes |
|-----------|-------|-------|
| **beta** | **10.0** | "beta=10 generally performs well across various datasets and LLMs." Much larger than DPO's beta. |
| **simpo_gamma** | **2.5** | gamma = gamma_beta_ratio * beta = 0.25 * 10 = 2.5. This is the target reward margin. |
| **gamma_beta_ratio** | **0.25** (starting point) | Grid search between 0 and 1. Official recommendation. |
| **cpo_alpha** | **0.0** | MUST be 0.0 for pure SimPO (no BC regularization). |
| **loss_type** | **"simpo"** | In CPOConfig. |
| **learning_rate** | **5e-7** | Grid search: {3e-7, 5e-7, 8e-7, 1e-6}. |
| **Effective batch size** | **128** | Paper recommendation. Use gradient_accumulation to reach this. |

### Tuning Protocol (official recommendation)
1. **First**: Tune learning_rate while holding beta=10 and gamma_beta_ratio=0.25
2. **Second**: Tune gamma_beta_ratio (grid 0 to 1) while holding LR and beta
3. **Optional third**: Fine-tune beta (though 10 works well across settings)

### For 31B specifically
- Larger models may benefit from slightly lower beta (e.g., 8-10 range)
- The gamma/beta ratio is more important than absolute values
- Monitor reward margins -- they should increase steadily

### Code
```python
from trl.experimental.cpo import CPOConfig, CPOTrainer

training_args = CPOConfig(
    output_dir="gemma4-31b-simpo",
    loss_type="simpo",
    cpo_alpha=0.0,
    beta=10.0,
    simpo_gamma=2.5,
    learning_rate=5e-7,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=128,  # effective batch 128
    num_train_epochs=1,
    warmup_ratio=0.1,
    lr_scheduler_type="cosine",
    bf16=True,
    gradient_checkpointing=True,
    logging_steps=10,
    max_length=4096,
)
```

### CPO-SimPO Variant
For potentially more stable training, use CPO-SimPO (combined):
- Set `loss_type="simpo"` with a NON-ZERO `cpo_alpha` (e.g., 0.5-1.0)
- Adds behavioral cloning regularization on top of SimPO
- Recommended if pure SimPO training is unstable

---

## 11. GRPO-Specific Hyperparameters

**Confidence: HIGH** (verified from TRL GRPOConfig docs + DeepSeek-R1 paper + Unsloth)

| Parameter | Value | Notes |
|-----------|-------|-------|
| **num_generations** | **4** (A100 40GB) / **8** (A100 80GB) | Memory bottleneck. All generations stored simultaneously for advantage computation. 4 is safe on 40GB. |
| **epsilon (clip_epsilon)** | **0.2** (default) / **0.1-0.3** range | Controls trust region. DeepSeek-R1 used 10 (very wide). 0.2 is standard PPO-style. |
| **beta (KL coefficient)** | **0.0** (recommended default) | TRL default. Recent research shows KL term is NOT essential for GRPO. Set to 0 to save memory (no reference model loaded). |
| **num_iterations** | **1** | Number of policy updates per generated batch. Default. Higher values = more off-policy. |
| **scale_rewards** | **True** (default) or **"batch"** | "batch" uses group-level mean + batch-level std for more robust reward shaping (2025 paper recommendation). |
| **learning_rate** | **5e-6** | Unsloth RL guide recommendation. |
| **max_completion_length** | **2048-4096** | Depends on task. For reasoning tasks, allow longer completions. |

### GRPO Memory on A100 40GB

| num_generations | Max Context (standard) | Max Context (Unsloth optimized) |
|----------------|----------------------|-------------------------------|
| 4 | ~6K tokens | ~12K+ tokens |
| 8 | ~4K tokens | ~8K+ tokens |
| 16 | OOM | ~4K tokens |

### Recommendation: 4-GRPO on A100 40GB
- num_generations=4 gives sufficient diversity for advantage estimation
- Allows longer context which may be more important than more generations
- Use Unsloth's memory-efficient GRPO implementation

### Loss Variants
- **Default (GRPO)**: Standard clipped surrogate objective
- **dr-grpo**: Dr. GRPO variant, removes length bias. Set `loss_type="dr-grpo"`
- **dapo**: Dynamic clipping. Set `loss_type="dapo"`
- **sapo**: Asymmetric clipping (tau_neg=1.05 > tau_pos=1.0). Penalizes bad actions more strictly.

### Code
```python
from trl import GRPOConfig, GRPOTrainer

training_args = GRPOConfig(
    output_dir="gemma4-31b-grpo",
    num_generations=4,
    epsilon=0.2,
    beta=0.0,  # no KL penalty, saves memory
    num_iterations=1,
    scale_rewards=True,
    learning_rate=5e-6,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,
    num_train_epochs=1,
    max_steps=1000,
    warmup_ratio=0.1,
    lr_scheduler_type="cosine",
    bf16=True,
    gradient_checkpointing=True,
    logging_steps=1,
    max_completion_length=2048,
)
```

---

## 12. KTO-Specific Hyperparameters

**Confidence: HIGH** (verified from TRL KTOConfig + original paper)

**NOTE: As of TRL v1.0, KTO has moved to `trl.experimental.kto` module.**

| Parameter | Value | Notes |
|-----------|-------|-------|
| **beta** | **0.1** | Default and "close-to-optimal for most settings." Higher beta = less deviation from reference. |
| **desirable_weight** | **1.0** | Default. Adjust if data is imbalanced. |
| **undesirable_weight** | **1.0-1.33** | If you have more desirable than undesirable examples, upweight undesirable. Target ratio of (des_weight * #pos) : (und_weight * #neg) should be 1:1 to 4:3. |
| **learning_rate** | **5e-7** | "Strongly recommend 5e-7 to 5e-6." For beta=0.1, do NOT exceed 1e-6. |
| **Per-step batch size** | **>= 4** | "If your per-step batch size is poor, the KL estimate in KTO will be poor." This is critical. |
| **Effective batch size** | **16-128** | Standard for alignment. |

### Beta-LR Relationship
Each beta has a maximum tolerable learning rate:
- beta=0.1 -> max LR ~1e-6
- beta=0.05 -> max LR ~5e-7
- beta=0.01 -> max LR ~1e-7

Lower beta -> lower max LR. If learning degrades, reduce LR first.

### Data Composition Tips
- KTO works with ONLY desirable or ONLY undesirable data (but both is better)
- If using only rejected data, use a "conservative learning rate" (closer to 5e-7)
- Auto-converts paired preference data to unpaired (chosen -> label=True, rejected -> label=False)

### Code
```python
from trl.experimental.kto import KTOConfig, KTOTrainer

training_args = KTOConfig(
    output_dir="gemma4-31b-kto",
    beta=0.1,
    desirable_weight=1.0,
    undesirable_weight=1.0,
    learning_rate=5e-7,
    per_device_train_batch_size=4,  # minimum for good KL estimate
    gradient_accumulation_steps=8,  # effective batch 32
    num_train_epochs=1,
    warmup_ratio=0.1,
    lr_scheduler_type="cosine",
    bf16=True,
    gradient_checkpointing=True,
    logging_steps=10,
    max_length=4096,
)
```

---

## 13. Data Quality Thresholds

**Confidence: MEDIUM** (no single canonical threshold; method-dependent)

### Reward Model Scoring for Data Filtering

| Approach | Model | How to Use |
|----------|-------|-----------|
| **ArmoRM** | ArmoRM-Llama3-8B-v0.1 | Multi-objective scoring. #1 on RewardBench. Score each response, keep top-K by average score. |
| **Skywork-Reward** | Skywork-Reward-Gemma-2-27B-v0.2 | Strong alternative. Use RM score to validate chosen > rejected in preference pairs. |

### Filtering Strategy

**For SFT Data:**
- Score all candidate responses with ArmoRM
- Keep responses with score > **median + 0.5 SD** of your dataset's score distribution (adaptive threshold)
- Alternatively: keep top 70-80% by score, discard bottom 20-30%
- No universal "magic number" -- threshold depends on dataset quality distribution

**For Preference Pairs (SimPO/KTO):**
- Score both chosen and rejected with reward model
- **Hard filter**: Only keep pairs where RM(chosen) > RM(rejected)
- **Quality filter**: Only keep pairs where RM(chosen) - RM(rejected) > 0.5 (meaningful margin)
- Skywork approach: subtract 0.05-0.1 from lower-quality subsets to deprioritize them

**For GRPO:**
- Quality is enforced through the reward function during training
- Focus on prompt diversity rather than response filtering

### Practical Recommendation
1. Score your full dataset with ArmoRM or Skywork-Reward-Gemma-2-27B
2. Plot the distribution
3. Set threshold at the point where quality noticeably drops (usually 25th-30th percentile)
4. For preference pairs, ensure the chosen-rejected margin is meaningful (>0.5 RM score difference)

---

## 14. Unsloth-Specific Configuration for Gemma 4 31B

**Confidence: HIGH** (verified from Unsloth docs + release notes + bug discussions)

### Critical Gotchas

| Issue | Details | Fix |
|-------|---------|-----|
| **KV-shared layer bug** | `use_cache=False` (forced by gradient_checkpointing) causes garbage logits on Gemma 4 E2B/E4B. 31B has num_kv_shared_layers=0, so different bug (IndexError during inference). | **Use Unsloth** -- fixed at framework level. Do NOT use vanilla transformers. |
| **Gradient accumulation loss explosion** | Standard implementations produce loss 300-400 instead of 10-15. | **Use Unsloth** -- patched. If using vanilla, verify loss is in 10-15 range. |
| **Loss values** | Normal initial loss for Gemma 4 31B: **~3 with gemma4_prefix_collate_fn**, ~9 WITHOUT prefix injection. | ALWAYS use proper chat template. Loss of ~9 means thinking prefix is missing. |
| **Thinking prefix** | Gemma 4 IT models ALWAYS emit a thinking-channel prefix. Training data MUST include this. | Use `"gemma-4-thinking"` chat template. Or `"gemma-4"` (non-thinking). |
| **Float16 audio overflow** | fp16 causes -1e9 to overflow in attention logits for audio. | Use **bf16=True** always. Never fp16 on Gemma 4. |
| **MoE quantization** | 26B-A4B (MoE) does NOT work well with 4-bit QLoRA. | 31B Dense is fine with QLoRA. MoE needs 16-bit LoRA. |

### Mandatory Settings
```python
from unsloth import FastModel

model, tokenizer = FastModel.from_pretrained(
    model_name="unsloth/gemma-4-31B-it",
    max_seq_length=8192,
    load_in_4bit=True,          # QLoRA
    full_finetuning=False,
    gpu_memory_utilization=0.9,  # leave headroom
)

model = FastModel.get_peft_model(
    model,
    r=64,
    lora_alpha=64,
    lora_dropout=0,
    target_modules="all-linear",
    use_rslora=True,
    use_gradient_checkpointing="unsloth",  # STRING, not boolean!
    random_state=3407,
)
```

### Unsloth-Specific Benefits
- 2x faster training, 70% less VRAM vs standard HuggingFace
- 1.5x faster with 60% less VRAM vs Flash Attention 2 setups
- Memory-efficient GRPO: 8x VRAM reduction for generation storage
- Correct gradient accumulation (no loss explosion)
- Fixed KV-shared layer bugs for Gemma 4 architecture

### Version Requirement
- **Minimum: Unsloth v0.1.36-beta** (2026.4.2 release) -- contains all Gemma 4 fixes
- Contains: 7 critical llama.cpp GGUF fixes, KV cache fixes, gradient fixes

---

## Complete Configuration Templates

### Stage 1: SFT
```python
from unsloth import FastModel
from trl import SFTTrainer, SFTConfig

model, tokenizer = FastModel.from_pretrained(
    "unsloth/gemma-4-31B-it",
    max_seq_length=8192,
    load_in_4bit=True,
    full_finetuning=False,
)

model = FastModel.get_peft_model(
    model, r=64, lora_alpha=64, lora_dropout=0,
    target_modules="all-linear", use_rslora=True,
    use_gradient_checkpointing="unsloth",
    random_state=3407,
)

training_args = SFTConfig(
    output_dir="./gemma4-31b-sft",
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    num_train_epochs=1,
    warmup_ratio=0.03,
    lr_scheduler_type="cosine",
    optim="adamw_8bit",
    weight_decay=0.001,
    max_grad_norm=0.3,
    bf16=True,
    logging_steps=1,
    max_seq_length=8192,
    seed=3407,
)
```

### Stage 2: SimPO (Preference Optimization)
```python
from trl.experimental.cpo import CPOConfig, CPOTrainer

training_args = CPOConfig(
    output_dir="./gemma4-31b-simpo",
    loss_type="simpo",
    cpo_alpha=0.0,
    beta=10.0,
    simpo_gamma=2.5,  # gamma_beta_ratio=0.25 * beta=10
    per_device_train_batch_size=1,
    gradient_accumulation_steps=128,
    learning_rate=5e-7,
    num_train_epochs=1,
    warmup_ratio=0.1,
    lr_scheduler_type="cosine",
    bf16=True,
    gradient_checkpointing=True,
    logging_steps=10,
    max_length=4096,
)
```

### Stage 3: GRPO (Reinforcement Learning)
```python
from trl import GRPOConfig, GRPOTrainer

training_args = GRPOConfig(
    output_dir="./gemma4-31b-grpo",
    num_generations=4,
    epsilon=0.2,
    beta=0.0,
    num_iterations=1,
    scale_rewards=True,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,
    learning_rate=5e-6,
    max_steps=1000,
    warmup_ratio=0.1,
    lr_scheduler_type="cosine",
    optim="adamw_8bit",
    bf16=True,
    gradient_checkpointing=True,
    logging_steps=1,
    max_completion_length=2048,
)
```

### Stage 4: KTO (Binary Feedback)
```python
from trl.experimental.kto import KTOConfig, KTOTrainer

training_args = KTOConfig(
    output_dir="./gemma4-31b-kto",
    beta=0.1,
    desirable_weight=1.0,
    undesirable_weight=1.0,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=8,
    learning_rate=5e-7,
    num_train_epochs=1,
    warmup_ratio=0.1,
    lr_scheduler_type="cosine",
    bf16=True,
    gradient_checkpointing=True,
    logging_steps=10,
    max_length=4096,
)
```

---

## Quick Reference Summary

| Parameter | SFT | SimPO | GRPO | KTO |
|-----------|-----|-------|------|-----|
| **LoRA r** | 64 | 64 | 64 | 64 |
| **LoRA alpha** | 64 | 64 | 64 | 64 |
| **rsLoRA** | True | True | True | True |
| **Learning Rate** | 2e-4 | 5e-7 | 5e-6 | 5e-7 |
| **Batch Size** | 1 | 1 | 1 | 4 |
| **Grad Accum** | 4 | 128 | 4 | 8 |
| **Epochs** | 1-3 | 1 | steps-based | 1-2 |
| **Warmup** | 0.03 | 0.1 | 0.1 | 0.1 |
| **Weight Decay** | 0.001 | 0.0 | 0.0 | 0.0 |
| **Optimizer** | adamw_8bit | adamw_8bit | adamw_8bit | adamw_8bit |
| **Scheduler** | cosine | cosine | cosine | cosine |
| **Max Context** | 8192 | 4096 | 4096 | 4096 |
| **beta** | N/A | 10.0 | 0.0 | 0.1 |
| **Precision** | bf16 | bf16 | bf16 | bf16 |

---

## Sources

### Primary (HIGH confidence)
- [Unsloth Gemma 4 Fine-tuning Guide](https://unsloth.ai/docs/models/gemma-4/train) -- all Gemma 4 specific config
- [Unsloth LoRA Hyperparameters Guide](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide/lora-hyperparameters-guide) -- LoRA rank, alpha, rsLoRA
- [TRL GRPOTrainer Documentation](https://huggingface.co/docs/trl/main/en/grpo_trainer) -- all GRPO params
- [TRL KTOTrainer Documentation](https://huggingface.co/docs/trl/main/en/kto_trainer) -- all KTO params
- [TRL CPOTrainer Documentation](https://huggingface.co/docs/trl/main/cpo_trainer) -- SimPO via CPO, all params
- [SimPO Paper (NeurIPS 2024)](https://arxiv.org/pdf/2405.14734) -- beta, gamma, tuning protocol
- [SimPO GitHub Issue #50](https://github.com/princeton-nlp/SimPO/issues/50) -- official tuning guidance
- [rsLoRA Paper](https://arxiv.org/abs/2312.03732) -- rank stabilization scaling
- [rsLoRA HuggingFace Blog](https://huggingface.co/blog/damjan-k/rslora) -- practical rsLoRA guidance
- [Unsloth Gemma 4 Fixes Discussion](https://github.com/unslothai/unsloth/discussions/4921) -- all known bugs

### Secondary (MEDIUM confidence)
- [Gemma 4 Fine-Tuning Complete Guide (Lushbinary)](https://lushbinary.com/blog/fine-tune-gemma-4-lora-qlora-complete-guide/) -- practical config values
- [Gemma 4 Fine-Tuning Guide (Trenzo)](https://trenzo.tech/gemma-4-fine-tuning-guide-2026-run-train-deploy-googles-best-open-model/) -- hardware requirements
- [Databricks LoRA Guide](https://www.databricks.com/blog/efficient-fine-tuning-lora-guide-llms) -- rank selection research
- [KTO Paper](https://arxiv.org/pdf/2402.01306) -- beta, lambda, LR constraints
- [Skywork-Reward Technical Report](https://arxiv.org/pdf/2410.18451) -- data filtering with ArmoRM
- [ArmoRM Paper](https://arxiv.org/abs/2406.12845) -- multi-objective reward modeling
- [Optimizer Comparison (Medium)](https://medium.com/@sulbha.jindal/optimizers-in-llm-adamw-vs-adafactor-54fc3cb37671) -- adamw vs adafactor

### Tertiary (LOW confidence -- needs validation)
- Linear D2Z scheduler claim (single ICLR 2026 paper, not yet widely replicated)
- WSO scheduler claim (emerging, needs more validation)
- ArmoRM score thresholds (no canonical values exist; dataset-dependent)
