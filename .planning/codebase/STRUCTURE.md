# Codebase Structure

**Analysis Date:** 2026-04-11

## Directory Layout

```
kr8tiv-runtime-truth-contracts/
├── api/                          # Fastify REST API server
│   ├── server.ts                 # Main Fastify app factory
│   └── routes/                   # API endpoint handlers (health, auth, kin, conversations, etc.)
├── bot/                          # Telegram bot implementation
│   ├── telegram-bot.ts           # Bot factory and middleware setup
│   ├── handlers/                 # Command handlers (start, help, build, customize, etc.)
│   ├── skills/                   # Skill execution system
│   │   ├── index.ts              # Skill router and registry
│   │   ├── builtins/             # Built-in skills (calculator, reminder)
│   │   └── device-bridge.ts      # Device control interface
│   ├── memory/                   # Session and conversation persistence
│   │   └── conversation-store.ts # SQLite-backed conversation history
│   └── utils/                    # Bot utilities
│       ├── rate-limit.ts         # Per-user rate limiting
│       ├── sanitize.ts           # Input sanitization and safety
│       ├── language.ts           # Language detection and localization
│       ├── dm-security.ts        # DM pairing codes and authorization
│       └── typing.ts             # Typing indicator management
├── db/                           # Database layer
│   ├── connection.ts             # SQLite singleton and schema application
│   └── schema.sql                # DDL for all tables
├── inference/                    # LLM and AI logic
│   ├── providers/                # LLM provider adapters
│   │   ├── openai.ts             # OpenAI GPT-5.4
│   │   ├── groq.ts               # Groq Llama
│   │   ├── moonshot.ts           # Moonshot Kimi
│   │   ├── xai.ts                # xAI Grok
│   │   ├── zai.ts                # ZAI provider
│   │   ├── circuit-breaker.ts    # Failover logic
│   │   └── types.ts              # Provider interfaces
│   ├── companion-prompts.ts      # Personality injection
│   ├── supervisor.ts             # Safety and compliance checks
│   ├── fallback-handler.ts       # Provider fallback chain
│   ├── mission-control.ts        # Mission Control client
│   ├── metrics.ts                # Token accounting and billing
│   ├── scheduler-manager.ts      # Scheduled tasks
│   ├── pipeline-manager.ts       # Training/inference pipelines
│   └── channel-delivery.ts       # Multi-channel message delivery
├── runtime/                      # System reliability and process management
│   ├── sandbox.ts                # Secure command execution with limits
│   ├── health-probe.ts           # Periodic health checking
│   ├── health-watcher.ts         # Health alert generation
│   ├── heartbeat-client.ts       # Keep-alive mechanism
│   ├── recovery.ts               # Automatic recovery procedures
│   └── watchdog.ts               # Process monitoring
├── fleet/                        # Container orchestration control plane
│   ├── db.ts                     # Fleet instance persistence (CRUD)
│   ├── container-manager.ts      # Docker integration
│   ├── tunnel-manager.ts         # Tailscale tunnel setup
│   ├── credit-db.ts              # Token credit tracking
│   ├── frontier-proxy.ts         # Request routing to instances
│   ├── types.ts                  # Fleet data structures
│   └── schema.sql                # Fleet database schema
├── companions/                   # Companion configuration
│   └── config.ts                 # Personality definitions (Cipher, Forge, etc.)
├── training/                     # Model training pipelines
│   ├── data-processor.ts         # Dataset preparation
│   ├── modelfile-generator.ts    # Ollama Modelfile creation
│   └── privacy-pipeline.ts       # Data anonymization
├── solana/                       # Solana blockchain integration
│   └── index.ts                  # Token minting, NFT metadata, Candy Machine
├── voice/                        # Voice I/O
│   ├── index.ts                  # TTS/STT routing
│   ├── local-tts.ts              # Local text-to-speech
│   └── local-stt.ts              # Local speech-to-text
├── tailscale/                    # Tailscale networking
│   ├── client.ts                 # Tailscale API client
│   └── index.ts                  # Device bridge tunneling
├── website/                      # Website generation pipeline
│   └── pipeline.ts               # Carousel/slideshow generation
├── nft/                          # NFT management
├── scripts/                      # Utility scripts
│   ├── start.ts                  # Startup and validation
│   ├── deploy-easy.ts            # One-click deployment
│   ├── health_monitor_daemon.py  # Python health monitoring
│   ├── smoke.ts                  # Smoke tests
│   └── doctor.ts                 # Diagnostic tool
├── types/                        # Global TypeScript types
├── assets/                       # Static assets
│   ├── kin-metadata/             # Companion metadata JSON files
│   └── images/                   # PNG, SVG resources
├── config/                       # Configuration files
│   ├── drift-detection.json      # Drift detection thresholds
│   ├── kin-processes.json        # Process monitoring rules
│   ├── solana-devnet.json        # Blockchain network config
│   ├── support.json              # Support routing config
│   ├── subscription.json         # Billing tiers
│   └── tailscale.json            # VPN routing config
├── fixtures/                     # Test data and examples
│   ├── genesis/                  # Initial companion states
│   └── rebinding/                # NFT rebinding examples
├── schemas/                      # JSON Schema definitions
│   ├── *.schema.json             # Data structure schemas
│   └── examples/                 # Schema examples
├── packages/                     # Monorepo packages
│   ├── mission-control/          # React dashboard UI component library
│   │   ├── src/
│   │   │   ├── components/       # Reusable components (DriftStatus, HealthChart, etc.)
│   │   │   ├── hooks/            # React hooks (useHealth, useDriftStatus, etc.)
│   │   │   └── types/            # Type definitions
│   │   └── package.json
│   └── node-runtime/             # Companion runtime wrapper package
│       ├── src/
│       │   ├── api/              # Health, drift, NFT, support endpoints
│       │   └── server.ts         # Express wrapper for compatibility
│       └── package.json
├── web/                          # Next.js web frontend
│   ├── src/
│   │   ├── app/                  # Next.js app router pages
│   │   ├── components/           # React components
│   │   ├── hooks/                # Data fetching hooks
│   │   ├── lib/                  # Utilities (analytics, Solana integration)
│   │   └── styles/               # CSS/Tailwind
│   └── next.config.ts
├── tests/                        # Test suite
│   ├── *.test.ts                 # Vitest test files
│   └── fixtures/                 # Test data
├── dist/                         # Compiled TypeScript (generated)
├── data/                         # Runtime data directory (created on start)
│   └── kin.db                    # SQLite database file
├── .planning/                    # Planning documents
│   └── codebase/                 # Architecture analysis docs
├── tsconfig.json                 # TypeScript configuration
├── vitest.config.ts              # Test runner configuration
├── package.json                  # Root dependencies
├── eslint.config.mjs             # Linting rules
├── .eslintrc                     # ESLint configuration
└── .env                          # Environment variables (secrets)
```

