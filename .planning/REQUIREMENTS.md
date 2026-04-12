# Requirements: KIN Local Companions

**Defined:** 2026-04-12
**Core Value:** Genesis holders get AI companions that feel alive — specialized local models with personality, voice, and domain mastery that generic ChatGPT/Claude can't match.

## v1 Requirements

### Training Pipeline

- [ ] **TRAIN-01**: Cipher fine-tuned on Gemma 4 31B via Colab Pro+ A100 using 4-stage pipeline (SFT → SimPO → GRPO → KTO)
- [ ] **TRAIN-02**: SFT stage trains on 8K+ examples (persona, frontend tutorials, tool-use, design critique, safety)
- [ ] **TRAIN-03**: SimPO preference pairs enforce beautiful/accessible code over ugly alternatives with length normalization
- [ ] **TRAIN-04**: GRPO reward function combines accessibility (axe-core), aesthetics, executability, and format adherence
- [ ] **TRAIN-05**: Persona classifier verifies >90% personality adherence after training (no catastrophic forgetting)
- [ ] **TRAIN-06**: Compute budget tracker logs units per stage, prevents overruns across all 6 companions
- [ ] **TRAIN-07**: Training data generators produce companion-specific SFT, SimPO, and GRPO datasets from templates + frontier distillation

### Model Export & Quantization

- [ ] **QUANT-01**: GGUF export at Q4_K_M (~18GB) as default — minimum quality floor for persona models
- [ ] **QUANT-02**: GGUF export at Q5_K_M (~22GB) as premium variant for 12GB+ VRAM users
- [ ] **QUANT-03**: Ollama Modelfile generated per companion with Gemma 4 stop tokens, personality system prompt, and tuned parameters
- [ ] **QUANT-04**: Models published to kr8tiv HuggingFace org (kr8tiv/kin-{companion}-GGUF)
- [ ] **QUANT-05**: Model download is resumable and verifiable (SHA256 checksum)

### Installer & Distribution

- [ ] **INST-01**: One-click installer (.exe Windows, .dmg macOS) — zero terminal knowledge required
- [ ] **INST-02**: Installer built with Tauri v2 (not Electron) — <150MB thin shell, model downloads on first run
- [ ] **INST-03**: Hardware pre-flight check on install: detects GPU, VRAM, RAM, disk space — warns if insufficient
- [ ] **INST-04**: Silent GPU fallback detection — warns user if Ollama is using CPU instead of GPU
- [ ] **INST-05**: NFT Genesis ownership verification via Solana wallet signature (cached JWT, 30-day offline grace)
- [ ] **INST-06**: First-run wizard guides user through: model download → personality quiz → companion activation
- [ ] **INST-07**: Auto-update mechanism for model improvements (LoRA adapter hot-swap without full re-download)

### Core Chat Experience

- [ ] **CHAT-01**: Streaming text responses from local Ollama with <500ms time-to-first-token
- [ ] **CHAT-02**: Companion stays in character across entire conversation (personality baked into weights, not just system prompt)
- [ ] **CHAT-03**: Conversation history persists across sessions (local SQLite)
- [ ] **CHAT-04**: Context window managed intelligently — rolling summarization for long sessions
- [ ] **CHAT-05**: Graceful degradation when Ollama unavailable — clear error message in character

### Two-Brain Router

- [ ] **ROUTE-01**: 80%+ of queries handled locally (fast, free, private)
- [ ] **ROUTE-02**: Complex queries escalate to frontier supervisor (GPT-5.4 for Cipher) via OpenRouter
- [ ] **ROUTE-03**: Escalation narrated to user: "This needs deeper thinking — bringing in the big brain."
- [ ] **ROUTE-04**: Privacy contract enforced: conversation trimmed before frontier send, no file paths or DB contents
- [ ] **ROUTE-05**: Frontier escalation works via PinkBrain Router credits for token holders (zero cost)

### Voice

- [ ] **VOICE-01**: Local TTS via Kokoro (82M params, CPU-friendly) with distinct voice per companion
- [ ] **VOICE-02**: Cloud TTS via ElevenLabs for premium quality when online
- [ ] **VOICE-03**: Voice toggle: text-only / local voice / premium voice
- [ ] **VOICE-04**: Voice cloning per bloodline via KokoClone (30-60s reference audio per companion)
- [ ] **VOICE-05**: Streaming TTS with <1s latency for natural conversation feel

### Cipher-Specific (Flagship)

