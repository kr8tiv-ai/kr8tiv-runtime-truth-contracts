# Architecture

**Analysis Date:** 2026-04-11

## Pattern Overview

**Overall:** Modular, multi-channel AI companion platform using event-driven microservices with a shared persistence layer.

**Key Characteristics:**
- Monorepo structure with core runtime (Node.js/TypeScript) + separate packages (mission-control UI, node-runtime server)
- Dual-entry point design: REST API (Fastify) + Telegram Bot (Gramm) using shared business logic
- Plugin-based middleware architecture via Fastify FastifyPluginAsync
- Companion-centric data model with multi-modal inference providers
- Fleet control plane for distributed companion instances with container orchestration

## Layers

**Presentation Layer:**
- Purpose: User-facing interfaces across multiple channels
- Location: `bot/handlers/`, `api/routes/`, `web/`, `packages/mission-control/`
- Contains: Telegram bot command handlers, REST API route definitions, Next.js web frontend, React component library
- Depends on: Session management, conversation store, companion config, database
- Used by: End users, external API consumers, browser clients

**Application Logic Layer:**
- Purpose: Core business logic for companion interactions, inference, and state management
- Location: `inference/`, `bot/skills/`, `companions/`, `solana/`, `training/`
- Contains: Inference pipelines, skill routers, companion prompts, training datasets, blockchain integration
- Depends on: External LLM providers, database, runtime utilities
- Used by: Handlers/routes, event schedulers, fleet manager

**Data Access Layer:**
- Purpose: Database and persistence abstraction
- Location: `db/connection.ts`, `fleet/db.ts`, `db/schema.sql`
- Contains: SQLite wrapper, fleet instance CRUD, schema definitions
- Depends on: better-sqlite3
- Used by: All application logic, handlers, routes

**Infrastructure/Runtime Layer:**
- Purpose: System reliability, process management, security, and resource limits
- Location: `runtime/`, `fleet/`, `voice/`, `tailscale/`
- Contains: Sandbox execution, health probes, watchdog, container management, tunneling, voice I/O
- Depends on: Docker, Tailscale, system APIs, database
- Used by: Application logic, admin routes, scheduler

**External Integration Layer:**
- Purpose: Third-party service abstraction
- Location: `inference/providers/`, `solana/`, `voice/`
- Contains: LLM provider adapters (OpenAI, Groq, Moonshot, xAI, ZAI), SPL token minting, voice synthesis/STT
- Depends on: External APIs (OpenAI, Groq, Solana RPC, ElevenLabs, Ollama)
- Used by: Inference pipelines, skill handlers, voice routes

## Data Flow

**Message Processing (Telegram Bot):**

1. User sends message via Telegram
2. Bot receives update via webhook (`/webhook/telegram`)
3. Session middleware loads user session from memory store
4. Message routed through handler chain: sanitizer → rate limiter → jailbreak detector → language detector
5. Conversation context retrieved from `conversationStore`
6. Companion personality injected into prompt via `buildCompanionPrompt()`
7. Inference router selects provider and dispatches to LLM
8. Response streamed back through typing indicator
9. Conversation logged to SQLite (`conversations` table)
10. Suggestion buttons appended via InlineKeyboard

**API Request Processing:**

1. Request arrives at Fastify server
2. Helmet security headers applied
3. CORS middleware validates origin
4. Rate limiting middleware enforces limits
5. JWT middleware validates token (if auth required)
6. Request body validated via Zod schemas
7. Route handler executes business logic
8. Database operations via prepared statements
9. Response serialized and returned with status codes

**Inference Pipeline:**

1. Skill router analyzes message for actionable commands
2. Circuit breaker checks provider health status
3. Provider adapter builds API request (context window, pricing)
4. Stream manager handles token limits and rate limiting
5. Fallback chain attempts alternate providers on failure
6. Token accounting logged for billing
7. Response postprocessed (tool calls, formatting)
8. Supervisor evaluates for safety/compliance
9. Result cached (optional) or streamed directly

**State Management:**

- **Session state:** In-memory map keyed by user ID, expires after inactivity
- **Conversation memory:** SQLite store with message history, metadata, and embeddings
- **Companion state:** Configuration loaded from JSON, adapted via feedback records
- **Fleet state:** Container status tracked in SQLite with tunnel metadata
- **Drift detection:** Continuous monitoring via health probes, baselines stored in database

## Key Abstractions

