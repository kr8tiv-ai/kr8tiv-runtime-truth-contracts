# Phase 1: Cipher Training Pipeline - Research

**Researched:** 2026-04-11
**Domain:** LLM fine-tuning pipeline for creative code generation (Three.js, GSAP, Lenis, advanced CSS)
**Confidence:** MEDIUM-HIGH

## Summary

This phase builds a 4-stage fine-tuning pipeline (SFT -> SimPO -> GRPO -> KTO) to transform Gemma 4 31B into "Cipher Code Kraken" -- a model that generates Awwwards-worthy, anti-AI-slop websites. All training runs on Colab Pro+ A100 40GB using Unsloth + TRL.

The critical challenge is not the training infrastructure (Unsloth handles that well) but the **training data quality**. Sourcing genuine creative agency code patterns (Three.js scenes, GSAP ScrollTrigger animations, Lenis smooth scrolling, WebGL shaders) and structuring them as instruction-following examples requires significant curation effort. The anti-slop SimPO stage needs carefully crafted preference pairs that contrast hand-crafted creative code against generic AI-generated template garbage.

**Primary recommendation:** Use Gemma 4 31B Dense (not the 26B MoE) with QLoRA on A100. Build training data from GitHub repos tagged `awwwards`, `gsap`, `three.js`, `lenis-scroll`, plus CodePen collections from GreenSock's official account. Structure data as full component examples (not snippets) in chat-template format. Run SFT first on ~2,000 curated creative code examples, then SimPO with ~1,000 chosen/rejected pairs where "rejected" is AI-slop versions of the same components.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRAIN-01 | SFT stage on curated creative code dataset | Unsloth SFTTrainer with chat template format, 2000+ examples, Gemma 4 31B QLoRA on A100 |
| TRAIN-02 | SimPO stage for anti-slop preference optimization | TRL CPOTrainer with loss_type="simpo", chosen/rejected pairs of hand-crafted vs generic code |
| TRAIN-03 | GRPO stage for reward-based creative quality reinforcement | Unsloth GRPO with custom reward functions scoring Three.js/GSAP usage, code structure quality |
| TRAIN-04 | KTO stage for binary user feedback alignment | TRL KTOTrainer with thumbs-up/down signals on generated creative code outputs |
| TRAIN-05 | Training data curation pipeline for Awwwards-quality code | GitHub scraping (awwwards/gsap/threejs topics), CodePen collections, creative agency repos |
| TRAIN-06 | Anti-slop detection and penalization | Pattern-based reward functions detecting div soup, gradient heroes, template layouts, generic naming |
| TRAIN-07 | Model export to GGUF for Ollama deployment | Unsloth merge + llama.cpp GGUF conversion, Q4_K_M quantization |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Unsloth | latest (2026.3+) | QLoRA training framework | 2x faster, 70% less VRAM. Native Gemma 4 31B support. Only viable option for A100 Colab. |
| TRL | v1.0+ | Trainer classes (SFTTrainer, CPOTrainer, GRPOTrainer, KTOTrainer) | HuggingFace unified post-training stack. Unsloth integrates with TRL kernels. |
| bitsandbytes | 0.45+ | 4-bit quantization for QLoRA | Required for loading 31B in ~22GB VRAM. |
| Transformers | 4.50+ / 5.1+ | Model loading backbone | Unsloth patches it. Pin to version Unsloth documents. |
| PEFT | 0.14+ | LoRA adapter management | Manages adapter creation, merge, and export. |
| Datasets | latest | Dataset loading and processing | HuggingFace standard for training data pipelines. |
| W&B (wandb) | latest | Experiment tracking | Track loss curves, reward scores, eval metrics across all 4 stages. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| llama.cpp | latest release tag | GGUF conversion and quantization | After training, for model export. Pin release for reproducible GGUFs. |
| Crawl4AI | latest | Web scraping for training data | Scraping creative agency websites and CodePen for training examples. |
| beautifulsoup4 | latest | HTML parsing for code extraction | Parsing scraped website source to extract JS/CSS components. |
| PyGithub / gh CLI | latest | GitHub API access | Collecting repos from awwwards, gsap, threejs, lenis-scroll topics. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Unsloth | Axolotl | Heavier config, slower on single GPU. Unsloth purpose-built for Colab. |
| Gemma 4 31B Dense | Gemma 4 26B A4B MoE | MoE requires 16-bit LoRA (no QLoRA), needs >40GB VRAM -- does not fit A100 40GB reliably. |
| SimPO via CPOTrainer | DPOTrainer | SimPO is reference-free (no ref model = less VRAM), outperforms DPO by 6.4pts on AlpacaEval. |
| 4-stage pipeline | SFT-only | SFT alone causes persona drift. Preference stages (SimPO/GRPO/KTO) are required for anti-slop behavior. |

