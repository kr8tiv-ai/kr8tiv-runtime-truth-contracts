# Roadmap: KIN Local Companions

## Overview

Ship Cipher as the flagship locally-runnable AI companion for KIN Genesis holders. The roadmap follows the critical path: train the model on Colab -> export to GGUF -> wrap in a one-click installer -> build the chat experience -> add routing, voice, Cipher-specific tools, networking, memory, and observability. Each phase delivers a verifiable capability. Cipher proves the entire pipeline before the remaining 5 companions (v2).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Cipher Training Pipeline** - Fine-tune Gemma 4 31B on Colab Pro+ A100 with 4-stage pipeline and budget tracking
- [ ] **Phase 2: Model Export & Quantization** - Export trained weights to GGUF, generate Modelfiles, publish to HuggingFace
- [ ] **Phase 3: Installer & Distribution** - Tauri v2 one-click installer with hardware detection and NFT verification
- [ ] **Phase 4: Core Chat Experience** - Streaming local chat with in-character personality, session persistence, and context management
- [ ] **Phase 5: Two-Brain Router** - Local-first inference with governed frontier escalation via PinkBrain Router
- [ ] **Phase 6: Voice** - Local Kokoro TTS and cloud ElevenLabs with per-companion voice identity
- [ ] **Phase 7: Cipher Flagship Tools** - The Kraken Sees render loop, axe-core accessibility, and Socratic teaching mode
- [ ] **Phase 8: Tailscale Networking** - Guided mesh setup connecting user devices to kr8tiv services
- [ ] **Phase 9: Memory & Intelligence** - Local persistence, cloud sync, privacy boundaries, and preference learning
- [ ] **Phase 10: Observability** - Health dashboard, Ollama leak mitigation, heartbeat monitoring, telemetry

## Phase Details

### Phase 1: Cipher Training Pipeline
**Goal**: Cipher's Gemma 4 31B weights are fine-tuned through all 4 stages with verified personality adherence, on budget
**Depends on**: Nothing (first phase)
**Requirements**: TRAIN-01, TRAIN-02, TRAIN-03, TRAIN-04, TRAIN-05, TRAIN-06, TRAIN-07
**Success Criteria** (what must be TRUE):
  1. Cipher model completes SFT on 8K+ examples and produces coherent Code Kraken responses
  2. SimPO stage produces preference-aligned outputs that favor clean, accessible code over verbose alternatives
  3. GRPO rewards score positively on axe-core accessibility, aesthetics, executability, and format adherence
  4. Persona classifier confirms >90% personality adherence on held-out evaluation set
  5. Compute budget tracker shows units consumed per stage and total remains under $100 ceiling
**Plans**: TBD

### Phase 2: Model Export & Quantization
**Goal**: Trained Cipher weights are converted to deployable GGUF artifacts with Ollama-ready Modelfiles and published for download
**Depends on**: Phase 1
**Requirements**: QUANT-01, QUANT-02, QUANT-03, QUANT-04, QUANT-05
**Success Criteria** (what must be TRUE):
  1. Q4_K_M GGUF (~18GB) loads in Ollama and produces in-character Cipher responses
  2. Q5_K_M GGUF (~22GB) loads in Ollama with measurably better quality than Q4 on evaluation prompts
  3. Ollama Modelfile includes correct Gemma 4 stop tokens, Cipher system prompt, and tuned inference parameters
  4. Models are downloadable from kr8tiv HuggingFace org with SHA256 checksums and resumable downloads
**Plans**: TBD

### Phase 3: Installer & Distribution
**Goal**: Genesis holders can download and run a single file that installs everything needed for their local companion with zero terminal interaction
**Depends on**: Phase 2
**Requirements**: INST-01, INST-02, INST-03, INST-04, INST-05, INST-06, INST-07
**Success Criteria** (what must be TRUE):
  1. User double-clicks .exe (Windows) or .dmg (Mac) and reaches a working companion without opening a terminal
  2. Installer is under 150MB (Tauri v2 shell) and downloads the model on first run with progress indication
  3. Hardware pre-flight warns user if GPU/VRAM/RAM/disk is insufficient before downloading 18GB model
  4. GPU fallback detection alerts user if Ollama silently fell back to CPU inference
  5. NFT Genesis ownership is verified via Solana wallet signature with 30-day offline grace period
  6. First-run wizard walks user through model download, personality quiz, and companion activation
