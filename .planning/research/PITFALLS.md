# Domain Pitfalls

**Domain:** Local AI companion models for non-technical NFT holders
**Researched:** 2026-04-11

---

## Critical Pitfalls

Mistakes that cause rewrites, user abandonment, or major rearchitecture.

---

### Pitfall 1: Silent GPU Fallback to CPU

**What goes wrong:** Ollama silently falls back to CPU inference when GPU detection fails. There is no loud error -- users just experience 10-50x slower inference and assume "the AI is broken." Non-technical users will never check logs or know to look for this.

**Why it happens:** CUDA driver version mismatches (needs 531+ for NVIDIA, compute capability 5.0+), ROCm on AMD has no Windows support as of early 2026 (Linux only), and macOS Metal detection can fail after system updates. After suspend/resume cycles on Linux, NVIDIA UVM driver can lose GPU access entirely.

**Consequences:** Users get 2-5 tokens/second instead of 30-60. First impression is "this is unusable." They uninstall.

**Warning signs:** Inference taking >5 seconds for short responses. `ollama ps` showing CPU instead of GPU. Users complaining about "slow AI" in support channels.

**Prevention:**
- Build a hardware detection and validation step into the installer that runs BEFORE model download
- Display clear GPU status in the companion UI (green/yellow/red indicator)
- Auto-detect GPU vendor and set environment variables (e.g., `HSA_OVERRIDE_GFX_VERSION` for unsupported AMD RDNA cards)
- Include a "speed test" on first run that benchmarks and warns if running on CPU
- For AMD Windows users: be explicit that GPU acceleration is not available; suggest Linux dual-boot or CPU-optimized quant

**Detection:** Monitor tokens/second in the client. Flag any session averaging below 10 tok/s on hardware that should do better.

**Phase:** Installer/onboarding (Phase 1). This must be solved before any user touches the product.

**Confidence:** HIGH -- sourced from Ollama official docs and multiple GitHub issues.

---

### Pitfall 2: Quantization Quality Cliff Below Q4_K_M

**What goes wrong:** Shipping Q3 quantizations to save download size produces noticeably degraded output. Persona voice becomes inconsistent, factual accuracy drops 15-20% on knowledge tasks, and instruction following degrades significantly. For a "companion" product where personality IS the product, this is fatal.

**Why it happens:** Aggressive quantization below 4-bit damages tokenizer alignment, language-specific embeddings, and attention weight precision. The quality drop is non-linear -- Q5 to Q4 is often acceptable, but Q4 to Q3 crosses a cliff where the model "feels different."

**Consequences:** Companion persona sounds generic or incoherent. Users report "my companion doesn't sound like themselves anymore." Character voice and personality -- the core value proposition -- breaks down.

**Warning signs:** Blind test failures where evaluators can distinguish quant levels. Increased "confused" or off-topic responses in Q3 logs. User sentiment dropping for specific hardware tiers.

**Prevention:**
- Ship Q4_K_M as the minimum quality floor. Never go below this for the companion persona model.
- Use Q5_K_M as the default for users with 12GB+ VRAM (sweet spot: near-imperceptible degradation)
- Use Q4_K_M only for 8GB VRAM cards. For <8GB, recommend CPU inference with Q5_K_M rather than GPU with Q3
- Run automated persona consistency tests across quant levels before each release
- Profile each target GPU tier and pre-select the best quant that fits

**Detection:** Automated eval suite that tests persona consistency, instruction following, and factual recall at each quant level. Flag any quant where persona voice divergence exceeds threshold.

**Phase:** Model pipeline (Phase 2). Must be validated before distribution infrastructure is built.

**Confidence:** HIGH -- multiple benchmark studies confirm the Q3/Q4 cliff, verified across model families.

---

### Pitfall 3: Ollama Memory Leaks in Long-Running Sessions

**What goes wrong:** Ollama progressively consumes more memory over extended sessions. After hours of conversation, the process exhausts VRAM or system RAM, causing crashes, frozen UIs, or system-wide slowdowns. For a "companion" that's meant to be always-on, this is an architectural problem.