## Architecture Patterns

### Recommended Pipeline Structure

```
Stage 1: SFT (Supervised Fine-Tuning)
  Input: 2,000+ creative code instruction-response pairs
  Output: Base creative coding adapter
  Duration: ~2-4 hours on A100

Stage 2: SimPO (Simple Preference Optimization)
  Input: 1,000+ chosen/rejected pairs (hand-crafted vs AI-slop)
  Output: Anti-slop preference adapter (merged from SFT)
  Duration: ~2-3 hours on A100

Stage 3: GRPO (Group Relative Policy Optimization)
  Input: Prompts + reward functions scoring creative code quality
  Output: Reward-optimized adapter
  Duration: ~4-8 hours on A100

Stage 4: KTO (Kahneman-Tversky Optimization)
  Input: Binary thumbs-up/down on generated outputs
  Output: Final aligned adapter
  Duration: ~1-2 hours on A100
```

### Pattern 1: Training Data Format (Chat Template)

**What:** All training data uses Gemma 4's native chat template format.
**When to use:** All SFT examples.

```python
# SFT dataset format - conversational
{
    "conversations": [
        {
            "role": "user",
            "content": "Create a Three.js particle system that responds to mouse movement with GSAP-powered easing transitions"
        },
        {
            "role": "assistant", 
            "content": "```javascript\nimport * as THREE from 'three';\nimport gsap from 'gsap';\n\n// [full component code here - NOT snippets]\n// Minimum 50-200 lines of production-quality code\n```\n\nThis creates a particle field where each particle tracks the cursor with staggered GSAP easing. Key techniques:\n- `THREE.BufferGeometry` with custom attributes for per-particle animation\n- `gsap.to()` with `overwrite: 'auto'` to prevent animation stacking\n- RequestAnimationFrame loop synced with Three.js renderer"
        }
    ]
}
```

### Pattern 2: SimPO Preference Pair Format

**What:** Chosen/rejected pairs where "rejected" is AI-slop equivalent of the same component.
**When to use:** SimPO stage training data.

```python
# SimPO/CPO dataset format - preference pairs
{
    "prompt": "Build a hero section with 3D text that rotates on scroll",
    "chosen": "```javascript\n// Uses Three.js TextGeometry with custom shader material\n// GSAP ScrollTrigger pinning with scrub\n// Lenis smooth scroll integration\n// [200+ lines of hand-crafted code with custom easing curves]\n```",
    "rejected": "```html\n<div class='hero-section bg-gradient-to-r from-purple-600 to-blue-500'>\n  <h1 class='text-6xl font-bold text-white animate-bounce'>Welcome</h1>\n  <p class='text-xl text-gray-200'>Amazing website template</p>\n</div>\n```"
}
```

### Pattern 3: GRPO Reward Function

**What:** Multi-signal reward functions that score creative code quality.
**When to use:** GRPO stage.

```python
def creative_code_reward(completions, **kwargs):
    """Multi-signal reward for creative code quality."""
    rewards = []
    for completion in completions:
        score = 0.0
        code = completion
        
        # Positive signals (creative techniques)
        if 'THREE.' in code or 'three' in code: score += 2.0
        if 'gsap.' in code or 'ScrollTrigger' in code: score += 2.0
        if 'Lenis' in code or 'lenis' in code: score += 1.5
        if 'requestAnimationFrame' in code: score += 1.0
        if 'gl_FragColor' in code or 'shader' in code.lower(): score += 2.0
        if 'clip-path' in code or 'mix-blend-mode' in code: score += 1.5
        if 'IntersectionObserver' in code: score += 1.0
        if 'canvas' in code.lower(): score += 1.0
        
        # Negative signals (AI slop patterns)
        slop_patterns = [
            'bg-gradient-to', 'animate-bounce', 'animate-pulse',
            'font-bold text-white', 'Lorem ipsum',
            'hero-section', 'cta-button', 'feature-card',
            'Welcome to', 'Get Started', 'Learn More',
        ]
        for pattern in slop_patterns:
            if pattern in code: score -= 2.0
        
        # Structure quality
        lines = code.count('\n')
        if lines > 50: score += 1.0  # Substantial code
        if lines > 150: score += 1.0  # Full component
        if lines < 15: score -= 3.0  # Too short = template
        
        # Div soup detection
        div_count = code.count('<div')
        total_elements = sum(code.count(f'<{t}') for t in 
            ['div', 'section', 'article', 'canvas', 'svg', 'main', 'header', 'nav'])
        if total_elements > 0 and div_count / total_elements > 0.7:
            score -= 3.0  # Div soup penalty
        
        rewards.append(score)
    return rewards
