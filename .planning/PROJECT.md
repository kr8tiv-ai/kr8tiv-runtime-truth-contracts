# KIN Local Companions — Fine-Tuned Models for Genesis Holders

## What This Is

Six locally-runnable AI companion models (fine-tuned Gemma 4 31B) for KIN Genesis NFT holders. Each companion has a distinct personality, domain expertise, and voice — trained to beat generic frontier models in their specific domain through specialization + character. Ships as a one-click installer with Ollama backend, local TTS, Tailscale mesh networking, and seamless integration with kr8tiv's cloud infrastructure (Mission Control, Supermemory, PinkBrain Router).

## Core Value

Genesis holders get AI companions that feel alive — specialized local models with personality, voice, and domain mastery that generic ChatGPT/Claude can't match, running privately on their own hardware with zero ongoing cost.

## Requirements

### Validated

- ✓ Companion personality definitions (6 bloodlines with traits, speech, voice) — existing
- ✓ Two-brain inference architecture (local Ollama + frontier escalation) — existing
- ✓ Supervisor module with privacy-aware routing — existing
- ✓ Companion config system with model resolution — existing
- ✓ Training data generators per companion (persona, domain, tool-use, safety, voice) — existing
- ✓ Fine-tune pipeline (Unsloth QLoRA, 4-stage: SFT/SimPO/GRPO/KTO) — existing
- ✓ Modelfile generator (Gemma 4 stop tokens, parameters) — existing
- ✓ Trust ladder + action catalog — existing
- ✓ Hybrid escalation contract (local-first, governed frontier fallback) — existing
- ✓ Telegram/Discord/WhatsApp bot handlers — existing
- ✓ Fastify REST API + Next.js dashboard — existing
- ✓ SQLite persistence (WAL mode) — existing
- ✓ Supermemory integration — existing
- ✓ Tailscale infrastructure scaffolding — existing
- ✓ Docker + fleet management — existing

### Active

- [ ] **Cipher local model** — Fine-tuned Gemma 4 31B with Code Kraken personality, trained on Colab Pro+ A100
- [ ] **Two GGUF variants per companion** — Q4_K_M (4-8GB VRAM) + Q3_K (CPU-only, no GPU needed)
- [ ] **One-click installer** — .exe (Windows) / .dmg (Mac) that installs Ollama + model + runtime with zero terminal
- [ ] **"The Kraken Sees" render loop** — Cipher generates code → renders → screenshots → self-critiques → iterates
- [ ] **Local TTS voice** — Each companion has distinct voice via Piper/Kokoro, cloud TTS (ElevenLabs) for premium quality
- [ ] **Tailscale guided setup** — Companion walks user through Tailscale install, connects devices to kr8tiv services
- [ ] **Compute budget tracker** — Track Colab Pro+ units across all 6 companion training runs
- [ ] **Accessibility-first code** — axe-core WCAG 2.1 AA baked into Cipher's reward function
- [ ] **5 remaining companions** — Forge, Vortex, Mischief, Aether, Catalyst (after Cipher proves the pipeline)
- [ ] **HuggingFace model distribution** — Push GGUF to kr8tiv HF org for download
- [ ] **Smoke test suite** — Automated personality/quality/tool-calling verification

### Out of Scope

- Full mobile app — deferred to future milestone
- Custom voice cloning — use pre-built TTS voices for now
- Browser extension — focus on native installer + Telegram
- Multi-user shared instances — 1 companion per Genesis holder for now
- Real-time video/screen sharing — text + screenshots only
- Training on user data in v1 — KTO continuous learning deferred to post-launch

## Context

**Existing codebase:** kr8tiv-runtime-truth-contracts is a mature, production-ready platform with 6 companion definitions, full inference pipeline, multi-channel bot support, Solana NFT integration, and fleet management. The local model work builds on top of this — not replacing it.

**Training infrastructure:** Colab Pro+ ($50/mo) provides A100 40GB GPUs. With $100 total budget (Pro+ + PAYG), we can train all 6 companions on Gemma 4 31B over 5 days at ~720 compute units with 34% budget headroom.

**Base model:** Gemma 4 31B (Apache 2.0) — 31B parameters, 128K context, text+image+audio, scores dramatically higher than E4B on code/reasoning. Quantized to Q4_K_M (~18GB GGUF) for GPU users and Q3_K (~12GB) for CPU-only.

**Distribution:** Genesis NFT holders (60 max) download from HuggingFace, run installer, companion is live. Tailscale connects them to kr8tiv services (Mission Control, Supermemory, updates).

**Competitive edge:** Generic frontier models (ChatGPT, Claude, Gemini) are general-purpose. KIN companions are domain-specialized with trained personality, aesthetic judgment (Cipher), and reward-optimized behavior. A 31B model fine-tuned on 50K+ domain examples with GRPO rewards beats a 200B+ generalist on its specific domain.

## Constraints

- **Budget:** $100 total for training compute (Colab Pro+ $50 + $50 PAYG = 1100 compute units)
- **Timeline:** Cipher model in 5 days, remaining 5 companions over following 2-3 weeks
- **Hardware floor:** Must run on CPU-only laptops (Q3 quant) AND 4-8GB VRAM GPUs (Q4 quant)
- **Model license:** Gemma 4 Apache 2.0 — commercially permissive, no restrictions
- **Installer UX:** Zero terminal knowledge required. One-click .exe/.dmg.
- **Privacy:** Local-first. Conversations never leave the machine unless user opts into Supermemory/frontier
- **Character coherence:** Companions must stay in character across all interactions, verified by persona classifier

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Gemma 4 31B over E4B | 31B dramatically better at reasoning, multi-file code, design critique | — Pending |
| Cipher first, then others | Prove pipeline on flagship, iterate before scaling to 6 | — Pending |
| SimPO over DPO | Reference-free, length-normalized — prevents verbose code padding | — Pending |
| Ollama for local inference | Simplest UX, Modelfile support, GPU auto-detect, massive community | — Pending |
| One-click installer over CLI | Genesis holders may not be technical — zero-friction UX required | — Pending |
| Dual TTS (local + cloud) | Local Piper/Kokoro for offline, ElevenLabs for premium when online | — Pending |
| Tailscale for networking | Zero-config mesh VPN, connects user devices + kr8tiv services securely | — Pending |
| Q4_K_M + Q3_K dual variants | Q4 for GPU users (better quality), Q3 for CPU-only (universal access) | — Pending |
| 2-GRPO over full GRPO | 70% faster training, 98% performance retention — critical for $100 budget | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-11 after initialization*