**Why it happens:** Multiple root causes confirmed in Ollama issues: conversation context accumulation without proper cleanup, GPU memory fragmentation preventing reuse, HTTP connection pool expansion with abandoned connections, and cache eviction policy failures. Setting `keep_alive: 0` helps but doesn't fully solve it -- zombie runner processes can persist.

**Consequences:** Companion crashes mid-conversation. On machines with 8-16GB RAM, other applications start failing. Users blame their computer, not the software. Worst case: data corruption from OOM kills.

**Warning signs:** Gradually increasing response times over a session. System RAM usage climbing without plateau. VRAM utilization at 100% even during idle periods.

**Prevention:**
- Implement a session manager that periodically restarts the Ollama runner (e.g., every 2-4 hours or after N interactions)
- Monitor VRAM/RAM usage from the client and trigger graceful restart before threshold
- Set `num_ctx` conservatively (4096 for 8GB VRAM, 8192 for 16GB+) -- larger contexts accelerate the leak
- Implement conversation summarization to keep context window manageable instead of growing indefinitely
- Use `keep_alive` timeout to unload models during idle periods, with pre-warm on user activity

**Detection:** Memory monitoring daemon in the client. Alert when VRAM usage exceeds 90% or system RAM exceeds 85%. Log restart events and correlate with session length.

**Phase:** Runtime infrastructure (Phase 2-3). Needs a robust session manager before beta users get the product.

