# Phase 1: Cipher Training Pipeline - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Fine-tune Gemma 4 31B into the Cipher Code Kraken persona using the 4-stage alignment pipeline (SFT → SimPO → GRPO → KTO data collection). Output: trained LoRA adapters, GGUF exports, Ollama Modelfile, and verified personality adherence. All training runs on Colab Pro+ A100.

Requirements covered: TRAIN-01 through TRAIN-07.

</domain>

<decisions>
## Implementation Decisions

### Training Data Strategy
- **Hybrid approach:** Templates for bulk (5K examples) + frontier distillation for high-value examples (3K persona, design critique, tool-use)
- Templates via `training/data-generators/generate-all-companions.py` — zero cost, good for structural patterns
- Frontier distillation via Claude Opus / GPT-5.4 — ~$5-10 API credits for 3K high-quality Cipher-voice examples
- Total target: 8K SFT examples, 5K SimPO pairs, 3K GRPO problems
- Frontier distillation focuses on: persona conversations (Maximum Kraken voice), multi-file design critiques, tool-calling trajectories

### CRITICAL: Anti-AI-Slop & Awwwards-Worthy Output (NON-NEGOTIABLE)
- Cipher must produce **stunning, high-end websites** — the kind that win Awwwards, not generic Bootstrap/template garbage
- Training data MUST include examples of premium creative development:
  - **Three.js** — 3D scenes, particle systems, immersive experiences, WebGL shaders
  - **GSAP** — Professional scroll-triggered animations, timeline sequences, SplitText, ScrollTrigger, Flip
  - **Lenis** — Buttery smooth scrolling, parallax, scroll-linked animations
  - **Vanilla JS** — Custom cursor effects, magnetic buttons, text reveal animations, canvas experiments
  - **Advanced CSS** — clip-path animations, mix-blend-mode, custom properties animations, container queries
  - **Framer Motion** — Layout animations, shared element transitions, spring physics, gesture-driven UI
- SimPO preference pairs MUST specifically train against AI slop:
  - **Chosen:** Hand-crafted, agency-quality code with GSAP ScrollTrigger + Lenis smooth scroll + custom cursor
  - **Rejected:** Generic div soup with Tailwind defaults, no animations, cookie-cutter layouts
  - **Chosen:** Three.js hero with particle mesh + organic camera movement
  - **Rejected:** Static hero image with gradient overlay and centered text (the classic AI slop pattern)
  - **Chosen:** Custom SVG morphing navigation with magnetic hover effects
  - **Rejected:** Basic hamburger menu with no personality
- GRPO problems should include Awwwards-caliber challenges:
  - "Build a portfolio with smooth page transitions using GSAP Flip + Lenis"
  - "Create an interactive 3D product viewer with Three.js and OrbitControls"
  - "Design a landing page with scroll-triggered text reveals using GSAP SplitText"
  - "Build a custom cursor that morphs on hover using vanilla JS + CSS mix-blend-mode"
- **Scrape real Awwwards/FWA/CSS Design Awards sites** for code patterns and structure
- Training data should reference real creative agencies: Locomotive, Active Theory, Resn, 14islands, Immersive Garden
- The model should know the difference between "website" and "web experience"
- If Cipher generates a website that looks like it came from a template, the reward function should PENALIZE it heavily

### Personality Enforcement: Maximum Kraken
- **Every response** should have ocean metaphors, tentacle references, "bloop" sounds, excitement about design
- Character should NEVER break — even in error messages, Cipher stays the Kraken
- Persona data should be 20-25% of total SFT mix (higher than typical 5-10%)
- SimPO preference pairs: Kraken-voice response = chosen, generic AI response = rejected
- GRPO reward includes 0.2 weight for personality adherence (measured by keyword/pattern matching)
- Training examples should show Cipher being Maximum Kraken even during technical work: "Let me wrap all eight tentacles around this TypeScript error..."

### GRPO Reward Weights (Accessibility + Anti-Slop)
- **0.30** — Accessibility (axe-core WCAG pass rate, semantic HTML, ARIA attributes)
- **0.30** — Creative Quality / Anti-Slop (detects GSAP/Three.js/Lenis/custom animations, penalizes generic templates, rewards hand-crafted interactions)
- **0.20** — Personality (kraken metaphors, teaching explanations, excitement patterns)
- **0.10** — Executability (valid HTML/JSX, balanced tags, no errors)
- **0.10** — Code Craftsmanship (vanilla JS over jQuery, custom solutions over libraries, creative CSS over utility-only)
- Plus format bonus for valid JSON tool calls
- **Anti-slop penalty:** -0.3 if output contains patterns like: centered-text-on-gradient hero, generic card grids with no interaction, div soup with no semantic structure, or cookie-cutter layouts
- **Creative bonus:** +0.2 for detecting: GSAP timeline/ScrollTrigger usage, Three.js scene setup, Lenis smooth scroll, custom cursor implementation, SVG animation, canvas experiments
- This enforces: WCAG compliance is non-negotiable AND output must be Awwwards-worthy, not AI slop

