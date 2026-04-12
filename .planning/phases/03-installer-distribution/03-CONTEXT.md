# Phase 3: Installer & Distribution - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning
**Source:** Synthesized from research + user decisions

<domain>
## Phase Boundary

Build a one-click installer (.exe Windows, .dmg macOS) using Tauri v2 that installs Ollama + downloads the companion GGUF model + runs first-run setup wizard. Genesis NFT holders verify ownership via Solana wallet signature. Hardware pre-flight detects GPU/VRAM/RAM/disk. Model downloads on first run (not bundled in installer).

Requirements covered: INST-01 through INST-07.

</domain>

<decisions>
## Implementation Decisions

### Installer Framework: Tauri v2 (NOT Electron)
- Tauri v2 produces ~150MB installer vs Electron's ~250MB+
- 96% smaller bundle — critical when users also download 18GB model
- Native sidecar support for bundling Ollama binary
- Generates NSIS (.exe) for Windows, DMG for macOS natively
- Frontend: React + Tailwind (matches kr8tiv stack)

### Model Download Strategy: First-Run Download
- Installer is thin (~150MB) — contains Tauri shell + Ollama binary + companion runtime
- On first launch, downloads GGUF from HuggingFace (resumable, checksummed)
- Progress bar with estimated time remaining
- User picks quality tier: Q4_K_M (18GB, GPU) or Q5_K_M (22GB, premium)
- Ollama's native pull mechanism handles resumable downloads

### Hardware Pre-Flight
- Detect GPU vendor (NVIDIA/AMD/Intel/Apple Silicon)
- Check VRAM (warn if <8GB, recommend Q4_K_M vs Q5_K_M)
- Check system RAM (warn if <16GB)
- Check disk space (need ~25GB free for model + runtime)
- Silent GPU fallback detection — if Ollama uses CPU, WARN the user prominently
- Show clear hardware report before model download

### NFT Genesis Verification — Dual UX (CRITICAL)
- **TWO paths** — one for crypto-native, one for complete beginners:
  - **Path A (Crypto-native):** Connect Phantom/Solflare → sign message → auto-verify Genesis NFT → done
  - **Path B (Beginner — "I don't know what Solana is"):** Guided key generation → securely explain they MUST save their seed phrase → automated wallet creation → NFT is associated → all other steps automated. Clear, non-scary language. No jargon.
- Both paths end at the same verified state (cached JWT, 30-day offline grace)
- The installer detects which NFT bloodline the user owns → only allows downloading THAT companion's model
- If user owns multiple Genesis NFTs, show all their companions as available

### Visual Style: Dark Premium (meetyourkin.com)
- Deep blacks, cyan/magenta gradient accents, glass morphism effects
- kr8tiv branding throughout
- Companion 3D model or animation visible during install
- Smooth transitions between wizard screens
- Premium feel — this is a $200+ product, it should feel like it

### First-Run Wizard Flow (Full 7-Screen Experience)
1. **Welcome** — Companion animation + personality intro + "Meet your KIN" moment
2. **Hardware Check** — Auto-detect GPU/VRAM/RAM/disk, celebrate good hardware ("Your RTX 4090 is going to LOVE this")
3. **Wallet Setup** — Dual path: "I have a Solana wallet" vs "Set me up from scratch"
4. **NFT Verification** — Check which Genesis NFTs user owns → show available companions
5. **Model Download** — Quality picker (Q4_K_M vs Q5_K_M) + animated progress ("Your companion is waking up...")
6. **Personality Quiz** — Calibrate teaching depth, critique tolerance, voice preferences
7. **Companion Activated** — First message from companion in-character, referencing quiz answers

### Platform Support
- **Windows (.exe)** AND **macOS (.dmg)** shipping simultaneously
- Both built from same Tauri v2 codebase
- Tauri generates NSIS installer for Windows, DMG for macOS natively

### Companion Selection: NFT-Gated
- Users can ONLY install companions they own the Genesis NFT for
- The installer checks on-chain which bloodline NFTs the wallet holds
- Each companion is a separate model download (~18-22GB)
- If user owns multiple, they can install multiple companions

### Auto-Update Mechanism
- Check kr8tiv API for model updates on launch
- LoRA adapter hot-swap: download small adapter (~500MB) instead of full 18GB model
- Ollama supports loading adapters on top of base models
- Version tracked in local config, compared against remote manifest

### Claude's Discretion
- Exact Tauri v2 project structure and build configuration
- Sidecar binary packaging details
- UI component library choice (shadcn/ui, Radix, custom)
- Deep-link protocol for wallet connection
- Crash reporting and analytics integration

</decisions>

<canonical_refs>
## Canonical References

### Research (from project init)
- `.planning/research/STACK.md` — Confirmed Tauri v2, Ollama sidecar pattern
- `.planning/research/ARCHITECTURE.md` — Thin installer + first-run download architecture
- `.planning/research/PITFALLS.md` — GPU fallback detection critical, Q3 unusable

### Existing Infrastructure
- `companions/cipher/Modelfile` — Ollama model definition template
- `companions/cipher/scripts/setup.ps1` — Windows setup script (reference for installer logic)
- `companions/cipher/scripts/setup.sh` — Mac/Linux setup script
- `companions/cipher/docker/docker-compose.yml` — Docker deployment (alternative to installer)

### Solana Integration
- `solana/` directory — Existing Solana/Metaplex integration code

</canonical_refs>

<specifics>
## Specific Ideas

- Use Tauri's sidecar feature to bundle Ollama binary — no separate install step
- The installer should feel premium — dark theme, smooth animations, kr8tiv branding
- Hardware check should celebrate good hardware ("Your RTX 4090 is going to LOVE this")
- Wallet connection should use Phantom's deeplink protocol for mobile-friendly auth
- Model download progress should show the companion "waking up" with animated progress
- First message from companion should reference the personality quiz answers

</specifics>

<deferred>
## Deferred Ideas

- Linux AppImage/Flatpak installer — defer to v2 (Genesis holders likely on Mac/Windows)
- Custom voice cloning during onboarding — defer to Phase 6 (Voice)
- Multi-companion selection (choose your KIN) — defer until all 6 trained
- P2P/BitTorrent model distribution — defer to v2

</deferred>

---

*Phase: 03-installer-distribution*
*Context gathered: 2026-04-12 via auto-synthesis*
