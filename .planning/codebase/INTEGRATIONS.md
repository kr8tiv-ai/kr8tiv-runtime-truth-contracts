# External Integrations

**Analysis Date:** 2026-04-11

## APIs & External Services

**Inference Providers (LLM):**
- OpenAI GPT-5.4 (`inference/providers/openai.ts`)
  - SDK/Client: OpenAI 4.77.0
  - Auth: `OPENAI_API_KEY` environment variable
  - Context window: 1,050,000 tokens
  - Pricing: $2.50/1M input, $15.00/1M output

- Groq Qwen 3 32B (`inference/providers/groq.ts`) — free tier
  - SDK/Client: OpenAI-compatible provider wrapper
  - Auth: `GROQ_API_KEY` environment variable
  - Context window: 128,000 tokens
  - Pricing: $0.29/1M input, $0.59/1M output

- xAI Grok 4.20 (`inference/providers/xai.ts`)
  - SDK/Client: OpenAI-compatible provider wrapper
  - Auth: `XAI_API_KEY` environment variable
  - Context window: 2,000,000 tokens
  - Pricing: $2.00/1M input, $6.00/1M output

- Moonshot Kimi K2.5 (`inference/providers/moonshot.ts`)
  - SDK/Client: OpenAI-compatible provider wrapper
  - Auth: `MOONSHOT_API_KEY` environment variable
  - Context window: 256,000 tokens
  - Pricing: $0.60/1M input, $3.00/1M output

- Z.ai GLM-4.6 (`inference/providers/zai.ts`)
  - SDK/Client: OpenAI-compatible provider wrapper
  - Auth: `ZAI_API_KEY` environment variable
  - Context window: 200,000 tokens
  - Pricing: $0.39/1M input, $1.90/1M output

- Google Gemini 3.1 Pro (`inference/providers/google.ts`)
  - SDK/Client: googleapis 171.4.0 (custom Gemini API implementation)
  - Auth: `GOOGLE_AI_API_KEY` environment variable
  - Context window: 128,000 tokens
  - Pricing: $1.25/1M input, $5.00/1M output

- Ollama Local (`inference/providers/ollama.ts`)
  - SDK/Client: Ollama 0.5.12
  - Connection: `OLLAMA_HOST` and `OLLAMA_PORT` (default: kin-inference.internal:11434)
  - Cost: Free (self-hosted)
  - Purpose: Local model inference fallback

- Circuit Breaker (`inference/providers/circuit-breaker.ts`)
  - Pattern: Automatic failover between providers
  - Enables graceful degradation when primary providers are down

**Chat Platforms (Bot Interfaces):**
- Telegram (`bot/telegram-bot.ts`)
  - SDK: grammyjs (Grammy) 1.33.0
  - Auth: `TELEGRAM_BOT_TOKEN` environment variable
  - Webhook: `POST /api/routes/telegram-webhook.ts`
  - Features: Conversations, slash commands, message editing, inline keyboards

- Discord (`bot/discord-bot.ts`)
  - SDK: discord.js 14.26.2
  - Auth: `DISCORD_TOKEN` environment variable
  - Features: Slash commands, DM conversations, guild channels

- WhatsApp (`bot/whatsapp-bot.ts`)
  - SDK: @whiskeysockets/baileys 7.0.0-rc.9 (WhatsApp Web)
  - Features: Message receiving and sending via WhatsApp Web automation

## Data Storage

**Databases:**
- SQLite 3 (embedded)
  - Client: better-sqlite3 11.7.0
  - Connection: Local file at `data/kin.db`
  - Features: WAL mode for concurrent reads, persistent conversation/project storage
  - Schema location: `db/schema.sql`

**File Storage:**
- Local filesystem only (no cloud storage integration)
  - Temporary audio files: `tmpdir()/kin-stt-*` (cleaned up after transcription)
  - Archive creation: Uses archiver 7.0.1 for ZIP exports

**Caching:**
- In-memory session caching: Conversation memory store (`bot/memory/conversation-store.ts`)
- No distributed cache (Redis/Memcached) — single-process design

## Authentication & Identity

