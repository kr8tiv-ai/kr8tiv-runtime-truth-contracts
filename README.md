# KIN — We Build You A Friend

> AI companions powered by frontier models. Each KIN has its own brain, persistent memory, voice, and personality — owned as an NFT on Solana.

[![Bags Hackathon 2026](https://img.shields.io/badge/🏆_Bags_Hackathon-2026-FF00AA?style=for-the-badge)](https://bags.fm/hackathon)
[![Built on Bags](https://img.shields.io/badge/Built%20on-Bags.fm-FF00AA?style=for-the-badge)](https://bags.fm)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript)](https://typescriptlang.org)
[![Solana](https://img.shields.io/badge/Solana-NFTs-9945FF?style=for-the-badge&logo=solana)](https://solana.com)
[![License](https://img.shields.io/badge/License-MIT-00F0FF?style=for-the-badge)](LICENSE)

---

> **Bags Hackathon Q1 2026** — KIN is a verified entry in [The Bags Hackathon](https://bags.fm/hackathon) competing for the **AI Agents** and **Fee Sharing** tracks. Categories: AI Agents, Bags API, Fee Sharing.

---

## What is KIN?

KIN is a consumer AI companion platform where users adopt, chat with, and grow alongside personalized AI friends. Each companion is a **unique NFT** with its own **frontier AI brain**, persistent intelligent memory, voice capabilities, and accruing skills that transfer with NFT sales. No crypto knowledge needed — just pick a friend and start talking.

When you mint a KIN, you're not just getting a character — you're getting a dedicated frontier model from a top AI provider that learns and grows with you. The free tier runs on Groq Qwen 3 32B. Frontier models feed training data to companion-specific local models over time, making each KIN genuinely unique.

**Skills are RPG-style** — your companion gains XP and levels up over time. When you sell your KIN NFT on a Solana marketplace, all accrued skills transfer with it (private memories stay with you). Skill states are hashed to SHA-256 for on-chain integrity verification.

### Bags.fm Integration

KIN integrates deeply with the Bags ecosystem:
- **Companion NFTs** on Solana via Candy Machine v3 — verified on-chain ownership
- **Bags token support** — companion ownership and token-gated features
- **Fee-sharing revenue** — platform fees distributed through Bags
- **Bags API** — companion verification and ecosystem integration
- **Skills marketplace** — custom skills from GitHub repos ($4.99 review fee via Stripe)

## Live Demo

- **Web App**: [meetyourkin.com](https://meetyourkin.com)
- **Telegram Bot**: [@KinCompanionBot](https://t.me/KinCompanionBot)
- **Discord Bot**: Invite link (coming soon)
- **WhatsApp**: QR code pairing (coming soon)
- **NFT Mint**: [KIN by KR8TIV](https://github.com/kr8tiv-io/Kinbykr8tiv-website)

## Frontier Model Stack

Each Genesis KIN companion is powered by a different frontier AI model, making every companion genuinely unique:

| Companion | Provider | Model | Context | Strength | Cost/1M in |
|-----------|----------|-------|---------|----------|-----------|
| **Cipher** (Code Kraken) | OpenAI | GPT-5.4 | 1.05M | Code generation, web design | $2.50 |
| **Mischief** (Glitch Pup) | Google | Gemini 3.1 Pro | 128K | Creative multimodal | ~$1.25 |
| **Vortex** (Teal Dragon) | Anthropic | Claude Opus 4.6 | 1M | Deep strategy & analysis | $5.00 |
| **Forge** (Cyber Unicorn) | xAI | Grok 4.20 | 2M | Architecture (huge context) | $2.00 |
| **Aether** (Frost Ape) | Moonshot | Kimi K2.5 | 256K | Creative writing & agents | $0.60 |
| **Catalyst** (Cosmic Blob) | Z.ai | GLM-4.6 | 200K | Cost-efficient daily coaching | $0.39 |
| **Free tier** | Groq | Qwen 3 32B | 128K | General chat (free, 500K tok/day) | FREE |

**The two-brain architecture**: Each companion has a local Ollama model (private, fast) and a frontier supervisor (the companion's assigned model). The frontier model handles complex tasks and feeds training data back to the local model, creating a personalized AI that improves over time.

## Features

### Consumer Experience
- **6 unique AI companions** — each powered by a different frontier model
- **Supermemory intelligent context** — fact extraction, knowledge graphs, temporal reasoning (powered by [Supermemory.ai](https://supermemory.ai))
- **Multi-platform** — Web, Telegram, Discord, WhatsApp
- **Voice chat** — microphone input in web dashboard + voice notes across platforms, per-companion ElevenLabs voices
- **5-step onboarding wizard** — choose companion, set preferences, teach your AI, start chatting
- **Gamification** — XP, levels, badges, streaks (persisted to SQLite), and a referral leaderboard
- **NFT companion ownership** — each Genesis KIN is a Solana NFT; mint to unlock the frontier brain
- **Skills marketplace** — browse, toggle, and install skills per companion; submit custom skills from GitHub
- **RPG-style skill accrual** — companions gain XP, level up, and carry skills across NFT transfers
- **AI support chatbot** — FAQ search + Groq-powered inference + escalation to human support
- **System health dashboard** — heartbeat monitoring, service status, auto-recovery

### Technical
- **Unified provider interface** — 7 AI providers behind one `FrontierProvider` contract (OpenAI, Anthropic, Google, xAI, Moonshot, Z.ai, Groq)
- **Real SSE token streaming** — native streaming from Groq/OpenAI/Anthropic APIs with buffered fallback
- **Fastify JSON Schema validation** — all POST endpoints validated with JSON Schema, per-route rate limiting
- **OpenAPI 3.1 specification** — full API documentation at `api/openapi.json`
- **OpenAI-compatible base** — shared `OpenAICompatProvider` class for xAI, Moonshot, Z.ai, and Groq
- **Provider registry** — auto-discovery of configured providers on startup
- **Supermemory.ai integration** — intelligent per-companion memory with graceful SQLite fallback
- **Interaction trajectory persistence** — structured logging for training data collection and user profiling
- **3D model viewer** — Three.js/React Three Fiber with GLB + Arweave/Irys resolution and 2D fallback
- **Multi-platform bots** — Telegram (Grammy), Discord (discord.js v14), WhatsApp (Baileys)
- **Full web dashboard** — 25+ pages, 70+ components, glass-morphism dark UI with real-time chat
- **Candy Machine NFT minting** — Stripe checkout + server-side mint via Metaplex CM v3
- **Auto-wallet generation** — Ed25519 keypair via Web Crypto API, AES-GCM encryption
- **Mint rate limiting** — per-user and per-IP limits to prevent abuse
- **NFT skill portability** — SHA-256 hashed skill snapshots for IPFS/on-chain anchoring
- **Heartbeat protocol** — outbound-only (local → VPS), works behind NAT, 90s timeout detection
- **Watchdog + auto-recovery** — process monitoring, state machine (healthy → degraded → recovering)
- **Multi-tier pricing** — Free, Genesis Mint ($9.99 one-time), Pro ($19.99/mo), Enterprise ($49.99/mo)
- **Security** — jailbreak detection, PII redaction, input sanitization, JSON Schema validation, per-route rate limiting, personality validation
- **Integration tests** — 17 Vitest tests covering auth, chat, skills, heartbeat, rate limiting, GDPR export

### Bags.fm Integration
- Companion ownership verified on-chain via DAS queries
- NFT minting through Candy Machine v3 (Stripe payment + auto-mint)
- Token-gated premium features (frontier brain unlocked on mint)
- Skills transfer with NFT — RPG-style companions carry abilities across sales
- Fee-sharing revenue model
- Bags token integration for companion marketplace

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript 5.7, Tailwind CSS 4 |
| 3D | Three.js, React Three Fiber, Drei |
| Animation | Framer Motion |
| Backend | Fastify, Node.js 20+ |
| Bots | Grammy (Telegram), discord.js v14 (Discord), Baileys (WhatsApp) |
| AI — Frontier | OpenAI GPT-5.4, Anthropic Claude Opus 4.6, Google Gemini 3.1 Pro, xAI Grok 4.20, Moonshot Kimi K2.5, Z.ai GLM-4.6 |
| AI — Free Tier | Groq (Qwen 3 32B, 500K tokens/day free) |
| AI — Local | Ollama (private, fast, training target) |
| Memory | [Supermemory.ai](https://supermemory.ai) (intelligent context) + SQLite (fallback) |
| Voice | ElevenLabs TTS (6 voices), OpenAI Whisper STT, whisper.cpp (local), XTTS v2 / Piper (local TTS) |
| Database | SQLite (better-sqlite3) — conversations, memories, progress, trajectory, NFT ownership |
| Auth | Telegram Login Widget + JWT |
| NFT Minting | Metaplex Candy Machine v3, Umi, Arweave/Irys, [3D Anvil (CC0)](https://github.com/ToxSam/3d-anvil) |
| Blockchain | Solana (devnet/mainnet), Phantom Wallet, DAS (Digital Asset Standard) |
| Payments | Stripe (subscriptions + one-time NFT mint payments, no SDK — raw fetch) |
| Analytics | PostHog, Vercel Analytics |
| Hosting | Vercel (free tier) |

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         KIN Platform                              │
├───────────┬───────────┬───────────┬───────────┬─────────────────┤
│  Web App  │ Telegram  │  Discord  │ WhatsApp  │  Bags.fm / NFT  │
│ (Next.js) │ (Grammy)  │(discord.js│ (Baileys) │ (Candy Machine) │
├───────────┴───────────┴───────────┴───────────┴─────────────────┤
│                     Fastify API Server                            │
├───────────┬───────────┬───────────┬───────────┬─────────────────┤
│   Auth    │   Chat    │  Memory   │ Companion │   Trajectory    │
│  (JWT)    │(2-brain)  │(Supermem) │ (6 NFTs)  │   (logging)     │
├───────────┼───────────┼───────────┼───────────┼─────────────────┤
│  Ollama   │ Frontier  │ Groq      │  Stripe   │  Solana RPC     │
│ (local)   │ (6 models)│ (free)    │(payments) │ (Metaplex/DAS)  │
├───────────┴───────────┴───────────┴───────────┴─────────────────┤
│         SQLite + Supermemory.ai + Solana + Arweave/Irys          │
└──────────────────────────────────────────────────────────────────┘

Companion → Model Routing:
  Free user  → Groq Qwen 3 32B (free tier waterfall)
  NFT owner  → Companion-specific frontier model
  Fallback   → Groq → Anthropic → OpenAI (graceful degradation)
```

## Quick Start

```bash
# Clone the repository
git clone https://github.com/kr8tiv-ai/kr8tiv-runtime-truth-contracts.git
cd kr8tiv-runtime-truth-contracts

# Install dependencies
npm install          # API + bots + inference
cd web && npm install  # Next.js frontend

# Configure environment
cp .env.example .env
# Edit .env with your API keys (see below)

# Start development
npm run dev           # API (port 3000) + Telegram bot
cd web && npm run dev  # Frontend (port 3001)

# Run tests
npm test              # 17 integration tests via Vitest
npx tsx scripts/smoke.ts  # Quick smoke test (7 endpoint checks)
```

### Minimum Environment Variables

```env
# Required
TELEGRAM_BOT_TOKEN=your_bot_token       # From @BotFather
JWT_SECRET=your_random_secret           # Any secure string

# Free AI (pick one)
GROQ_API_KEY=                           # Free at console.groq.com (500K tokens/day)

# Frontier Models (one per companion — set the ones you want)
OPENAI_API_KEY=                         # GPT-5.4 for Cipher
ANTHROPIC_API_KEY=                      # Claude Opus 4.6 for Vortex
GOOGLE_AI_API_KEY=                      # Gemini 3.1 Pro for Mischief
XAI_API_KEY=                            # Grok 4.20 for Forge
MOONSHOT_API_KEY=                       # Kimi K2.5 for Aether
ZAI_API_KEY=                            # GLM-4.6 for Catalyst

# Intelligent Memory
SUPERMEMORY_API_KEY=                    # supermemory.ai (falls back to SQLite)

# Optional
NEXT_PUBLIC_API_URL=http://localhost:3000
ELEVENLABS_API_KEY=                     # For voice features
STRIPE_SECRET_KEY=                      # For payments (graceful without it)
SOLANA_ADMIN_KEYPAIR=                   # For NFT minting (falls back to mock)
DISCORD_BOT_TOKEN=                      # For Discord bot
DISCORD_CLIENT_ID=                      # For Discord bot
WHATSAPP_AUTH_DIR=./data/whatsapp-auth  # For WhatsApp bot
```

## Project Structure

```
├── web/                    # Next.js 15 web app (25+ pages, 70+ components)
│   ├── src/app/            # App Router pages (dashboard, chat, skills, health, billing)
│   ├── src/components/     # UI, landing, dashboard, onboard, 3D, auth, support widget
│   ├── src/hooks/          # 14 custom React hooks (useChat, useSkills, useHealth, etc.)
│   ├── src/lib/            # API client, types, constants, wallet, analytics, Solana
│   └── src/providers/      # Auth, Toast providers
├── api/                    # Fastify API server (50+ endpoints, JSON Schema validated)
│   ├── routes/             # chat, billing, nft, skills, heartbeat, support-chat, etc.
│   ├── middleware/         # rate-limit (mint + per-route protection)
│   ├── lib/                # solana-mint, middleware
│   └── openapi.json        # OpenAPI 3.1 specification
├── bot/                    # Multi-platform bots
│   ├── telegram-bot.ts     # Telegram (Grammy)
│   ├── discord-bot.ts      # Discord (discord.js v14)
│   ├── whatsapp-bot.ts     # WhatsApp (Baileys)
│   ├── handlers/           # start, help, companions, voice, image, document, progress
│   ├── memory/             # SQLite conversation store with memories
│   ├── skills/             # Extensible skill router + companion abilities + DB loader
│   └── utils/              # sanitize, rate-limit, language detection, jailbreak detection
├── inference/              # Two-brain AI architecture
│   ├── supervisor.ts       # Local ↔ frontier routing with tier-based escalation
│   ├── fallback-handler.ts # Groq → Anthropic → OpenAI waterfall + real SSE streaming
│   ├── companion-prompts.ts# Per-companion prompt builder
│   ├── trajectory.ts       # Interaction logging for training & analytics
│   ├── providers/          # Unified frontier model interface (7 providers)
│   └── memory/             # Supermemory.ai client with SQLite fallback
├── runtime/                # Platform reliability
│   ├── heartbeat-client.ts # Local KIN agent (sends heartbeats to VPS)
│   ├── watchdog.ts         # Bot process monitor with auto-restart
│   └── recovery.ts         # Snapshot/restore for corrupted state
├── voice/                  # Voice processing pipeline
│   ├── pipeline.ts         # Whisper STT + ElevenLabs/OpenAI/local TTS
│   └── local-tts.ts        # XTTS v2 + Piper local synthesis
├── tests/                  # Vitest integration tests (17 tests)
├── scripts/                # Smoke test, health monitor, startup
├── companions/             # Companion personality definitions + config
├── db/                     # SQLite schema (20+ tables, FAQ seeds)
└── packages/               # Shared packages (mission-control, node-runtime)
```

## Companion Archetypes

Each companion is a unique NFT with a dedicated frontier AI brain:

| Companion | Species | Frontier Brain | Specialization | Ability | Voice |
|-----------|---------|---------------|---------------|---------|-------|
| **Cipher** | Code Kraken | OpenAI GPT-5.4 | Code & Web Design | Frontend generation | Adam (deep, analytical) |
| **Mischief** | Glitch Pup | Google Gemini 3.1 Pro | Creative & Social | Brand building | Bella (playful, energetic) |
| **Vortex** | Teal Dragon | Anthropic Claude Opus 4.6 | Strategy & Analytics | Data analysis | Arnold (authoritative) |
| **Forge** | Cyber Unicorn | xAI Grok 4.20 | Building & Making | Architecture review | Antoni (confident) |
| **Aether** | Frost Ape | Moonshot Kimi K2.5 | Philosophy & Writing | Creative writing | Elli (contemplative) |
| **Catalyst** | Cosmic Blob | Z.ai GLM-4.6 | Motivation & Growth | Habit coaching | Rachel (warm, motivational) |

## Pricing

| Tier | Price | Companions | AI Brain | Memory |
|------|-------|-----------|----------|--------|
| **Free** | $0 | 1 | Qwen 3 32B (Groq) | SQLite |
| **Genesis Mint** | $9.99 one-time | 1 (NFT) | Frontier model | Supermemory |
| **Pro** | $19.99/mo | 3 | Frontier models | Supermemory |
| **Enterprise** | $49.99/mo | All 6 | Frontier models | Supermemory |

## Roadmap

### Done (Hackathon Submission)
- [x] 25+ page Next.js web app with glass-morphism dark UI
- [x] 6 companion archetypes with unique personalities and prompts
- [x] 7 AI providers (OpenAI, Anthropic, Google, xAI, Moonshot, Z.ai, Groq)
- [x] Unified provider interface with OpenAI-compatible base class
- [x] Tier-based routing (free → Groq, NFT/Pro → frontier model)
- [x] **Real SSE token streaming** from Groq/OpenAI/Anthropic with buffered fallback
- [x] **Fastify JSON Schema validation** on all POST endpoints
- [x] **Per-route rate limiting** (30/min chat, 10/min auth, 20/min support, 5/min skill requests)
- [x] **OpenAPI 3.1 specification** (35 endpoints documented)
- [x] **17 Vitest integration tests** + smoke test script
- [x] Supermemory.ai intelligent memory with SQLite fallback
- [x] Interaction trajectory logging for training data collection
- [x] Telegram bot with voice, image, and document support
- [x] Discord bot (slash commands, DM conversations, guild mentions)
- [x] WhatsApp bot (text chat, voice notes, auto-reconnect)
- [x] **Skills marketplace** — browse, toggle, install, GitHub submission pipeline ($4.99 Stripe)
- [x] **RPG-style skill accrual** — XP curves, leveling, per-companion tracking
- [x] **NFT skill portability** — skills transfer with NFT, SHA-256 snapshots, IPFS-ready
- [x] **AI support chatbot** — FAQ search + Groq inference + escalation to Slack/Telegram
- [x] **Heartbeat protocol** — local KIN → VPS, 30s interval, behind-NAT compatible
- [x] **Health dashboard** — service status, CPU/mem/disk, auto-recovery
- [x] **Watchdog** — process monitor with state machine (healthy → degraded → recovering)
- [x] **Recovery manager** — snapshots, integrity checks, data-preserving restore
- [x] Mint rate limiting (per-user, per-IP, daily value cap)
- [x] 5-step onboarding wizard with memory seeding
- [x] Dashboard with gamification (XP, badges, levels)
- [x] Web chat with markdown, typewriter, reactions, voice input
- [x] Groq-powered free AI chat (Qwen 3 32B, 500K tokens/day)
- [x] Two-brain supervisor with PII redaction and graceful fallback
- [x] Candy Machine v3 NFT minting (Stripe + server-side mint)
- [x] Auto-wallet generation + Phantom wallet support
- [x] Per-companion ElevenLabs voice IDs
- [x] Jailbreak detection, PII redaction, input sanitization, personality validation
- [x] PostHog analytics with identity tracking
- [x] Bags.fm ecosystem integration

### Next
- [ ] Vercel production deployment
- [ ] GLB 3D model creation via Tripo3D.ai
- [ ] IPFS pinning for skill snapshots (Arweave/Irys)
- [ ] On-chain skill state anchoring (Solana program)
- [ ] Custom companion fine-tuning (DPO training on trajectory data)
- [ ] Helius RPC paid tier for production DAS queries

### Future
- [ ] Multi-language support
- [ ] Companion marketplace (trade leveled-up NFTs)
- [ ] Team/enterprise companion sharing
- [ ] Mobile app (React Native)
- [ ] Voice-first interaction mode
- [ ] Plugin system for companion abilities

## Testing

```bash
# Integration tests (17 tests, no external services needed)
npm test

# Smoke test (quick API health check)
npx tsx scripts/smoke.ts

# Type checking
npm run typecheck
```

Tests cover: server creation, auth flows, JWT verification, chat validation, skills catalog, heartbeat UPSERT, support chat, FAQ endpoints, GDPR export, rate limiting (429), and provider status.

## API Documentation

Full OpenAPI 3.1 specification: [`api/openapi.json`](api/openapi.json)

**50+ endpoints** across 8 groups: Auth, Chat, Skills, Companions, Health, Recovery, Support, Billing.

All POST endpoints validated with JSON Schema. Per-route rate limiting on sensitive endpoints.

## KR8TIV Ecosystem

KIN is part of the [KR8TIV-AI](https://github.com/kr8tiv-ai) ecosystem:

| Project | Purpose |
|---------|---------|
| **kr8tiv-runtime-truth-contracts** | KIN core platform (this repo) |
| **PinkBrain-lp** | Auto-compounding liquidity engine for Bags.fm |
| **PinkBrain-Router** | Bags.fm App Store — DeFi fees → OpenRouter AI credits |
| **kr8tiv-mission-control** | Multi-agent orchestration |
| **team-setup-and-organization** | DevOps infrastructure |
| **kr8tiv-team-execution-resilience** | Agent recovery framework |

## Team

**Matt Haynes** — Builder, [@lucidbloks](https://twitter.com/lucidbloks)

Built with KR8TIV AI — *We Build You A Friend*

## Credits

- **NFT minting infrastructure** adapted from [3D Anvil](https://github.com/ToxSam/3d-anvil) (CC0 Public Domain) — Candy Machine mint, Arweave/Irys upload, and DAS query utilities. Credit to [ToxSam](https://github.com/ToxSam) for the open-source Solana NFT launchpad.
- **Interaction trajectory logging** concept inspired by [milady-ai/milady](https://github.com/milady-ai/milady). All code is original.

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>🏆 <a href="https://bags.fm/hackathon">Bags Hackathon Q1 2026</a></strong> | Built on <a href="https://bags.fm">Bags.fm</a><br/>
  Categories: <strong>AI Agents</strong> · <strong>Fee Sharing</strong> · <strong>Bags API</strong>
</p>