```

### Pattern 4: Adapter Merging Between Stages

**What:** Each stage builds on the previous by merging the adapter before the next stage.
**When to use:** Between each pipeline stage.

```python
# After SFT, merge adapter into base for SimPO stage
model.save_pretrained_merged("merged_sft", tokenizer)

# Load merged model for next stage
model = FastLanguageModel.from_pretrained("merged_sft", load_in_4bit=True)
model = FastLanguageModel.get_peft_model(model, r=16, ...)
# Now train SimPO on this SFT-merged base
```

### Anti-Patterns to Avoid

- **Snippet-based training data:** Teaching with 5-10 line snippets produces a model that generates incomplete code. Use full components (50-200+ lines).
- **Generic instruction prompts:** "Write a website" is too vague. Prompts must be specific: "Create a WebGL shader that generates a noise-based terrain with GSAP-controlled camera dolly on scroll."
- **Training on minified code:** Minified source from production websites is unlearnable. Always use source/unminified versions.
- **Mixing quality levels:** All SFT data must be consistently high quality. One bad example in 100 teaches the model to produce garbage.
- **Skipping the SFT stage:** Jumping straight to preference optimization without SFT base means the model has no foundation for creative code patterns.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QLoRA training loop | Custom training loop | Unsloth + TRL trainers | Gradient checkpointing, memory optimization, flash attention handled automatically |
| Preference optimization math | Custom SimPO loss | TRL CPOTrainer with loss_type="simpo" | Reference-free reward calculation, proven implementation |
| GGUF conversion | Custom quantization | llama.cpp convert scripts via Unsloth export | Quantization is numerically sensitive, bugs = broken models |
| Dataset formatting | Manual chat template injection | datasets library + tokenizer.apply_chat_template | Chat template errors cause training on garbage tokens |
| Experiment tracking | Custom logging | W&B (wandb) | Loss curves, reward distributions, checkpoint comparison |
| GitHub scraping | Raw requests to GitHub | PyGithub or GitHub REST API | Rate limiting, pagination, auth handled properly |

## Common Pitfalls

### Pitfall 1: OOM on Gemma 4 31B QLoRA
**What goes wrong:** Training crashes with CUDA OOM despite model fitting in VRAM.
**Why it happens:** Optimizer states, gradients, and activation checkpoints add 30-50% on top of model weights. Sequence length and batch size compound this.
**How to avoid:**
- `per_device_train_batch_size=1` with `gradient_accumulation_steps=4`
- `use_gradient_checkpointing="unsloth"` (critical -- saves 30% VRAM)
- Start with `max_seq_length=4096`, increase only if VRAM allows
- Use `bf16=True` (A100 native support, not fp16)
- Monitor with `torch.cuda.max_memory_allocated()`
**Warning signs:** Training starts but crashes 10-50 steps in. Loss reported as NaN.

### Pitfall 2: Catastrophic Forgetting of Base Capabilities
**What goes wrong:** After creative code SFT, model loses ability to follow general instructions, reason about code structure, or handle edge cases.
**Why it happens:** Aggressive SFT on narrow creative code data overwrites general knowledge.
**How to avoid:**
- Mix 10-20% general instruction-following data into SFT dataset
- Use LoRA (not full fine-tune) to limit parameter space affected
- Keep LoRA rank moderate (r=16, not r=64) 
- Run eval suite after each stage testing BOTH creative code AND general capabilities
- Set KL divergence penalties in GRPO to prevent policy drift
- Consider PAFT pattern: parallel SFT + alignment adapters, then merge
**Warning signs:** Model starts generating creative code patterns in response to non-code queries.

### Pitfall 3: Reward Hacking in GRPO
**What goes wrong:** Model learns to game reward function by stuffing Three.js/GSAP keywords without coherent code.
**Why it happens:** Surface-level keyword detection in reward function is exploitable.
**How to avoid:**
- Reward function must check code STRUCTURE not just keywords
- Add syntax validation (does the code parse?)
- Include semantic checks (are imports used? are variables defined before use?)
- Add diversity penalty (penalize repeated reward-gaming patterns)
- Human eval checkpoints every 100 steps
- Track reward score vs human eval correlation -- divergence = hacking
**Warning signs:** Reward scores climbing rapidly but generated code quality stagnating.

### Pitfall 4: SimPO "Rejected" Data Too Weak
**What goes wrong:** If rejected examples are obviously terrible, the model learns nothing useful. It needs to distinguish between "good but generic" and "genuinely creative."
**Why it happens:** Easy contrast (hand-crafted vs empty div) teaches nothing. Hard contrast (good template vs Awwwards-quality) teaches taste.
**How to avoid:**
- Rejected examples should be competent but generic (Bootstrap/Tailwind templates, basic CSS animations)
- NOT broken code or empty HTML
- The quality gap should be in creativity and technique, not basic competence
- Include rejected examples from actual AI code generators (Claude, GPT output for the same prompts)
**Warning signs:** SimPO loss drops to near-zero quickly = contrast too easy.

### Pitfall 5: Training Data Licensing Issues
**What goes wrong:** Scraping creative agency production sites without permission creates legal risk.
**Why it happens:** Awwwards sites are commercial products with copyright.
**How to avoid:**
- Prioritize MIT/Apache-licensed GitHub repos
- Use tutorial/educational repos (explicitly shared for learning)
- CodePen pens are public by design (check individual licenses)
- For production sites: extract techniques and patterns, don't copy verbatim
- Document data provenance for every training example
**Warning signs:** Training data contains proprietary client branding, logos, or copyrighted content.

### Pitfall 6: MoE Model (26B A4B) QLoRA Incompatibility
**What goes wrong:** Attempting QLoRA on the 26B A4B MoE variant produces degraded results or OOM.
**Why it happens:** MoE architecture interacts poorly with 4-bit quantization. Unsloth explicitly recommends against it.
**How to avoid:** Use the 31B Dense model, not the 26B A4B MoE. The 31B Dense works well with QLoRA on A100.
**Warning signs:** Unsloth docs warning about MoE + QLoRA.

## Code Examples

### Complete SFT Training Setup

```python
# Source: Unsloth Gemma 4 docs + TRL v1.0
from unsloth import FastLanguageModel
from trl import SFTTrainer, SFTConfig
from datasets import load_dataset