**Bot Auth Provider:**
- Custom implementation
  - Telegram ID-based authorization with trust ladder system (`tailscale/client.ts`)
  - Trust levels: Guest (0), Visitor (1), Member (2), Admin (3), Owner (4)
  - Owner verified via `OWNER_TELEGRAM_ID` environment variable

**API Auth:**
- JWT (JSON Web Tokens)
  - Signing key: `JWT_SECRET` environment variable
  - Implementation: @fastify/jwt 10.0.0
  - Token gate middleware: `api/middleware/token-gate.ts`

**Tailscale OAuth:**
- Optional: Device pairing and remote access flow
  - OAuth client ID/secret: `TAILSCALE_OAUTH_CLIENT_ID`, `TAILSCALE_OAUTH_CLIENT_SECRET`
  - Purpose: Easy onboarding for non-technical users to grant device access

## Monitoring & Observability

**Error Tracking:**
- Sentry
  - SDK: @sentry/node 10.48.0 (backend), @sentry/nextjs 10.48.0 (frontend)
  - DSN: `SENTRY_DSN` environment variable (optional, disabled if not set)
  - Implementation: `api/sentry.ts` (graceful no-op if module unavailable)
  - Trace sample rate: `SENTRY_TRACES_SAMPLE_RATE` (default: 0.1, i.e., 10%)

**Logs:**
- Approach: Console logging with pino-pretty for local development
- Health monitoring: Python daemon script (`scripts/health_monitor_daemon.py`)
- Health check endpoint: `GET /health` (grace period 20s, interval 30s, timeout 5s)

**Crash Reporting:**
- Sentry integration captures unhandled exceptions and performance metrics
- Optional: Disabled entirely if `SENTRY_DSN` not set

## CI/CD & Deployment

**Hosting:**
- Fly.io (primary)
  - Config: `fly.toml`
  - App name: `kin-api`
  - Primary region: `ord` (Chicago)
  - Health check: `GET /health` (grace 20s, 30s interval)
  - Min machines: 1
  - Auto-scaling: Enabled (auto-stop and auto-start)

- Railway.app (alternative)
  - Config: `railway.toml`
  - Schema: `https://railway.com/railway.schema.json`
  - Health check: `/health` (300s timeout)
  - Replicas: 1

**Container Images:**
- Prebuilt GHCR (GitHub Container Registry) — no local Docker build
  - API: `ghcr.io/kr8tiv-ai/kin-api:{TAG}`
  - Web: `ghcr.io/kr8tiv-ai/kin-web:{TAG}`
  - Inference: `ghcr.io/kr8tiv-ai/kin-inference:{TAG}`
  - Tag variable: `KIN_IMAGE_TAG` (default: `latest`, recommend sha-{7hex} for immutable rollouts)

**CI Pipeline:**
- Not detected in codebase (assumed GitHub Actions via GHCR publishing)

## Environment Configuration

**Required environment variables:**
- `JWT_SECRET` - JWT signing secret (set via platform UI, never in repo)
- `TELEGRAM_BOT_TOKEN` - Telegram bot authentication (if using Telegram bot)
- `DATABASE_PATH` - SQLite database file location (default: `data/kin.db`)

**Recommended environment variables:**
- `NODE_ENV` - `production` or `development` (default in fly.toml: `production`)
- `OPENAI_API_KEY` - Enable OpenAI GPT-5.4 inference
- `SENTRY_DSN` - Enable error tracking to Sentry
- `OWNER_TELEGRAM_ID` - Telegram ID for owner-level access (for trust ladder)
- `OLLAMA_HOST` and `OLLAMA_PORT` - Local inference service (for Fly deployments)

**Optional environment variables:**
- `GROQ_API_KEY` - Enable Groq provider
- `XAI_API_KEY` - Enable xAI provider
- `MOONSHOT_API_KEY` - Enable Moonshot provider
- `ZAI_API_KEY` - Enable Z.ai provider
- `GOOGLE_AI_API_KEY` - Enable Google Gemini provider
- `DISCORD_TOKEN` - Enable Discord bot
- `WHISPER_CPP_PATH` - Path to whisper.cpp binary
- `WHISPER_MODEL_PATH` - Path to GGML speech-to-text model
- `TAILSCALE_API_KEY` - Enable Tailscale remote access
- `TAILSCALE_TAILNET` - Tailnet name
- `SENTRY_TRACES_SAMPLE_RATE` - Sentry trace sampling rate (default: 0.1)

