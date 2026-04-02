# AGENTS.md — KIN Runtime Truth Contracts

## Project Overview

KIN is an AI companion platform with 6 companion archetypes (Cipher, Mischief, Vortex, Forge, Aether, Catalyst), each powered by a different frontier AI model. The platform uses a two-brain architecture: a local Ollama model for fast/private responses and frontier models for complex queries. The supervisor routes between them based on privacy settings and query complexity.

## Architecture

```
api/              → Fastify REST API server (port 3002)
  routes/         → Route plugins (JWT-protected, camelCase responses)
  server.ts       → Server factory, plugin registration, WebSocket chat
web/              → Next.js 15 dashboard (port 3001)
  src/app/        → App Router pages
  src/components/ → React components (GlassCard, Button, Badge, etc.)
  src/hooks/      → Data-fetching hooks (useApi pattern)
  src/lib/        → API client (kinApi singleton), types, utils
inference/        → Two-brain routing, companion prompts, training data
  supervisor.ts   → Privacy-aware routing (forceLocal when private)
  training-data.ts → Per-companion JSONL collection
  local-llm.ts    → OllamaClient for local inference
companions/       → Companion configs and personality markdown
  config.ts       → CompanionConfig with model/escalation settings
db/schema.sql     → SQLite schema (single file, WAL mode)
bot/              → Telegram/Discord/WhatsApp bot handlers
tests/            → Vitest test files
scripts/          → Utility scripts (smoke.ts)
data/             → Runtime data (training JSONL, SQLite DB)
```

## Build & Test Commands

```bash
# API server (Fastify + better-sqlite3)
npx tsx api/server.ts                    # Start API on port 3002

# Web dashboard (Next.js 15)
npm run dev --prefix web                 # Dev server on port 3001
npm run build --prefix web               # Production build (30 static pages)

# Tests (Vitest)
npx vitest run tests/<file>.test.ts      # Run specific test file
npx vitest run                           # Run all tests

# Smoke tests (7 critical API endpoints, in-memory SQLite)
npx tsx scripts/smoke.ts

# TypeScript check
npx tsc --noEmit
```

## Port Configuration

- Web dev server: **port 3001**
- API server: **port 3002**
- `web/.env.local` sets `NEXT_PUBLIC_API_URL=http://localhost:3002`
- Next.js rewrites in `web/next.config.ts` proxy `/api/*` from 3001 → 3002

## Code Conventions

- **API responses use camelCase** keys (e.g., `companionId`, `createdAt`), not snake_case
- **DB columns use snake_case** (e.g., `companion_id`, `created_at`)
- **Fastify route plugins** follow the `FastifyPluginAsync` pattern — see `api/routes/preferences.ts` for a clean example
- **Frontend hooks** use the `useApi<T>(path)` pattern from `web/src/hooks/useApi.ts`
- **API client** is the `kinApi` singleton from `web/src/lib/api.ts` — never construct raw `fetch()` calls
- **UI components** use the GlassCard/Button/Badge/Skeleton component library in `web/src/components/ui/`
- **Auth** uses JWT via `@fastify/jwt` — dev environment uses `POST /auth/dev-login` for test tokens
- **Design system** is dark-premium with cyan/magenta/gold accent colors — see `web/src/lib/design-tokens.ts`
- All pages use `'use client'` directive and framer-motion for page animations
- TypeScript interfaces for API responses live in `web/src/lib/types.ts`

## Known Gotchas

- **K001**: `better-sqlite3` has no prebuilt binaries for Windows Node v24. Use Linux/WSL Node v20 or run `npm rebuild better-sqlite3` after switching platforms. Use `--prefix web` for npm commands targeting the web/ directory.
- **K002**: Next.js 15 requires `useSearchParams` inside a `<Suspense>` boundary for static generation. Missing boundaries produce cryptic build errors.
- **K003**: Auth uses `POST /auth/dev-login` for dev/test JWTs. Do NOT add middleware that auto-injects users — it breaks auth testing.
- **K004**: Optional packages (discord.js, baileys, etc.) have `declare module` stubs in `types/ambient.d.ts`. Remove stubs if you install the real package.
- **K005**: API responses are always camelCase. Tests must expect camelCase keys.
- **K006**: See Port Configuration above.
- **K008**: `/dev/null/impossible/path` does NOT fail on Windows. Use `vi.spyOn(fs.promises, ...)` mocks for filesystem error tests.

## Testing Patterns

- Tests use **Vitest** with `vi.mock()` / `vi.spyOn()` for mocking
- API route tests use **Fastify's `inject()` pattern** with in-memory SQLite — no running server needed
- Frontend builds are verified with `npm run build --prefix web` — TypeScript compilation + static page generation
- Smoke tests (`scripts/smoke.ts`) validate 7 critical endpoints

## Privacy & Training Data

- Privacy mode: `'private'` (default) or `'shared'` — stored in `user_preferences.privacy_mode`
- When private: supervisor sets `forceLocal=true`, no frontier calls, no training data written
- Training data: per-companion JSONL at `data/training/{companionId}/training.jsonl`
- SFT chat format: `{ messages: [{role, content}...], metadata: {...} }`
- Collection is fire-and-forget (`.catch(() => {})`) — never blocks chat

## Companion IDs

`cipher`, `mischief`, `vortex`, `forge`, `aether`, `catalyst`

## Do NOT

- Do not add middleware that auto-injects users on protected routes
- Do not use snake_case in API responses
- Do not hardcode ports — use env vars or the established defaults
- Do not skip error handling on the happy path
- Do not use `fs.readFileSync` in API routes that serve user-facing requests (use async)
- Do not commit secrets, API keys, or `.env` files