**Plans**: TBD
**UI hint**: yes

### Phase 4: Core Chat Experience
**Goal**: Users can have natural, persistent conversations with Cipher running locally on their machine
**Depends on**: Phase 3
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05
**Success Criteria** (what must be TRUE):
  1. User sends a message and sees streaming tokens appear within 500ms (time-to-first-token)
  2. Cipher stays in Code Kraken character across an entire multi-turn conversation without personality drift
  3. User can close the app and reopen it with full conversation history intact
  4. Long conversations are managed via rolling summarization without losing critical context
  5. If Ollama is unavailable, user sees a clear error message delivered in Cipher's voice, not a generic crash
**Plans**: TBD
**UI hint**: yes

### Phase 5: Two-Brain Router
**Goal**: Most queries stay local (fast, free, private) while complex queries seamlessly escalate to frontier models with user awareness
**Depends on**: Phase 4
**Requirements**: ROUTE-01, ROUTE-02, ROUTE-03, ROUTE-04, ROUTE-05
**Success Criteria** (what must be TRUE):
  1. 80%+ of typical user queries are answered by the local Cipher model without frontier escalation
  2. Complex queries (multi-file architecture, deep reasoning) route to GPT-5.4 via OpenRouter and return superior answers
  3. User is notified in-character when escalation happens ("This needs deeper thinking -- bringing in the big brain.")
  4. Privacy contract strips file paths, DB contents, and sensitive data before any frontier send
  5. Token holders access frontier escalation at zero cost via PinkBrain Router credits
**Plans**: TBD

### Phase 6: Voice
**Goal**: Each companion speaks with a distinct, recognizable voice -- locally for privacy, cloud for premium quality
**Depends on**: Phase 4
**Requirements**: VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05
**Success Criteria** (what must be TRUE):
  1. Cipher speaks responses aloud using Kokoro TTS (82M params) running entirely on CPU with no cloud dependency
  2. User can switch to ElevenLabs cloud TTS for higher quality when online
  3. Voice toggle in UI offers three modes: text-only, local voice, premium voice
  4. Each companion bloodline has a distinct voice identity via KokoClone with 30-60s reference audio
  5. Streaming TTS delivers audio with under 1 second latency for natural conversational flow
**Plans**: 3 plans
Plans:
- [ ] 06-01-PLAN.md -- Kokoro TTS engine with KokoClone voice embeddings per companion
- [ ] 06-02-PLAN.md -- Streaming TTS with sentence chunking, crossfade, and WebSocket/SSE endpoints
- [ ] 06-03-PLAN.md -- Voice mode toggle (text-only/local/premium) and smart response matching
**UI hint**: yes

### Phase 7: Cipher Flagship Tools
**Goal**: Cipher can generate code, render it, visually critique it, and iterate -- the full "Kraken Sees" loop that no generic model can match
**Depends on**: Phase 4, Phase 5
**Requirements**: CIPHER-01, CIPHER-02, CIPHER-03, CIPHER-04, CIPHER-05, CIPHER-06
**Success Criteria** (what must be TRUE):
  1. Cipher generates frontend code, Playwright renders it, screenshots it, and Cipher self-critiques the visual output
  2. axe-core WCAG 2.1 AA audit runs on every render with zero critical accessibility violations as the target
  3. Renders are captured at three viewports: desktop (1920x1080), mobile (375x667), tablet (768x1024)
  4. Cipher delivers design critique in character ("Now THIS is clean. Chef's kiss on that contrast ratio.")
  5. Cipher can execute file operations, terminal commands, git, npm, and browser automation via tool-use
  6. Socratic teaching mode asks guiding questions instead of dumping code when user is learning
**Plans**: TBD
**UI hint**: yes

### Phase 8: Tailscale Networking
**Goal**: User's companion is reachable from all their devices and connected to kr8tiv cloud services via secure mesh
**Depends on**: Phase 3
**Requirements**: TAIL-01, TAIL-02, TAIL-03, TAIL-04
**Success Criteria** (what must be TRUE):
  1. Companion walks user through Tailscale installation and authentication in plain language
  2. User can access their companion from phone, tablet, or other PCs on the same tailnet
  3. Companion connects to Mission Control, Supermemory, and model update services through kr8tiv service tunnel
  4. Companion is discoverable at a human-readable MagicDNS address (e.g., cipher.kin.local)
