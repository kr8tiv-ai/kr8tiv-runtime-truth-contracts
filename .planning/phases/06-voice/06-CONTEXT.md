# Phase 6: Voice - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Add voice interaction to KIN companions — local TTS (Kokoro) + cloud TTS (ElevenLabs) with unique, high-quality voices per companion. Each bloodline sounds completely different.

Requirements covered: VOICE-01 through VOICE-05.

</domain>

<decisions>
## Implementation Decisions

### Voice Quality: Unique AND High-Quality (Both Required)
- Each companion MUST have a completely distinct voice:
  - **Cipher** — Playful, slightly lower register, quick when excited, occasional bloops
  - **Forge** — Warm gentle tenor, patient pace, brightens when explaining
  - **Vortex** — Confident authoritative baritone, measured when strategizing
  - **Mischief** — Warm energetic mid-range, quick when excited, happy yips
  - **Aether** — Deep resonant baritone, slow thoughtful pace, mountain echo quality
  - **Catalyst** — Warm shifting quality, adapts pace, calming centering presence
- Quality must be premium — not robotic, not uncanny valley

### Dual TTS Architecture
- **Local (Kokoro 82M):** CPU-friendly, <1s latency, runs offline. Default.
- **Cloud (ElevenLabs):** Premium quality when online. Optional upgrade.
- **Toggle:** User picks text-only / local voice / premium voice in settings

### Voice Cloning Per Bloodline
- Use KokoClone with 30-60s reference audio per companion
- Record reference audio that captures each companion's unique vocal qualities
- Generate embeddings for instant voice switching
- Store embeddings locally — no cloud dependency for local TTS

### Streaming TTS
- <1s latency target for natural conversation feel
- Stream audio as it generates — don't wait for full response
- Smooth crossfade between chunks to avoid choppy audio

### Voice Activation: All Three Options
- **Push-to-talk** — Click and hold mic button. Default for desktop app.
- **Wake word** — "Hey Cipher" (or companion name). Requires always-on mic permission.
- **Toggle mode** — Click once to enter voice mode, all speech routed. Good for extended sessions.
- User picks preferred method in settings. Push-to-talk is the default.

### Response Mode: Smart Matching
- If user SPOKE → companion speaks back (TTS) + shows text
- If user TYPED → companion shows text only (no TTS)
- Seamless switching mid-conversation
- User can override: click speaker icon on any text message to hear it

### Voice Assignment: Auto Per Companion
- Each companion has a fixed voice that matches their personality
- No user choice needed — the voice IS the companion
- Voices pre-configured with Kokoro embeddings during setup

### Claude's Discretion
- Exact Kokoro model configuration per companion
- Audio streaming protocol (WebAudio API vs native audio)
- Reference audio creation process
- ElevenLabs voice ID mapping
- Wake word detection library (Picovoice vs browser API)
- Audio caching strategy

</decisions>

<canonical_refs>
## Canonical References

- `.planning/research/STACK.md` — Confirmed Kokoro TTS (82M params, MOS 4.2, CPU-friendly)
- `voice/` directory — Existing voice infrastructure in kr8tiv codebase
- Each companion's `soul/AGENTS.md` — Voice identity descriptions

</canonical_refs>

---
*Phase: 06-voice | Context: 2026-04-12*