## Directory Purposes

**api/**
- Purpose: REST API endpoints for web dashboard and external integrations
- Contains: Fastify route handlers using FastifyPluginAsync pattern
- Key files: `server.ts` (entry point), `routes/*.ts` (endpoints)

**bot/**
- Purpose: Telegram bot implementation with multi-handler architecture
- Contains: Command handlers (handlers/), skill execution (skills/), conversation memory
- Key files: `telegram-bot.ts` (factory), `handlers/*.ts` (command logic), `memory/conversation-store.ts` (persistence)

**db/**
- Purpose: Database abstraction and schema
- Contains: SQLite connection singleton, schema DDL
- Key files: `connection.ts` (getDb() singleton), `schema.sql` (all tables)

**inference/**
- Purpose: LLM integration, inference pipelines, and safety checks
- Contains: Provider adapters, prompt building, circuit breaker fallback
- Key files: `providers/*.ts` (adapters), `companion-prompts.ts` (personality), `supervisor.ts` (safety)

**runtime/**
- Purpose: System reliability, process management, health monitoring
- Contains: Sandbox execution, health probes, watchdog, recovery logic
- Key files: `sandbox.ts` (command execution), `health-probe.ts` (monitoring)

**fleet/**
- Purpose: Container orchestration control plane for distributed instances
- Contains: Instance CRUD, container management, tunnel setup, credit tracking
- Key files: `db.ts` (persistence), `container-manager.ts` (Docker), `tunnel-manager.ts` (networking)

**companions/**
- Purpose: Companion personality configuration
- Contains: Config objects for each companion (Cipher, Forge, Mischief, etc.)
- Key files: `config.ts` (personality definitions)

**training/**
- Purpose: Model fine-tuning pipelines
- Contains: Data processing, Ollama Modelfile generation, privacy filtering
- Key files: `data-processor.ts`, `modelfile-generator.ts`

**solana/**
- Purpose: Blockchain integration for token minting and NFT management
- Contains: SPL token operations, Candy Machine integration, Arweave uploads
- Key files: `index.ts` (main integration)

**voice/**
- Purpose: Voice input/output abstraction
- Contains: TTS, STT provider integrations
- Key files: `index.ts` (routing), `local-tts.ts`, `local-stt.ts`

**packages/mission-control/**
- Purpose: Reusable React component library for monitoring UI
- Contains: Components (drift status, health charts, 3D avatars), hooks, types
- Key files: `src/components/`, `src/hooks/`, `package.json` (exports)

**packages/node-runtime/**
- Purpose: Companion runtime wrapper for distributed deployment
- Contains: Health, drift, NFT, support API endpoints
- Key files: `src/server.ts`, `src/api/*.ts`

**web/**
- Purpose: Next.js frontend for Mission Control dashboard
- Contains: Pages, components, API integration hooks, Solana wallet integration
- Key files: `src/app/page.tsx` (home), `next.config.ts`

**tests/**
- Purpose: Integration and unit tests
- Contains: Vitest test files covering API, bot handlers, pipelines, utilities
- Key files: `*.test.ts` files, `vitest.config.ts`

**config/**
- Purpose: Runtime configuration files (not environment secrets)
- Contains: JSON config for drift detection, process monitoring, blockchain, support routing
- Key files: `drift-detection.json`, `solana-devnet.json`, `subscription.json`

**schemas/**
- Purpose: JSON Schema definitions for data validation and documentation
- Contains: Schema files and examples
- Key files: `*.schema.json` (schemas), `examples/` (sample data)

## Key File Locations

**Entry Points:**
- `bot/telegram-bot.ts`: Telegram bot factory and setup
- `api/server.ts`: Fastify API server factory
- `scripts/start.ts`: Startup orchestration and validation
- `web/src/app/page.tsx`: Next.js frontend home page

**Configuration:**
- `tsconfig.json`: TypeScript compiler options (path alias `@/*` → root)
- `vitest.config.ts`: Test runner configuration
- `package.json`: Dependencies, scripts, monorepo root
- `.env`: Environment variables (not committed)

**Core Logic:**
- `db/connection.ts`: Singleton SQLite database handle
- `inference/providers/`: LLM provider adapters
- `bot/memory/conversation-store.ts`: Conversation persistence
- `runtime/sandbox.ts`: Sandboxed command execution
- `fleet/db.ts`: Fleet instance persistence

**Testing:**
- `tests/`: Integration and unit tests
- `vitest.config.ts`: Test configuration
- `fixtures/`: Test data and examples

## Naming Conventions

**Files:**
- Route handlers: `api/routes/<feature>.ts` (e.g., `conversations.ts`, `health.ts`)
- Bot handlers: `bot/handlers/<command>.ts` (e.g., `start.ts`, `build.ts`)
- Inference providers: `inference/providers/<provider-name>.ts` (e.g., `openai.ts`, `groq.ts`)
- Utility modules: `<module>/utils/<util-name>.ts` (e.g., `bot/utils/sanitize.ts`)
- Test files: `tests/<feature>.test.ts` (e.g., `api.test.ts`, `conversation-store.test.ts`)

**Directories:**
- Feature directories use lowercase (e.g., `api`, `bot`, `inference`)
- Subdirectories indicate subsystem (e.g., `api/routes`, `bot/handlers`)
- Utility subdirectories use `utils/` (e.g., `bot/utils`)

**Exports:**
- Barrel files: `<module>/index.ts` for submodule exports
- Main export: `packages/*/src/index.ts` for package entry points
- Re-exports: Use index.ts for convenience (e.g., `bot/skills/index.ts` exports skill router)

## Where to Add New Code

**New API Endpoint:**
1. Create handler in `api/routes/<feature>.ts`
2. Implement as FastifyPluginAsync function
3. Register route in `api/server.ts` via `fastify.register()`
4. Add tests in `tests/api-routes.test.ts` or new test file
5. Add Zod schemas in route file for validation

**New Bot Handler:**
1. Create function in `bot/handlers/<command>.ts`
2. Export handler function with signature `(ctx: BotContext) => Promise<void>`
3. Register in `bot/telegram-bot.ts` via `bot.command()` or `bot.hears()`
4. Add session type extensions if needed
5. Add tests in `tests/bot-handlers.test.ts`

**New Companion:**
1. Add configuration object in `companions/config.ts`
2. Create metadata JSON in `assets/kin-metadata/<companion-name>.json`
3. Add personality prompt in `inference/companion-prompts.ts`
4. Register in companion registry if needed
5. Add test data in `fixtures/genesis/` or `fixtures/rebinding/`

**New Skill:**
1. Create skill module in `bot/skills/<skill-name>.ts`
2. Export skill factory function with signature `(context: SkillContext) => Promise<SkillResult>`
3. Register in `bot/skills/index.ts` skill router
4. Add built-in skills to `bot/skills/builtins/` if applicable
5. Add tests in `tests/companion-abilities.test.ts`

**New Inference Provider:**
1. Create adapter in `inference/providers/<provider-name>.ts`
2. Implement OpenAICompatProvider or custom provider interface
3. Define FrontierModelSpec with pricing and context window
4. Register in provider registry in `inference/providers/openai.ts`
5. Add fallback chain entry in `inference/fallback-handler.ts`

**New Database Table:**
1. Add DDL to `db/schema.sql`
2. Create migration notes in commit message
3. Add CRUD methods to `db/connection.ts` if singleton accessors needed
4. For fleet: add to `fleet/schema.sql` and FleetDb class

**New Route Handler:**
1. Determine if API route (`api/routes/`) or bot handler (`bot/handlers/`)
2. Follow naming convention: `<feature-name>.ts`
3. Add TypeScript interfaces for request/response
4. Add Zod schemas for validation
5. Implement async handler function
6. Add comprehensive tests

**New Utility Function:**
1. Create in `<module>/utils/<util-name>.ts`
2. Export named function with clear typing
3. Add JSDoc comments with examples
4. Add tests in `tests/` with matching name
5. Re-export from `<module>/utils/index.ts` if barrel file exists

## Special Directories

**data/**
- Purpose: Runtime database and state files
- Generated: Yes (auto-created on first start)
- Committed: No (in .gitignore)
- Contents: SQLite database, temporary files, logs

**dist/**
- Purpose: Compiled JavaScript output from TypeScript
- Generated: Yes (via `npm run build`)
- Committed: No (in .gitignore)
- Contents: .js files, .d.ts type definitions, source maps

**node_modules/**
- Purpose: NPM dependencies
- Generated: Yes (via `npm install`)
- Committed: No (in .gitignore)
- Managed by: package-lock.json

**.planning/**
- Purpose: Project planning and architecture documentation
- Generated: Yes (via orchestrator tools)
- Committed: Yes (GSD markdown files)
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, etc.

**web/node_modules/**
- Purpose: Web frontend dependencies
- Generated: Yes (separate from root node_modules)
- Committed: No (in .gitignore)
- Note: Web is separate workspace with its own package-lock.json