**Plans**: TBD

### Phase 9: Memory & Intelligence
**Goal**: Companion remembers user preferences and conversation context across sessions while enforcing strict privacy boundaries
**Depends on**: Phase 4
**Requirements**: MEM-01, MEM-02, MEM-03, MEM-04
**Success Criteria** (what must be TRUE):
  1. Conversation history and user preferences persist in local SQLite across app restarts
  2. User can opt into Supermemory cloud sync for cross-device memory access
  3. Companion never retains credentials, personal life details, or financial information -- boundary is enforced programmatically
  4. Companion learns user's design style, framework preferences, explanation depth, and critique tolerance over time
**Plans**: TBD

### Phase 10: Observability
**Goal**: Users and operators can see system health at a glance, and known infrastructure issues (Ollama leaks) are mitigated automatically
**Depends on**: Phase 4, Phase 5, Phase 8
**Requirements**: OBS-01, OBS-02, OBS-03, OBS-04
**Success Criteria** (what must be TRUE):
  1. Health dashboard in companion UI shows local brain status, frontier availability, memory status, and render loop status
  2. Ollama session manager periodically restarts Ollama to mitigate confirmed memory leaks without interrupting active conversations
  3. Heartbeat monitoring detects degradation and notifies user in-character (not with generic system alerts)
  4. Opt-in telemetry exports companion health and usage data to Mission Control for governance and prompt evolution
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5/6 (parallel) -> 7 -> 8 -> 9 -> 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Cipher Training Pipeline | 0/TBD | Not started | - |
| 2. Model Export & Quantization | 0/TBD | Not started | - |
| 3. Installer & Distribution | 0/TBD | Not started | - |
| 4. Core Chat Experience | 0/TBD | Not started | - |
| 5. Two-Brain Router | 0/TBD | Not started | - |
| 6. Voice | 0/3 | Planned | - |
| 7. Cipher Flagship Tools | 0/TBD | Not started | - |
| 8. Tailscale Networking | 0/TBD | Not started | - |
| 9. Memory & Intelligence | 0/TBD | Not started | - |
| 10. Observability | 0/TBD | Not started | - |

## Milestone Summary

### v1.0 -- Cipher Local Companion (Phases 1-10)

**Goal:** Ship Cipher as a fully functional local AI companion for 60 Genesis holders.

**Critical Path:** Train (1) -> Export (2) -> Installer (3) -> Chat (4) -> Router (5) -> Flagship Tools (7) -> Observability (10)

**Parallel Tracks after Phase 4:**
- Voice (6) and Tailscale (8) can proceed independently once chat works
- Memory (9) can proceed once chat persistence is validated
- Router (5) must complete before Flagship Tools (7) since render loop uses frontier escalation

**Budget:** $100 Colab Pro+ (A100 40GB) -- 1100 compute units with 34% headroom

**Hardware Floor:**
- GPU users: Q4_K_M (~18GB GGUF) with 4-8GB VRAM
- Premium users: Q5_K_M (~22GB GGUF) with 12GB+ VRAM

**Distribution:** HuggingFace -> One-click installer -> Tailscale mesh -> kr8tiv services

**What Ships:**
- Fine-tuned Cipher model (Gemma 4 31B, 4-stage trained)
- Two GGUF variants (Q4_K_M + Q5_K_M)
- Native installer (Windows .exe, macOS .dmg)
- Local chat with streaming, persistence, context management
- Two-brain routing (local + frontier)
- Voice output (local Kokoro + cloud ElevenLabs)
- The Kraken Sees render loop with accessibility auditing
- Tailscale mesh networking
- Memory with privacy boundaries
- Health monitoring and leak mitigation

### v2.0 -- The Full Pack (Post-v1)

**Goal:** Train and ship the remaining 5 companions (Forge, Vortex, Mischief, Aether, Catalyst) using the proven pipeline.

**Scope:** COMP-01 through COMP-05, LEARN-01 through LEARN-03, ADV-01 through ADV-04

**Prerequisite:** v1.0 Cipher validates the full pipeline end-to-end.

---
*Roadmap created: 2026-04-11*
*Last updated: 2026-04-12*
