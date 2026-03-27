<div align="center">

# PinkBrain

### Your AI. Your Rules. Your Hardware.

**A local-first AI companion platform with persistent memory, voice cloning, and on-chain identity.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Solana](https://img.shields.io/badge/Solana-NFT-9945FF?style=flat-square&logo=solana&logoColor=white)](https://solana.com/)
[![License](https://img.shields.io/badge/License-MIT-F472B6?style=flat-square)](LICENSE)

[Quick Start](#quick-start) | [Architecture](#architecture) | [The Genesis Six](#the-genesis-six) | [API](#api-endpoints) | [Contributing](#contributing)

</div>

---

## What is PinkBrain?

PinkBrain is an open-source platform for building AI companions that actually belong to you. Not a chatbot wrapper. Not another API proxy. A full runtime for persistent, voice-enabled AI entities that run on your hardware first, escalate to the cloud only when needed, and carry their identity on-chain.

Every companion has a **two-brain architecture**: a fast local LLM handles everyday conversation while a frontier cloud model (OpenAI, Anthropic) steps in for complex reasoning -- with a strict privacy contract governing what leaves your machine.

### Why this exists

Most AI products are rented. You talk to a model behind an API, and when the company changes terms, raises prices, or shuts down, your "relationship" disappears. PinkBrain flips that:

- **You own the runtime.** It runs on your box. Your data stays local by default.
- **You own the identity.** Each companion is an NFT on Solana -- transferable, provable, yours.
- **You own the voice.** Local voice cloning (XTTS v2) means your companion sounds unique, and audio never leaves your network.
- **You own the memory.** SQLite conversation store with full export. No vendor lock-in.

---

## Quick Start

```bash
git clone https://github.com/kr8tiv-ai/PinkBrain-lp.git
cd PinkBrain-lp

npm install

cp .env.example .env
# Add your TELEGRAM_BOT_TOKEN and JWT_SECRET at minimum

mkdir -p data && npm run db:migrate

npm run dev
```

That starts the Fastify API server and Telegram bot concurrently. Talk to your companion immediately.

### Environment

| Variable | Required | What it does |
|----------|----------|--------------|
| `TELEGRAM_BOT_TOKEN` | Yes | From [@BotFather](https://t.me/botfather) |
| `JWT_SECRET` | Yes | Signs auth tokens |
| `OPENAI_API_KEY` | Recommended | Cloud fallback LLM + Whisper STT |
| `OLLAMA_HOST` | Optional | Local LLM endpoint (default: `127.0.0.1`) |
| `ELEVENLABS_API_KEY` | Optional | Cloud voice synthesis |
| `TAILSCALE_API_KEY` | Optional | Remote access mesh |

---

## Architecture

```
                        +-----------------------+
                        |     User Surfaces     |
                        |  Telegram | Web | Voice|
                        +----------+------------+
                                   |
                        +----------v------------+
                        |      API Server       |
                        |  Fastify + JWT + WS   |
                        +--+--------+--------+--+
                           |        |        |
               +-----------+   +----+----+   +-----------+
               |               |         |               |
        +------v------+  +----v----+  +--v-----------+  +--------+
        |  Two-Brain  |  | Memory  |  |    Voice     |  | Solana |
        |  Inference   |  | SQLite  |  |   Pipeline   |  |  NFT   |
        |             |  |         |  |              |  |        |
        | Local (Ollama)| | Conv.  |  | Whisper STT  |  | Mint   |
        | + Supervisor |  | Store  |  | XTTS v2 TTS  |  | Xfer   |
        +-------------+  +---------+  | Piper fallback| +--------+
                                       +--------------+
```

### The Two-Brain Model

Every companion runs a **dual-inference loop**:

1. **Local Brain** (Ollama) -- Handles conversation, personality, casual tasks. Fast. Private. Always on.
2. **Supervisor Brain** (OpenAI/Anthropic) -- Activated for architecture decisions, complex code, deep analysis. Governed by escalation rules per companion.

The supervisor never sees raw audio, file paths, or database contents. Every cloud call is logged with timestamp and payload size. You can run fully local by setting `forceLocal: true`.

---

## The Genesis Six

Six companion bloodlines, each with a distinct personality, voice, and specialization:

| Companion | Species | Domain | Personality |
|-----------|---------|--------|-------------|
| **Cipher** | Code Kraken | Web design, frontend | Playful, sharp, design-obsessed |
| **Mischief** | Glitch Pup | Family companion, branding | Curious, energetic, loyal |
| **Vortex** | Teal Dragon | Marketing, social media | Wise, strategic, calm |
| **Forge** | Cyber Unicorn | Development, debugging | Confident, inspiring, precise |
| **Aether** | Frost Ape | Creative writing, art | Patient, methodical, deep |
| **Catalyst** | Cosmic Blob | Wealth coaching, habits | Enthusiastic, adaptive, supportive |

Each companion has:
- A full personality definition (speech patterns, quirks, teaching style)
- Independent escalation thresholds (Cipher escalates on "architecture" and "design system"; Forge escalates on "deploy" and "security")
- Voice profile configuration for local TTS
- Switchable mid-conversation via `/switch` in Telegram

---

## Key Features

### Implemented

- **Companion conversation loop** -- Grammy-based Telegram bot with session memory and personality switching
- **Two-brain inference** -- Local Ollama + cloud supervisor with privacy-preserving escalation
- **Local voice pipeline** -- Whisper.cpp STT, XTTS v2 voice cloning, Piper TTS fallback
- **Production API** -- Fastify with JWT auth, WebSocket, CORS, rate limiting
- **Persistent memory** -- SQLite conversation store with per-user, per-companion history
- **Solana NFT scaffold** -- Metadata schemas, mint/transfer structures, devnet config
- **Health monitoring** -- Python daemon with auto-restart and liveness/readiness probes
- **Skills system** -- Plugin architecture for calculator, weather, web search, reminders
- **Tailscale integration** -- 5-level trust ladder for remote machine access
- **Website builder** -- AI code generation with quality validation pipeline
- **Docker support** -- Multi-stage Dockerfile + compose for production deployment

### On the Roadmap

- Solana mainnet deployment (Anchor program)
- ElevenLabs cloud voice integration
- Mission Control web dashboard
- Multi-companion group conversations

---

## API Endpoints

### Health
```
GET  /health/live     Liveness probe
GET  /health/ready    Readiness probe
GET  /health/status   Full system status
```

### Auth & Identity
```
POST /auth/telegram   Telegram login widget auth
GET  /kin             List user's companions
POST /kin/claim       Claim a companion
GET  /kin/:id         Companion status
```

### Conversations
```
GET  /conversations   History
POST /conversations   Send message
```

### NFT
```
GET  /nft             User's NFTs
POST /nft/mint        Mint companion NFT
POST /nft/transfer    Transfer ownership
```

### Support
```
GET  /features        Feature requests
POST /features        Submit request
POST /tickets         Support ticket
```

---

## Project Structure

```
PinkBrain-lp/
  api/                   Fastify API server + route handlers
  bot/                   Telegram bot (Grammy) + command handlers + skills
  companions/            Personality definitions for all 6 companions
  config/                Runtime configs (health, Solana, subscriptions, tiers)
  db/                    SQLite schema
  inference/             Two-brain inference engine (Ollama + cloud supervisor)
  runtime/               Core runtime: sandbox, health probes, mission control
  schemas/               JSON schemas for website specialist + validation
  scripts/               Health daemon, startup scripts
  solana/                NFT minting and transfer
  tailscale/             Remote access client + trust ladder
  tests/                 Integration + unit tests (Vitest + Python)
  voice/                 Voice pipeline (STT + TTS + profiles)
  website/               Website generation + quality pipeline
```

---

## Development

```bash
npm run dev              # API + bot concurrent
npm run dev:api          # API server only
npm run dev:bot          # Telegram bot only
npm run build            # TypeScript compile
npm run test             # Vitest
npm run typecheck        # Type check
npm run db:migrate       # Init database
npm run health:check     # One-shot health probe
```

---

## Trust Ladder

5-level permission system for remote machine access via Tailscale:

| Level | Role | Access | TTL |
|-------|------|--------|-----|
| 0 | Guest | Status only | 5 min |
| 1 | Visitor | View logs | 15 min |
| 2 | Member | Readonly shell, SSH view | 1 hr |
| 3 | Admin | Full access, device mgmt | 8 hr |
| 4 | Owner | Unrestricted | None |

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Runtime | Node.js 20+, TypeScript 5.7 |
| Bot | Grammy (Telegram) |
| API | Fastify + JWT + WebSocket |
| Database | SQLite (better-sqlite3) |
| Local LLM | Ollama (llama3.2 default) |
| Cloud LLM | OpenAI, Anthropic |
| Voice | Whisper.cpp, XTTS v2, Piper, ElevenLabs |
| Blockchain | Solana (Anchor) |
| Mesh VPN | Tailscale |
| Testing | Vitest + Python integration tests |
| Deploy | Docker + Docker Compose |

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-thing`)
3. Commit your changes
4. Push and open a PR

We're building in public. Ideas, PRs, and feedback are all welcome.

---

## License

MIT -- see [LICENSE](LICENSE) for details.

---

<div align="center">

**PinkBrain** -- AI companions that belong to you.

Built by [kr8tiv.ai](https://github.com/kr8tiv-ai)

</div>