- [ ] **CIPHER-01**: "The Kraken Sees" render loop — generates code → Playwright renders → screenshots → self-critiques → iterates
- [ ] **CIPHER-02**: axe-core WCAG 2.1 AA audit integrated into render loop — zero critical violations target
- [ ] **CIPHER-03**: Multi-viewport rendering (desktop 1920x1080, mobile 375x667, tablet 768x1024)
- [ ] **CIPHER-04**: Design critique in Cipher's voice: "Now THIS is clean. Chef's kiss on that contrast ratio. 🐙"
- [ ] **CIPHER-05**: Tool-use: file operations, terminal commands, git, npm, browser automation
- [ ] **CIPHER-06**: Socratic teaching mode — asks questions that build understanding, never just dumps code

### Tailscale Networking

- [ ] **TAIL-01**: Guided Tailscale setup — companion walks user through install + auth
- [ ] **TAIL-02**: Device mesh: access companion from phone/tablet/other PCs on same tailnet
- [ ] **TAIL-03**: kr8tiv service tunnel: connect to Mission Control, Supermemory, model updates
- [ ] **TAIL-04**: MagicDNS for companion discovery (e.g., cipher.kin.local)

### Memory & Intelligence

- [ ] **MEM-01**: Local SQLite for session persistence (conversation history, user preferences)
- [ ] **MEM-02**: Supermemory cloud sync (opt-in) for cross-device memory persistence
- [ ] **MEM-03**: Personal memory boundary enforced — never retains credentials, personal life details, financial info
- [ ] **MEM-04**: User preference learning — design style, framework preferences, explanation depth, critique tolerance

### Observability

- [ ] **OBS-01**: Health dashboard in companion UI showing: local brain status, frontier availability, memory status, render loop status
- [ ] **OBS-02**: Ollama session manager with periodic restart to mitigate confirmed memory leaks
- [ ] **OBS-03**: Heartbeat monitoring per HEARTBEAT.md contract — graceful degradation with in-character notifications
- [ ] **OBS-04**: Telemetry export to Mission Control (opt-in) for prompt evolution and governance

## v2 Requirements

### Remaining Companions

- **COMP-01**: Forge (Cyber Unicorn) — code review, debugging, architecture
- **COMP-02**: Vortex (Teal Dragon) — content strategy, brand voice, analytics
- **COMP-03**: Mischief (Glitch Pup) — family companion, personal branding
- **COMP-04**: Aether (Frost Ape) — creative writing, storytelling, prose editing
- **COMP-05**: Catalyst (Cosmic Blob) — wealth coaching, habits, life optimization

### Continuous Learning

- **LEARN-01**: KTO binary feedback collection (thumbs up/down on responses)
- **LEARN-02**: Periodic model retraining from accumulated feedback
- **LEARN-03**: A/B testing between model versions

### Advanced Features

- **ADV-01**: P2P model distribution (BitTorrent/IPFS) for large GGUF files
- **ADV-02**: Multi-companion conversations (Cipher + Forge pair programming)
- **ADV-03**: Companion-to-companion communication via Tailscale mesh
- **ADV-04**: Physical plush toys with embedded memory (Q4 2026 roadmap)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Q3 quantization variant | Research confirms 5x perplexity degradation — destroys persona coherence |
| Full mobile app | Deferred — Tailscale + web dashboard sufficient for v1 |
| Custom voice cloning from user audio | Complex, privacy concerns — use pre-built Kokoro voices |
| Browser extension | Focus on native installer + Telegram |
| Multi-user shared instances | 1 companion per Genesis holder for v1 |
| Real-time video/screen sharing | Text + screenshots only |
| Training on user data in v1 | KTO collection only — defer retraining to v2 |
| Electron installer | Tauri v2 is 96% smaller — critical when users download 18GB models |
| Cloud-only deployment | Core value is local-first privacy |
| Model marketplace | Anti-feature — dilutes companion identity |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TRAIN-01 through TRAIN-07 | Phase 1 | Pending |
| QUANT-01 through QUANT-05 | Phase 2 | Pending |
| INST-01 through INST-07 | Phase 3 | Pending |
| CHAT-01 through CHAT-05 | Phase 4 | Pending |
| ROUTE-01 through ROUTE-05 | Phase 5 | Pending |
| VOICE-01 through VOICE-05 | Phase 6 | Pending |
| CIPHER-01 through CIPHER-06 | Phase 7 | Pending |
| TAIL-01 through TAIL-04 | Phase 8 | Pending |
| MEM-01 through MEM-04 | Phase 9 | Pending |
| OBS-01 through OBS-04 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 47 total
- Mapped to phases: 47
- Unmapped: 0

---
*Requirements defined: 2026-04-12*
*Last updated: 2026-04-12 after research synthesis*