**Companion:**
- Purpose: Represents an AI personality (Cipher, Forge, etc.) with configurable behavior
- Examples: `companions/config.ts`, `inference/companion-prompts.ts`, `assets/kin-metadata/`
- Pattern: Configuration object + prompt injection; companions are stateless personas applied at inference time

**Skill:**
- Purpose: Composable actions bot can perform (reminder, calculator, code execution)
- Examples: `bot/skills/builtins/calculator.ts`, `bot/skills/builtins/reminder.ts`, `bot/skills/index.ts`
- Pattern: Skill router intercepts messages, matches patterns, executes handlers with typed context

**Provider:**
- Purpose: Abstract LLM implementation (OpenAI, Groq, Anthropic, etc.)
- Examples: `inference/providers/openai.ts`, `inference/providers/groq.ts`, `inference/providers/circuit-breaker.ts`
- Pattern: Adapter pattern with circuit breaker; each provider implements streaming, token accounting, error handling

**Fleet Instance:**
- Purpose: Represents a deployed companion container with networking and health
- Examples: `fleet/db.ts`, `fleet/container-manager.ts`, `fleet/types.ts`
- Pattern: Entity with resource limits, health checks, tunnel configuration; managed via CRUD in FleetDb

**Conversation Store:**
- Purpose: Persistent conversation memory with pagination and filtering
- Examples: `bot/memory/conversation-store.ts`
- Pattern: Singleton wrapper around SQLite with methods for appending, querying, clearing conversations

## Entry Points

**Telegram Bot:**
- Location: `bot/telegram-bot.ts`
- Triggers: Gramm receives webhook updates or polling
- Responsibilities: Instantiate bot, register middleware, attach handlers, set up conversations, start server

**API Server:**
- Location: `api/server.ts`
- Triggers: npm run start (via scripts/start.ts)
- Responsibilities: Initialize Fastify, register security plugins, attach routes, open database, start listening

**Startup Script:**
- Location: `scripts/start.ts`
- Triggers: npm run start
- Responsibilities: Validate environment, initialize database schema, start API and bot in parallel

**Installation Wizard:**
- Location: `api/routes/setup-wizard.ts`, `web/src/app/setup/page.tsx`
- Triggers: First-time user visits web interface
- Responsibilities: Step-by-step companion onboarding, environment configuration, Solana wallet setup

## Error Handling

**Strategy:** Graceful degradation with fallback chains

**Patterns:**

- **Inference errors:** Circuit breaker pauses provider, tries next in fallback list (`inference/providers/circuit-breaker.ts`)
- **Database errors:** Caught at route level, logged via Pino, return 500 with generic message
- **Validation errors:** Zod throws ZodError, caught by error handler, returns 400 with detailed messages
- **Jailbreak attempts:** Detected by `detectJailbreak()`, request rejected with safety message
- **Rate limit exceeded:** Request rejected with 429, suggestion to retry later
- **Sandbox timeout/failure:** Command execution returns error output, skill marked as failed but conversation continues
- **Telegram errors:** Bot catches GrammyError/HttpError, logs to Sentry, retries via autoRetry plugin
- **Resource exhaustion:** Health probe detects memory > 90%, degrades features or returns 503

## Cross-Cutting Concerns

**Logging:**
- Framework: Pino (high-performance logger)
- Approach: Structured logging with context (userId, companionId, requestId)
- Usage: Errors logged at route level, inference calls logged with token counts, database operations logged with latency

**Validation:**
- Framework: Zod (TypeScript-first schema validation)
- Approach: Schemas defined in route files, applied to request bodies, query params, path params
- Example: `api/routes/health.ts` uses interface definitions, routes use Zod schemas

**Authentication:**
- Framework: Fastify JWT plugin
- Approach: JWT tokens issued via /auth/login or /auth/dev-login (development), validated on protected routes
- Tokens include userId, issued at, expiration; failures return 401 or 403

**Rate Limiting:**
- Framework: Fastify rate-limit plugin + custom middleware
- Approach: Per-user limits via session, different limits for different endpoints (e.g., chat vs. API)
- Configuration: `bot/utils/rate-limit.ts` defines RATE_LIMITS object with endpoint-specific rules

**Security:**
- CSRF protection: Helmet middleware applies HTTP security headers
- Input sanitization: `sanitizeInput()`, `escapeMarkdown()` in bot handlers
- Jailbreak detection: Pattern matching against known adversarial prompts
- DM security: Pairing codes for private chat authorization (`bot/utils/dm-security.ts`)
- Sandbox isolation: Blocked command list, timeout enforcement, output size limits (`runtime/sandbox.ts`)
