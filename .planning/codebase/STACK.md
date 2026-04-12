# Technology Stack

**Analysis Date:** 2026-04-11

## Languages

**Primary:**
- TypeScript 5.7.2 - Backend API, bot handlers, inference providers, frontend (Node.js runtime)
- JavaScript/TypeScript 19.0.0 - Frontend React application (Next.js)

**Secondary:**
- Rust 2021 edition - Desktop application (Tauri 2.x menu bar app)
- Python - Health monitoring daemon (`scripts/health_monitor_daemon.py`)
- SQL - SQLite schema (`db/schema.sql`)

## Runtime

**Environment:**
- Node.js >= 20.0.0 < 24.0.0 (specified in `package.json` engines)

**Package Manager:**
- npm (primary)
- Lockfile: `package-lock.json` present

## Frameworks

**Core Backend:**
- Fastify 5.1.0 - Web server and REST API (`api/server.ts`)
  - @fastify/compress 8.3.1 - Gzip compression
  - @fastify/cors 10.0.1 - Cross-origin resource sharing
  - @fastify/helmet 12.0.1 - Security headers
  - @fastify/jwt 10.0.0 - JWT authentication
  - @fastify/multipart 9.4.0 - Multipart form handling
  - @fastify/rate-limit 10.2.1 - Rate limiting
  - @fastify/sensible 6.0.1 - Sensible defaults
  - @fastify/websocket 11.0.2 - WebSocket support

**Frontend:**
- Next.js 15.5.14 - React SSR/static generation (`web/src`)
  - React 19.0.0 - UI library
  - React DOM 19.0.0 - DOM rendering
  - Three.js 0.183.2 - 3D graphics
  - @react-three/fiber 9.5.0 - React renderer for Three.js
  - @react-three/drei 10.7.7 - Useful React Three Fiber helpers
  - Tailwind CSS 4.0.15 - Utility-first CSS
  - next-intl 4.9.0 - Internationalization

**Desktop:**
- Tauri 2.0 - Desktop menu bar app (`desktop/src-tauri/Cargo.toml`)
  - Serde 1.0 - Serialization framework (Rust)

**Chatbot/Bot Framework:**
- grammyjs (Grammy) 1.33.0 - Telegram bot framework (`bot/telegram-bot.ts`)
  - @grammyjs/auto-retry 2.0.2 - Auto-retry plugin
  - @grammyjs/conversations 2.0.1 - Conversation plugin
- discord.js 14.26.2 - Discord bot framework (`bot/discord-bot.ts`)

**Testing:**
- Vitest 2.1.8 - Unit and integration test runner
  - Config: `vitest.config.ts`
  - Test pattern: `**/*.test.ts`

**Build/Dev:**
- tsx 4.21.0 - TypeScript execution for Node.js
- TypeScript 5.7.2 - Static type checking
- ESLint 9.17.0 - Linting
- Concurrently 9.1.2 - Run multiple commands in parallel

## Key Dependencies

**Critical (Backend):**
- better-sqlite3 11.7.0 - Embedded SQL database for project data, conversations, and state
- OpenAI SDK 4.77.0 - LLM inference provider (GPT-5.4)
- Ollama 0.5.12 - Local LLM backend for inference service integration
- Replicate 1.4.0 - ML model inference platform API
- Puppeteer 24.40.0 - Headless browser for web automation
- Dockerode 4.0.10 - Docker API client (container management)
- http-proxy-3 1.23.2 - HTTP proxy for request forwarding

**Blockchain & NFT:**
- @metaplex-foundation/umi 0.9.2 - Solana program framework
- @metaplex-foundation/umi-bundle-defaults 0.9.2 - Default Solana configuration
- @metaplex-foundation/mpl-token-metadata 3.3.0 - Metaplex token metadata program
- @metaplex-foundation/mpl-toolbox 0.9.4 - Metaplex utility functions
- bs58 6.0.0 - Base58 encoding for Solana addresses

**Communication & Messaging:**
- @whiskeysockets/baileys 7.0.0-rc.9 - WhatsApp Web automation (for WhatsApp bot)
- googleapis 171.4.0 - Google APIs (Gmail, Drive, Sheets)
- adm-zip 0.5.17 - ZIP archive handling
- archiver 7.0.1 - ZIP creation