# Load Gemma 4 31B with QLoRA
model, tokenizer = FastLanguageModel.from_pretrained(
    "unsloth/gemma-4-31B-it",
    load_in_4bit=True,
    max_seq_length=4096,
    dtype=None,  # auto-detect
)

# Apply LoRA
model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    lora_alpha=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                     "gate_proj", "up_proj", "down_proj"],
    use_gradient_checkpointing="unsloth",
    random_state=42,
)

# Load creative code dataset
dataset = load_dataset("json", data_files="creative_code_sft.jsonl")

# SFT Config
sft_config = SFTConfig(
    output_dir="./cipher-sft",
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,
    num_train_epochs=2,
    learning_rate=2e-4,
    bf16=True,
    logging_steps=10,
    save_steps=100,
    max_seq_length=4096,
    dataset_text_field="text",  # or use formatting_func
    report_to="wandb",
)

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset["train"],
    args=sft_config,
)

trainer.train()
model.save_pretrained_merged("cipher-sft-merged", tokenizer)
```

### SimPO Training (Anti-Slop Stage)

```python
# Source: TRL CPOTrainer docs (SimPO via loss_type)
from trl import CPOTrainer, CPOConfig

# Load SFT-merged model
model, tokenizer = FastLanguageModel.from_pretrained(
    "cipher-sft-merged",
    load_in_4bit=True,
    max_seq_length=4096,
)
model = FastLanguageModel.get_peft_model(model, r=16, ...)