### Training Execution: All on Colab A100
- Full pipeline on Colab Pro+ A100 40GB
- One notebook per session — simplest workflow
- SFT: ~3.5 hours, ~53 compute units
- SimPO: ~2 hours, ~30 compute units
- GRPO: ~4 hours, ~60 compute units
- Total Phase 1: ~83 compute units (7.5% of 1100 budget)
- Use compute-tracker.py to log units after each stage
- Checkpoint after each stage — if Colab disconnects, resume from last checkpoint

### Claude's Discretion
- Exact LoRA hyperparameters (rank 64/alpha 128 recommended but planner can adjust)
- Data augmentation strategies (temperature variation, rejection sampling)
- Evaluation benchmark selection (Web-Bench, accessibility suite, persona classifier)
- GGUF quantization details (Q4_K_M primary, Q5_K_M premium — already decided in PROJECT.md)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Training Infrastructure (Existing)
- `training/fine-tune.py` — Existing 4-stage fine-tune script (Unsloth, all stages, Gemma 4 support)
- `training/modelfile-generator.ts` — Generates Ollama Modelfiles with Gemma 4 stop tokens
- `training/train-companion.ts` — TypeScript orchestrator for training pipeline
- `training/curate-data.ts` — Data curation utilities
- `training/data-generators/cipher-*.ts` — Existing Cipher-specific data generators (web-dev, persona, tool-use, alignment, safety, voice)

### Companion Definition
- `companions/cipher.md` — Cipher personality definition (personality matrix, speech patterns, specialization)
- `companions/config.ts` — Runtime config with model routing (localModel, frontierProvider, escalationLevel)

### Cipher Local Model (New — built in prior work)
- `companions/cipher/training/config.yaml` — Training hyperparameters for all 4 stages
- `companions/cipher/training/stage1-sft/train.py` — SFT trainer script
- `companions/cipher/training/stage2-simpo/train.py` — SimPO trainer script
- `companions/cipher/training/stage3-grpo/train.py` — GRPO trainer with reward functions
- `companions/cipher/training/data-synthesis/generate-sft.py` — Template-based data generator
- `companions/cipher/Modelfile` — Ollama Modelfile for Cipher on Gemma 4
- `companions/cipher/soul/system-prompt.md` — Full compiled system prompt

### Master Training (Multi-Companion)
- `training/kin-training-master.yaml` — Master config for all 6 companions (schedule, budget)
- `training/compute-tracker.py` — Compute budget tracking across all training runs
- `training/train-all-companions.py` — Master orchestrator with checkpoint resume
- `training/KIN_Training_All_Companions_31B.ipynb` — Colab notebook for 31B on A100

### Research
- `.planning/research/STACK.md` — Confirmed: Gemma 4 31B, Unsloth, Q4_K_M minimum
- `.planning/research/PITFALLS.md` — Warned: catastrophic forgetting, reward hacking, Q3 unusable

</canonical_refs>

<specifics>
## Specific Ideas

- Use the existing `cipher-web-dev.ts`, `cipher-persona.ts`, `cipher-tool-use.ts` data generators as seed material
- Frontier distillation should use Claude Opus 4.6 (since that's Vortex's model, it's accessible) for generating Cipher persona conversations — the irony of one companion training another
- For Maximum Kraken enforcement, include "anti-examples" in SimPO: generic responses that sound like ChatGPT are always the rejected option
- The GRPO reward function in `stage3-grpo/train.py` already has text-based reward functions — extend these rather than rewriting
- Consider using the existing `training/distill/` module for frontier distillation rather than building new scripts

</specifics>

<deferred>
## Deferred Ideas

- KTO continuous learning from user feedback — collect data infrastructure only, defer actual retraining to v2
- Visual-ERM render loop during training (full Playwright render + screenshot scoring) — too expensive for first pass, use text-based rewards
- Voice-specific training data (TTS prosody markers) — defer to Phase 6 (Voice)

</deferred>

---

*Phase: 01-cipher-training-pipeline*
*Context gathered: 2026-04-12 via discuss-phase*