**Observability & Error Handling:**
- @sentry/node 10.48.0 - Error tracking and performance monitoring (optional, DSN-based)
- @sentry/nextjs 10.48.0 - Sentry integration for Next.js frontend
- @hapi/boom 10.0.1 - HTTP error utilities
- pino-pretty 13.1.3 - Pretty-printed logs (dev mode)

**Utilities:**
- croner 10.0.1 - Cron job scheduling
- js-cookie 3.0.5 - Browser cookie handling
- swr 2.4.1 - Stale-while-revalidate data fetching
- @serwist/next 9.5.7 - Service worker integration
- clsx 2.1.1 - Conditional CSS class composition
- framer-motion 11.18.0 - Animation library

**Analytics:**
- @vercel/analytics 1.5.0 - Vercel Analytics integration (frontend)

## Configuration

**Environment:**
Database path (SQLite): `process.env.DATABASE_PATH` defaults to `data/kin.db`

Inference settings:
- `OLLAMA_HOST` - Inference service hostname (e.g., `kin-inference.internal`)
- `OLLAMA_PORT` - Inference service port (default: 11434)

API keys (all optional, enable different features):
- `OPENAI_API_KEY` - OpenAI GPT-5.4 provider
- `GROQ_API_KEY` - Groq Qwen provider
- `XAI_API_KEY` - xAI Grok provider
- `MOONSHOT_API_KEY` - Moonshot Kimi provider
- `ZAI_API_KEY` - Z.ai GLM provider
- `GOOGLE_AI_API_KEY` - Google Gemini provider
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `DISCORD_TOKEN` - Discord bot token
- `SENTRY_DSN` - Sentry error tracking (optional)
- `SENTRY_TRACES_SAMPLE_RATE` - Sentry trace sampling (default: 0.1)
- `JWT_SECRET` - JWT signing key (required for production)
- `OWNER_TELEGRAM_ID` - Telegram ID for owner-level trust

Voice/STT:
- `WHISPER_CPP_PATH` - Path to whisper.cpp binary (for local speech-to-text)
- `WHISPER_MODEL_PATH` - Path to GGML model file for whisper.cpp
- Falls back to `OPENAI_API_KEY` for OpenAI Whisper API if local unavailable

Tailscale (remote access):
- `TAILSCALE_API_KEY` - Tailscale API authentication
- `TAILSCALE_TAILNET` - Tailnet name
- `TAILSCALE_OAUTH_CLIENT_ID` - OAuth client ID (optional)
- `TAILSCALE_OAUTH_CLIENT_SECRET` - OAuth client secret (optional)

**Build:**
- `tsconfig.json` - TypeScript compiler options (ES2022, ESNext modules)
- `web/tsconfig.json` - Next.js TypeScript config
- `web/tailwind.config.ts` - Tailwind CSS configuration
- `vitest.config.ts` - Vitest test configuration
- `.eslintrc` - ESLint configuration (assumed, extends Node.js rules)

## Platform Requirements

**Development:**
- Node.js >= 20.0.0 < 24.0.0
- npm or yarn
- SQLite 3 CLI (optional, for schema migrations)
- Python 3.x (for health monitoring daemon)
- ffmpeg (required for audio transcoding in voice handlers)
- whisper.cpp binary and GGML model (optional, for local speech-to-text)

**Production:**
- Deployment target: Fly.io (primary, `fly.toml`)
- Alternative: Railway.app (`railway.toml`)
- Docker containerization (referenced via GHCR image URIs)
- Ollama inference service (separate container/service)
- SQLite database file on persistent storage

## Database

**Type:** SQLite3 (better-sqlite3)
**Location:** `data/kin.db` (created automatically if missing)
**Mode:** WAL (Write-Ahead Logging) for concurrent access
**Schema:** `db/schema.sql` (auto-applied on first run)

Tables:
- `projects` - User projects/goals
- `conversations` - Chat history (Telegram/Discord/WhatsApp)
- `companions` - Companion instances and state
- Additional tables defined in schema.sql

---

*Stack analysis: 2026-04-11*