# SimPO config via CPOTrainer
simpo_config = CPOConfig(
    output_dir="./cipher-simpo",
    loss_type="simpo",
    cpo_alpha=0.0,          # Pure SimPO (no CPO regularization)
    simpo_gamma=1.4,        # Target reward margin (paper default 1.4)
    beta=2.0,               # SimPO paper recommends 2.0
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,
    num_train_epochs=1,
    learning_rate=5e-5,     # Lower LR for preference stage
    bf16=True,
    max_length=4096,
    max_prompt_length=512,
    report_to="wandb",
)

# Dataset: {"prompt": ..., "chosen": ..., "rejected": ...}
preference_dataset = load_dataset("json", data_files="creative_code_preferences.jsonl")

trainer = CPOTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=preference_dataset["train"],
    args=simpo_config,
)

trainer.train()
model.save_pretrained_merged("cipher-simpo-merged", tokenizer)
```

### GRPO with Creative Code Reward

```python
# Source: Unsloth GRPO docs + TRL GRPOTrainer
from trl import GRPOTrainer, GRPOConfig

# Note: Disable fast vLLM inference for GRPO in Unsloth
model, tokenizer = FastLanguageModel.from_pretrained(
    "cipher-simpo-merged",
    load_in_4bit=True,
    max_seq_length=4096,
)
model = FastLanguageModel.get_peft_model(model, r=16, ...)

grpo_config = GRPOConfig(
    output_dir="./cipher-grpo",
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,
    num_train_epochs=1,
    learning_rate=1e-5,      # Even lower for RL
    bf16=True,
    max_completion_length=4096,
    num_generations=4,        # GRPO group size
    report_to="wandb",
)

# Reward function (see Architecture Patterns section)
trainer = GRPOTrainer(
    model=model,
    tokenizer=tokenizer,
    reward_funcs=[creative_code_reward],
    train_dataset=prompts_dataset,
    args=grpo_config,
)

trainer.train()
model.save_pretrained_merged("cipher-grpo-merged", tokenizer)
```

### KTO Binary Feedback Stage

```python
# Source: TRL KTOTrainer docs
from trl import KTOTrainer, KTOConfig

model, tokenizer = FastLanguageModel.from_pretrained(
    "cipher-grpo-merged",
    load_in_4bit=True,
    max_seq_length=4096,
)
model = FastLanguageModel.get_peft_model(model, r=16, ...)

kto_config = KTOConfig(
    output_dir="./cipher-kto",
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,
    num_train_epochs=1,
    learning_rate=5e-6,      # Very low LR for final alignment
    bf16=True,
    max_length=4096,
    max_prompt_length=512,
    report_to="wandb",
)