**Secrets location:**
- Fly.io: Platform secrets via `fly secrets set KEY=value` command
- Railway: Service Variables UI
- Local development: `.env` file (not committed)

## Webhooks & Callbacks

**Incoming Webhooks:**
- Telegram: `POST /api/routes/telegram-webhook.ts`
  - Format: Telegram Bot API updates (JSON)
  - Authentication: Bot token validation via grammyjs

**Outgoing Webhooks:**
- None detected in codebase

## Blockchain & NFT

**Solana Integration:**
- Network: Solana mainnet-beta (configurable)
- SDK: @metaplex-foundation/umi 0.9.2, @metaplex-foundation/umi-bundle-defaults 0.9.2
- RPC endpoint: Configuration in `web/src/lib/solana/constants.ts`
- Candy Machine: Metaplex Candy Machine v3 for NFT minting
- NFT metadata: Stored on Arweave via Irys

- Key files:
  - `solana/index.ts` - Module exports
  - `web/src/lib/solana/` - Frontend Solana integration
    - `umi.ts` - Umi client setup
    - `candy-machine.ts` - Candy Machine minting
    - `das.ts` - Digital Asset Standard queries
    - `arweave.ts` - Arweave metadata storage

**NFT Metadata Storage:**
- Arweave (permanent storage)
  - Gateway: Configurable in `constants.ts`
  - Irys Gateway: For redundancy

- Companion NFTs:
  - Minting: Direct mint or via Candy Machine
  - Models: 3D Gltf models (CC0 3D Anvil source)

## Google APIs

**Services Used:**
- Gmail API (googleapis 171.4.0)
  - Auth: OAuth 2.0 (requires user consent)
  - Implementation: `inference/gmail-manager.ts`
  - Purpose: Access user emails for context/memory

- Google Drive API
  - Auth: OAuth 2.0
  - Purpose: File access and storage

- Google Sheets API
  - Auth: OAuth 2.0
  - Purpose: Data export and integration

- Google Generative Language API (Gemini)
  - Auth: API key (`GOOGLE_AI_API_KEY`)
  - Model: Gemini 3.1 Pro

## Third-Party Media & ML Services

**Image Generation:**
- Replicate (ML model inference)
  - SDK: replicate 1.4.0
  - Auth: API token (environment variable)
  - Purpose: Image generation via models like Stable Diffusion, FLUX

**Web Automation:**
- Puppeteer 24.40.0
  - Purpose: Headless browser for web scraping, screenshot capture, PDF generation
  - Used by: Website pipeline (`website/pipeline.ts`)

**Container Management:**
- Docker (via Dockerode 4.0.10)
  - Purpose: Run isolated code execution environments
  - SDK: dockerode 4.0.10
  - Used by: Sandbox/runtime execution (`runtime/sandbox.ts`)

## Voice & Speech

**Speech-to-Text (STT):**
- Local: whisper.cpp binary + GGML models
  - Config: `WHISPER_CPP_PATH`, `WHISPER_MODEL_PATH`
  - Models: Hugging Face ggerganov/whisper.cpp (base, small, tiny variants)
  - Cost: Free (self-hosted)
  - Fallback: OpenAI Whisper API

- Cloud fallback: OpenAI Whisper API
  - Auth: `OPENAI_API_KEY`
  - Cost: $0.02 per minute
  - Implementation: `voice/local-stt.ts`

**Audio Format Handling:**
- Input: OGG/Opus (Telegram format)
- Processing: ffmpeg conversion to 16kHz mono WAV
- Pipeline: OGG → ffmpeg → WAV → whisper.cpp/OpenAI → text

## Remote Access & Device Management

**Tailscale Integration:**
- VPN/networking solution for secure device access
- Client: `tailscale/client.ts`
- Features:
  - Device pairing flow
  - Remote session management
  - Trust ladder enforcement (5 levels)
  - Easy onboarding for non-technical users
  - DNS management
  - ACL (Access Control List) configuration

- Auth methods:
  - API key: `TAILSCALE_API_KEY`
  - OAuth: Optional client ID/secret for user authentication

---

*Integration audit: 2026-04-11*
