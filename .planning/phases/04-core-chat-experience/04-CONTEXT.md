# Phase 4: Core Chat Experience - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the conversational interface for KIN companions — streaming chat with persistent history, personality coherence, and graceful degradation. Three surfaces: desktop app (Tauri), web dashboard (localhost), and Telegram bot. The installer auto-deploys all three with zero technical friction.

Requirements covered: CHAT-01 through CHAT-05.

</domain>

<decisions>
## Implementation Decisions

### Three Chat Surfaces (All Auto-Deployed)
1. **Desktop App (Tauri)** — Built-in chat inside the installer app. Primary interface.
2. **Web Dashboard (localhost:3333)** — Browser-based, accessible from any device on the network. Secondary.
3. **Telegram Bot** — Auto-deployed with no technical friction. Named after the companion, NFT image as profile pic.

### Auto-Deployment (CRITICAL — Zero Friction)
- Installer handles ALL setup: Ollama, model, runtime server, Telegram bot, web dashboard
- Telegram bot auto-created: companion name as bot name, NFT image as profile picture
- User never touches a terminal, API key, or config file
- Everything "just works" after the 7-screen wizard

### Visual Style: Custom Immersive
- Full-bleed dark UI with kr8tiv design language
- Companion avatar animation (subtle breathing/idle animation)
- Glass card message bubbles with blur backgrounds
- Cyan/magenta accent colors matching meetyourkin.com
- Smooth typing indicator with companion personality (Cipher: tentacle animation, Forge: horn glow)
- Message transitions with micro-animations

### Code Block Rendering: Clean + Non-Scary
- Syntax highlighted with soft colors (not harsh neon-on-black)
- Expandable/collapsible code sections — collapsed by default for non-technical users
- "Copy" button clearly visible
- Language label (React, CSS, TypeScript) shown as small tag
- NO line numbers by default (intimidates non-technical users)
- For HTML/CSS output: optional "Preview" button that opens rendered result in a panel
- Artifact-style cards: code wrapped in a glass card with title, language tag, copy, and optional preview

### Personality Coherence
- Companion stays in character across entire conversation
- Personality is in the weights (fine-tuned), not just system prompt
- Even error messages are in-character: "My tentacles are tangled — give me a moment 🐙"
- Conversation history feeds back into context for personality consistency

### Conversation Persistence
- SQLite local database (WAL mode) — matches existing kr8tiv stack
- Full conversation history survives app restarts
- Rolling summarization for long sessions (>20 messages)
- User can clear history: companion acknowledges in-character

### Streaming
- <500ms time-to-first-token target
- Tokens stream word-by-word with smooth animation
- Typing indicator shows companion "thinking" with personality-specific animation

### Claude's Discretion
- Exact React component architecture for chat UI
- SQLite schema for conversation storage
- Streaming protocol (SSE vs WebSocket)
- Rolling summarization strategy
- Telegram bot token management

</decisions>

<canonical_refs>
## Canonical References

### Existing Chat Infrastructure
- `bot/handlers/` — Existing Telegram bot command handlers (Grammy)
- `bot/telegram-bot.ts` — Existing Telegram bot setup
- `api/routes/` — Existing Fastify REST API routes
- `web/src/` — Existing Next.js dashboard
- `db/schema.sql` — Existing SQLite schema
- `inference/local-llm.ts` — Existing OllamaClient
- `inference/supervisor.ts` — Existing two-brain routing

### Companion Runtime (built in Phase 1 prep)
- `companions/cipher/runtime/server.ts` — Fastify server with /api/chat
- `companions/cipher/runtime/inference.ts` — Two-brain inference client
- `companions/cipher/runtime/cli.ts` — CLI chat interface

</canonical_refs>

<specifics>
## Specific Ideas

- Telegram bot should be named "Cipher 🐙" (or whichever companion), with the Genesis NFT image as profile picture
- The web dashboard should show companion stats: messages exchanged, topics discussed, learning progress
- Desktop app should have a system tray icon — companion is always "alive" in the background
- Consider a "companion mood" indicator — changes based on conversation tone (happy when building, focused when debugging)

</specifics>

<deferred>
## Deferred Ideas

- WhatsApp integration — requires Twilio setup, defer to v2
- Discord bot — already exists in codebase but not priority for Genesis v1
- Voice chat in desktop app — defer to Phase 6 (Voice)
- Multi-companion chat (talking to two KINs at once) — defer to v2

</deferred>

---

*Phase: 04-core-chat-experience*
*Context gathered: 2026-04-12 via discuss-phase*