# KTO dataset format: prompt + completion + label (True/False)
# {
#   "prompt": "Create a...",
#   "completion": "```javascript...",
#   "label": true  # thumbs up
# }
kto_dataset = load_dataset("json", data_files="creative_code_kto.jsonl")

trainer = KTOTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=kto_dataset["train"],
    args=kto_config,
)

trainer.train()

# Final export to GGUF
model.save_pretrained_merged("cipher-final-merged", tokenizer)
# Then use llama.cpp for GGUF conversion
```

### GGUF Export

```python
# Source: Unsloth export docs
# After final stage, export to GGUF
model.save_pretrained_gguf(
    "cipher-code-kraken",
    tokenizer,
    quantization_method="q4_k_m",  # Default quality tier
)
# Also export Q5_K_M for quality-first users
model.save_pretrained_gguf(
    "cipher-code-kraken-q5",
    tokenizer,
    quantization_method="q5_k_m",
)
```

## Training Data Sources and Curation

### Source 1: GitHub Repos (PRIMARY)

| GitHub Topic | Estimated Repos | Quality Level | License Status |
|-------------|-----------------|---------------|----------------|
| `awwwards` | 200+ | High | Mostly MIT/educational |
| `awwwards-inspired` | 100+ | Medium-High | Mostly MIT |
| `gsap-scrolltrigger` | 500+ | Medium | Mixed |
| `gsap-animation` | 800+ | Medium | Mixed |
| `threejs` (filtered by stars) | 1000+ | Variable | Mixed |
| `lenis-scroll` | 50+ | High | MIT |
| `animated-website` | 300+ | Medium | Mixed |

**Collection strategy:**
1. Use GitHub API to fetch repos by topic, sorted by stars
2. Filter for repos with >10 stars (quality signal)
3. Clone and extract JS/TS/CSS files
4. Filter for files containing Three.js/GSAP/Lenis imports
5. Structure as instruction-response pairs

### Source 2: CodePen Collections

| Collection | Owner | Content |
|-----------|-------|---------|
| GreenSock official | @GreenSock | GSAP demos, ScrollTrigger, SplitText, Flip |
| Three.js examples | Various | 3D scenes, shaders, particles |
| Creative coding | Various | Canvas, WebGL experiments |

**Collection strategy:** CodePen has a public API. Fetch pens by tags (gsap, threejs, webgl, creative-coding). Extract HTML/CSS/JS from each pen.

### Source 3: Creative Agency Open-Source Projects

| Project | Agency/Creator | What It Teaches |
|---------|---------------|-----------------|
| Lenis | darkroom engineering | Smooth scrolling patterns |
| r3f-scroll-rig | 14islands | Three.js + DOM sync |
| locomotive-scroll | Locomotive | Viewport detection + parallax |
| loconative-scroll | Community | Modern Locomotive + Lenis |

### Source 4: Tutorial/Educational Repos (HIGH QUALITY)

| Repo | Creator | Content |
|------|---------|---------|
| award-winning-website | adrianhajdin (JS Mastery) | GSAP + React + Three.js full site |
| GSAP-Awwwards-Website | Fullstack-Empire | GSAP + React + Tailwind |
| Various clones | Individual devs | Recreations of Awwwards SOTD winners |

### Data Structuring Strategy

**For each source file, generate an instruction-response pair:**

1. **Analyze the code** to determine what it does (Three.js scene, GSAP animation, scroll effect, etc.)
2. **Generate a natural instruction** that would produce this code ("Create a particle system that..." / "Build a scroll-triggered text reveal with...")
3. **Include full component code** as the response (50-200+ lines minimum)
4. **Add explanation** of key techniques used
5. **Tag with technique categories:** three.js, gsap, lenis, shader, css-advanced, canvas

**Target dataset sizes:**
- SFT: 2,000-3,000 instruction-response pairs
- SimPO: 1,000-1,500 chosen/rejected preference pairs
- GRPO: 500-1,000 prompts (model generates responses, reward function scores them)
- KTO: 500-1,000 prompt+completion+binary-label triples

### Anti-Slop "Rejected" Data Generation

For SimPO rejected examples, generate the slop versions by:
1. Taking the same prompt as a chosen example
2. Asking a baseline LLM (untuned Gemma 4 or GPT-3.5) to generate a response
3. The generic output becomes the "rejected" example
4. Alternatively: deliberately create template-based versions using Tailwind UI patterns, Bootstrap components, generic hero sections

**Slop detection signals for rejected labeling:**
- Div soup: >70% of HTML elements are `<div>`
- Gradient hero: `bg-gradient-to-r`, `from-purple`, `to-blue` patterns
- Template naming: `hero-section`, `cta-button`, `feature-card`
- Missing interactivity: no JS event listeners, no animation library imports
- Utility-class-only styling: no custom CSS, no keyframes, no clip-path
- Generic copy: "Welcome to", "Get Started", "Learn More", "Lorem ipsum"
- No canvas/WebGL/SVG: pure HTML+CSS with no creative elements

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| DPO for preferences | SimPO (reference-free) | 2024 (NeurIPS) | No reference model = less VRAM, +6.4pts on AlpacaEval |
| PPO for RL | GRPO (group relative) | 2024-2025 | No critic model = 50% less VRAM, simpler pipeline |
| Full fine-tuning | QLoRA via Unsloth | 2023-2026 | 31B model trainable on single A100 instead of 8xA100 |
| Paired preferences for KTO | Binary feedback (thumbs up/down) | 2024 | Matches DPO performance with simpler data collection |
| Locomotive Scroll | Lenis | 2023-2024 | Lenis is now the industry standard for smooth scrolling |

**Deprecated/outdated:**
- **Locomotive Scroll v4:** Superseded by Lenis (made by the same team at darkroom engineering). Use Lenis in all training data.
- **RLHF with PPO + separate reward model:** GRPO eliminates the need for a separate reward model.
- **DPO with reference model:** SimPO eliminates this, saving significant VRAM.

## Open Questions

1. **Exact Unsloth GRPO compatibility with Gemma 4 31B**
   - What we know: GRPO works in Unsloth if you disable fast vLLM inference. Gemma 4 31B has SFT notebooks.
   - What's unclear: Whether GRPO specifically has been tested on 31B (vs smaller Gemma 4 models). May need to fall back to TRL GRPOTrainer directly.
   - Recommendation: Test GRPO on Gemma 4 31B in Wave 0. Have TRL-native fallback ready.

2. **Optimal sequence length for creative code training**
   - What we know: Three.js scenes can be 200-500+ lines. 4096 tokens may truncate complex examples.
   - What's unclear: Whether 8192 tokens fits in VRAM alongside QLoRA overhead.
   - Recommendation: Start at 4096, test 8192 if VRAM allows. Structure training data to fit within 4096 tokens first (split very large components into focused sub-components).

3. **Adapter merging stability across 4 stages**
   - What we know: Each stage requires merging the previous adapter into the base before continuing.
   - What's unclear: Whether 4 sequential merge-retrain cycles accumulate quality degradation.
   - Recommendation: Run eval benchmarks after each merge. If quality degrades at stage 3-4, consider training stages 2-4 on the same LoRA adapter (stacked, not merged).

4. **Training data volume vs. quality tradeoff**
   - What we know: 1,000 perfect examples beats 50,000 mediocre ones for personality/style.
   - What's unclear: Minimum viable dataset size for teaching Three.js/GSAP patterns.
   - Recommendation: Start with 500 hand-curated examples for SFT, evaluate, scale up. Quality bar: every example must compile and demonstrate a genuine creative technique.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Google Colab Pro+ | All training stages | Requires subscription | A100 40GB | None -- A100 is minimum for 31B QLoRA |
| Unsloth | Training framework | pip install | Latest | TRL directly (slower, more VRAM) |
| TRL | Trainer classes | pip install | v1.0+ | N/A |
| W&B | Experiment tracking | pip install + free account | Latest | TensorBoard (less features) |
| GitHub API | Training data collection | Free tier (60 req/hr) or token (5000/hr) | REST v3 | Manual repo cloning |
| llama.cpp | GGUF export | Build from source or Unsloth export | Latest | Unsloth built-in GGUF export |
| HuggingFace Hub | Model storage | Free account | N/A | Google Drive (less convenient) |

**Missing dependencies with no fallback:**
- Colab Pro+ A100 is non-negotiable for 31B QLoRA training.

**Missing dependencies with fallback:**
- GitHub API rate limits can be managed with authenticated tokens (5000 req/hr).

## Sources

### Primary (HIGH confidence)
- [Unsloth Gemma 4 Fine-tuning Guide](https://unsloth.ai/docs/models/gemma-4/train) -- Model-specific training parameters, VRAM requirements
- [Unsloth Preference Optimization (DPO/ORPO/KTO/SimPO)](https://unsloth.ai/docs/get-started/reinforcement-learning-rl-guide/preference-dpo-orpo-and-kto) -- Confirmed SimPO, KTO, GRPO trainer support
- [TRL v1.0 Trainer Documentation](https://huggingface.co/docs/trl/main/en/trainer) -- All trainer classes: SFTTrainer, CPOTrainer, GRPOTrainer, KTOTrainer
- [TRL CPOTrainer (SimPO)](https://huggingface.co/docs/trl/v0.11.1/en/cpo_trainer) -- SimPO via loss_type="simpo", dataset format
- [SimPO Paper (NeurIPS 2024)](https://arxiv.org/abs/2405.14734) -- Reference-free preference optimization, +6.4pts AlpacaEval
- [Unsloth GitHub](https://github.com/unslothai/unsloth) -- Latest releases, >80% TRL coverage

### Secondary (MEDIUM confidence)
- [Fine-tuning Gemma 4 Step-by-Step (Medium)](https://medium.com/@gabi.preda/from-oom-errors-to-working-model-fine-tuning-gemma-4-e2b-step-by-step-using-unsloth-ef7873e59efd) -- Practical OOM troubleshooting
- [Fine-Tuning in 2026: Axolotl vs Unsloth vs TRL vs LLaMA-Factory](https://dev.to/ultraduneai/eval-003-fine-tuning-in-2026-axolotl-vs-unsloth-vs-trl-vs-llama-factory-2ohg) -- Framework comparison
- [Catastrophic Forgetting in LLM Tuning](https://apxml.com/courses/fine-tuning-adapting-large-language-models/chapter-5-advanced-fine-tuning-strategies/mitigating-catastrophic-forgetting) -- Mitigation strategies
- [Data-efficient LLM Fine-tuning for Code Generation](https://arxiv.org/html/2504.12687) -- OSS-Instruct approach for code data

### Tertiary (LOW confidence -- needs validation)
- Exact VRAM headroom for GRPO on 31B with 4096 seq_length (theoretical fit, not empirically confirmed in search results)
- Adapter merging stability across 4 sequential stages (no published benchmarks found for this specific pipeline)
- CodePen API availability and rate limits for bulk collection (API docs not directly verified)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Unsloth + TRL is the established 2026 pipeline, well-documented for Gemma 4
- Architecture (4-stage pipeline): MEDIUM -- Each stage is proven individually; the 4-stage combination for creative code is novel
- Training data sources: MEDIUM -- GitHub repos confirmed available; quantity/quality of creative code repos needs hands-on validation
- Anti-slop reward functions: MEDIUM -- Pattern-based detection is sound but reward function tuning requires empirical iteration
- Pitfalls: HIGH -- Sourced from Unsloth docs, research papers, and STACK.md/PITFALLS.md project research

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (Unsloth moves fast; re-verify trainer compatibility before execution)