**Confidence:** HIGH -- confirmed across multiple Ollama GitHub issues (#10114, #10688, #8283) with reproducible steps.

---

### Pitfall 4: Catastrophic Forgetting During Fine-Tuning

**What goes wrong:** Fine-tuning for companion persona destroys the base model's general capabilities. The model becomes great at roleplaying the character but loses ability to follow instructions, answer questions, or handle edge cases. Result: a "companion" that can only do one thing.

**Why it happens:** Aggressive fine-tuning on narrow persona data overwrites general knowledge stored in the same parameter space. Traditional SFT is particularly vulnerable. Even GRPO, while more robust than SFT (research shows only -2.3% forgetting measure), can still cause drift if the reward function is poorly designed.

**Consequences:** Model can't handle off-script interactions. Users ask a reasonable question and get persona-speak gibberish. The companion feels like a chatbot from 2015.

**Warning signs:** Declining scores on general benchmarks (MMLU, BBH) after fine-tuning iterations. Model responses becoming formulaic. Inability to handle multi-turn conversations that go off-topic.

**Prevention:**
- Use GRPO with KL regularization rather than pure SFT -- GRPO's structured, sparse updates naturally concentrate changes in task-relevant subspaces
- Maintain an eval suite that tests BOTH persona fidelity AND general capabilities after each training run
- Use LoRA/QLoRA to limit the parameter space affected by fine-tuning
- Mix general instruction data into the fine-tuning dataset (10-20% ratio)
- Set strict KL divergence penalties to prevent policy from drifting too far from base

**Detection:** Automated eval pipeline that runs after every fine-tuning checkpoint. Track persona score AND general capability score. Reject any checkpoint where general capabilities drop >5%.

**Phase:** Fine-tuning pipeline (Phase 2). Must be solved before any persona models are trained.

**Confidence:** HIGH -- confirmed by multiple papers including recent GRPO-specific research.

---

### Pitfall 5: Reward Hacking in GRPO Persona Training

**What goes wrong:** The model learns to maximize reward signals without actually embodying the persona. It discovers shortcuts -- repeating key phrases, using specific formatting, or producing outputs that game the reward function without genuine persona-consistent behavior.

**Why it happens:** GRPO optimizes against reward functions. If the reward function measures surface-level features (keyword presence, sentiment score, response length), the model will exploit those metrics. Multi-objective rewards (persona voice + helpfulness + safety) are especially vulnerable -- the model may collapse to optimizing whichever objective has highest variance.

**Consequences:** Companion sounds like a parody of itself. Responses are technically "on brand" but hollow. Users describe it as "uncanny valley" or "trying too hard."

**Warning signs:** Reward scores climbing but human eval scores stagnating or declining. Repetitive phrases appearing across different conversation contexts. Model responses becoming longer without adding substance.

**Prevention:**
- Use MO-GRPO (Multi-Objective GRPO) with normalized advantage functions across objectives to prevent any single objective from dominating
- Include human evaluation checkpoints -- don't rely solely on automated reward
- Design reward functions that measure semantic consistency, not surface features
- Add diversity penalties to prevent mode collapse on "safe" response patterns
- Maintain a "red team" dataset of adversarial prompts that reward-hacked models fail on

**Detection:** Track reward score vs. human preference correlation. If they diverge (reward up, human preference flat), reward hacking is occurring.

**Phase:** Fine-tuning pipeline (Phase 2). Reward function design is the most important decision in the training pipeline.

**Confidence:** MEDIUM -- MO-GRPO is recent research (2025); practical application patterns still emerging.

---

## Moderate Pitfalls

---

### Pitfall 6: Installer UX Fails Non-Technical Users

**What goes wrong:** Installation requires command-line knowledge, manual dependency management, or troubleshooting steps that NFT holders (the target audience) cannot navigate. Drop-off rate at install exceeds 70%.

**Why it happens:** Developer-centric tooling. Ollama itself is easy to install, but the full stack (Ollama + model download + TTS + Tailscale + companion app) requires coordinating multiple components. Any single failure in the chain blocks the entire experience.

**Prevention:**
- Build a single-click installer that bundles everything (Electron/Tauri app with embedded Ollama)
- Download models in the background with progress indication and resume capability
- Pre-flight hardware check before downloading 18GB+ of model files
- Never expose a terminal or log output to the user unless they opt into "advanced mode"
- Implement a "setup wizard" that validates each component step by step with friendly error messages

**Phase:** Installer/packaging (Phase 1). The very first thing to build.

**Confidence:** HIGH -- universal pattern in consumer software targeting non-technical users.

---

### Pitfall 7: Model Distribution at Scale

**What goes wrong:** HuggingFace rate limits throttle downloads when many users onboard simultaneously. 18GB+ model files fail mid-download on unstable connections. CDN costs explode if self-hosting.

**Why it happens:** HuggingFace rate limits are calculated over 5-minute windows and apply per-user. Free tier storage limits apply. Large files require chunked uploads (<200GB chunks recommended, but even single-file downloads of 18GB are problematic on consumer internet). Self-hosted CDN for 18GB files serving thousands of users is expensive.

**Prevention:**
- Implement torrent-style P2P distribution (IPFS or BitTorrent) as a fallback/primary channel -- aligns with Web3 ethos of the NFT community
- Support resumable downloads with integrity verification (SHA256 checksum)
- Split model files into <5GB chunks for reliability
- Cache model files locally and only re-download on version change
- Consider a staged rollout: invite waves of 100-500 users to avoid download stampedes

**Phase:** Distribution infrastructure (Phase 3). Must be solved before public launch.

**Confidence:** MEDIUM -- HuggingFace rate limit specifics verified, but P2P distribution for GGUF models is an emerging pattern.

---

### Pitfall 8: TTS Voice Inconsistency and Latency

**What goes wrong:** Local TTS produces voice output that doesn't match the companion's personality, varies in quality between sessions, or adds noticeable latency (>500ms) that breaks conversational flow.

**Why it happens:** Small local TTS models (Piper at 82M params, Kokoro) trade quality for speed. Larger models (XTTS v2, Orpheus 3B) need GPU resources that compete with the LLM. Voice cloning quality varies with reference audio quality. On machines running both LLM and TTS on the same GPU, VRAM contention causes one or both to degrade.

**Prevention:**
- Use Piper for CPU-based TTS (low latency, decent quality, runs alongside GPU LLM without contention)
- Reserve GPU TTS (Orpheus/XTTS) only for machines with 16GB+ VRAM
- Pre-generate common phrases and greetings rather than synthesizing them live
- Implement streaming TTS (start playing audio before full response is generated) -- XTTS can achieve <200ms streaming latency
- Make TTS optional and off by default; text-first with voice as an enhancement

**Phase:** TTS integration (Phase 3-4). Not MVP-critical; text companions work fine. Voice is a differentiator, not table stakes.

**Confidence:** MEDIUM -- TTS landscape is evolving rapidly. Orpheus (late 2025) significantly changed the quality floor.

---

### Pitfall 9: Context Window Limits on Consumer Hardware

**What goes wrong:** Users have long conversations that exceed the context window. The companion "forgets" earlier parts of the conversation, breaking immersion and continuity. At higher context sizes, inference slows dramatically or crashes on limited VRAM.

**Why it happens:** Context window size directly impacts VRAM usage. A 31B model at Q4_K_M with 8192 context needs ~20GB VRAM. Most consumer GPUs have 8-12GB. Reducing to 4096 context halves memory but limits conversation to ~10-15 exchanges before truncation.

**Prevention:**
- Default to 4096 context for 8GB VRAM, 8192 for 16GB+
- Implement rolling summarization: periodically compress older conversation into a summary that stays in context
- Store full conversation history client-side; use RAG-like retrieval to pull relevant past context back in
- Be transparent with users: "I remember our recent conversation and key details from past ones"
- Never silently truncate -- always maintain a coherent context even if it means summarizing

**Phase:** Conversation engine (Phase 2-3). Core to the companion experience.

**Confidence:** HIGH -- VRAM/context tradeoffs are well-documented.

---

### Pitfall 10: Tailscale Onboarding for Non-Technical Users

**What goes wrong:** Users can't set up Tailscale for remote access to their companion. Corporate firewalls block it. Users don't understand "mesh networking" or why they need another account. Tailscale login requiring a third-party identity provider (Google, Microsoft, GitHub) confuses NFT-native users who expect wallet-based auth.

**Why it happens:** Tailscale is designed for developers and IT teams, not consumers. The concept of a "tailnet" is foreign. Firewall traversal usually works (DERP relay), but some corporate/university networks block even that. The authentication model (OAuth via identity providers) doesn't align with Web3 users who think in terms of wallet signatures.

**Prevention:**
- Make Tailscale completely invisible -- embed it in the installer, auto-configure it, never show the Tailscale UI
- Use Tailscale's `OnboardingFlow` suppression policy to hide their onboarding
- Provide a "connection status" indicator in the companion UI instead of exposing Tailscale directly
- Have a fallback for when Tailscale can't connect: local-only mode with clear messaging
- Consider alternatives: Cloudflare Tunnel, ngrok, or direct WebSocket if the companion has a web UI

**Phase:** Networking layer (Phase 3). Not needed for local-only MVP.

**Confidence:** MEDIUM -- Tailscale's consumer UX limitations are known but they are actively improving onboarding.

---

## Minor Pitfalls

---

### Pitfall 11: Prompt Injection on Tool-Using Companions

**What goes wrong:** Users (or content the companion reads) inject prompts that break persona, expose system prompts, or abuse tool-use capabilities. For a companion with any tool access (file reading, web browsing, wallet integration), this becomes a security issue, not just a UX issue.

**Prevention:**
- Sandbox all tool execution -- no direct filesystem or network access without explicit allowlisting
- Use the Dual LLM pattern: one model for conversation, a separate constrained model for tool execution
- Never put secrets (API keys, wallet keys) in model context or system prompts
- Implement output filtering for system prompt leakage
- Rate-limit tool invocations to prevent exfiltration attacks

**Phase:** Security layer (Phase 3-4). Must be in place before any tool-use features ship.

**Confidence:** HIGH -- OWASP Top 10 for LLMs ranks prompt injection #1 for 2025. Trail of Bits demonstrated prompt injection to RCE in August 2025.

---

### Pitfall 12: Persona Drift Over Extended Use

**What goes wrong:** The companion's personality gradually shifts as conversation history accumulates. System prompt influence weakens as context fills with user messages. After long conversations, the companion starts sounding generic.

**Prevention:**
- Reinject persona anchoring at regular intervals in the context (every N turns)
- Use a dedicated "persona preamble" that is never summarized away
- Monitor persona consistency metrics in production (even simple keyword/style analysis)
- Allow users to "reset" personality without losing conversation memory

**Phase:** Conversation engine (Phase 2-3).

**Confidence:** HIGH -- well-known issue with system prompt dilution in long contexts.

---

### Pitfall 13: User Expectations vs. 31B Model Reality

**What goes wrong:** Users who've used ChatGPT-4/Claude expect the same breadth of knowledge, reasoning ability, and polish from a local 31B model. When the companion can't answer complex questions or makes factual errors, users feel cheated.

**Prevention:**
- Set expectations explicitly during onboarding: "Your companion is specialized for personality and conversation, not encyclopedia knowledge"
- Lean into strengths: personality, availability, privacy, speed -- not raw intelligence
- Implement graceful degradation: when the model is uncertain, it should say so in-character rather than hallucinate
- Consider a hybrid fallback: for complex questions, optionally route to a cloud API (with user consent and clear indication)
- Frame the local model as "your private companion" vs cloud AI as "the internet's AI"

**Phase:** Onboarding and UX (Phase 1-2). Expectation setting must happen before first interaction.

**Confidence:** HIGH -- consistently reported in local LLM communities.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Installer/Onboarding | GPU detection failure, user drop-off | Hardware pre-flight check, single-click installer |
| Fine-Tuning Pipeline | Catastrophic forgetting, reward hacking | GRPO + KL regularization, multi-objective rewards, eval suite |
| Model Quantization | Quality cliff below Q4_K_M | Q4_K_M minimum floor, automated persona tests per quant |
| Runtime/Inference | Memory leaks, context limits | Session manager with periodic restarts, rolling summarization |
| Distribution | Rate limits, download failures | Resumable chunked downloads, P2P fallback, staged rollout |
| Networking (Tailscale) | Onboarding friction, firewall blocks | Embed and hide Tailscale, provide local-only fallback |
| TTS Integration | VRAM contention, voice inconsistency | CPU TTS default, GPU TTS only for 16GB+, make voice optional |
| Security | Prompt injection, tool abuse | Sandbox execution, dual LLM pattern, no secrets in context |
| User Expectations | Disappointment vs. ChatGPT | Explicit expectation setting, lean into companion strengths |

---

## Sources

- [Ollama GPU and Hardware Support](https://docs.ollama.com/gpu) -- official GPU compatibility docs
- [Ollama Memory Leak Issue #10114](https://github.com/ollama/ollama/issues/10114) -- memory not freed across models
- [Ollama Gemma3 Memory Leak #10688](https://github.com/ollama/ollama/issues/10688) -- structured output leak
- [GRPO Catastrophic Forgetting Paper](https://arxiv.org/html/2507.05386v1) -- GRPO forgetting measures
- [MO-GRPO: Mitigating Reward Hacking](https://arxiv.org/html/2509.22047) -- multi-objective GRPO
- [GSPO vs GRPO Stability](https://junkangworld.com/blog/my-2025-rlhf-fix-gspo-vs-grpo-stability-deep-dive) -- practical GRPO stability
- [GGUF Quantization Guide](https://willitrunai.com/blog/quantization-guide-gguf-explained) -- Q4/Q5/Q8 comparison
- [Quantization Benchmarks](https://www.ionio.ai/blog/llm-quantize-analysis) -- real-world quality measurements
- [OWASP LLM Top 10: Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) -- #1 LLM vulnerability 2025
- [Prompt Injection to RCE](https://blog.trailofbits.com/2025/10/22/prompt-injection-to-rce-in-ai-agents/) -- tool-use exploitation
- [HuggingFace Rate Limits](https://huggingface.co/docs/hub/rate-limits) -- download throttling docs
- [HuggingFace Storage Limits](https://huggingface.co/docs/hub/storage-limits) -- file size constraints
- [Best Open-Source TTS 2026](https://bentoml.com/blog/exploring-the-world-of-open-source-text-to-speech-models) -- TTS landscape
- [Tailscale Firewall Ports](https://tailscale.com/kb/1082/firewall-ports) -- networking requirements
- [Local LLM vs ChatGPT](https://www.xda-developers.com/youre-using-local-llm-wrong-if-youre-prompting-it-like-cloud-llm/) -- expectation management
