# Codebase Concerns

**Analysis Date:** 2026-04-11

## Tech Debt

**Unimplemented Python Integration Stubs:**
- Issue: Critical business logic relies on mock data instead of real Python backend integration
- Files: 
  - `packages/node-runtime/src/api/subscription.ts` (lines 437-460)
  - `packages/node-runtime/src/api/drift.ts` (line 678)
  - `packages/node-runtime/src/api/health.ts` (lines 273-286)
  - `packages/node-runtime/src/api/kin-status.ts` (lines 148-156)
- Impact: Subscription management, drift detection, health monitoring, and kin status are non-functional in production. Billing, monitoring, and core health checks return only mock data instead of real system state.
- Fix approach: Implement HTTP client layer or subprocess bridge to call Python StripeClient and health monitoring services. Create integration tests to verify bidirectional communication.

**Hardcoded Mock Collection Address:**
- Issue: NFT collection address hardcoded as placeholder value
- Files: `packages/node-runtime/src/api/nft.ts` (line 113)
- Impact: NFT records cannot be properly minted or verified on-chain. The placeholder address `G3n3s1sS1xCo11ect10nXXXXXXXXXXXXXXXXX` breaks Solana integration.
- Fix approach: Move collection address to environment configuration or database schema. Validate address format at initialization time.

**Unsafe Type Casting:**
- Issue: Extensive use of `any` type and `as unknown` casts throughout codebase
- Files: 
  - `api/server.ts` (line 193, 207)
  - `api/middleware/token-gate.ts` (lines 60, 94, 141)
  - Multiple route handlers cast database results to `any`
- Impact: Type safety is lost at critical integration points. Undetected data shape mismatches at runtime. Makes refactoring extremely risky.
- Fix approach: Create proper TypeScript interfaces for all API responses and database rows. Use strict type guards. Replace `any` with discriminated unions for error states.

**Console.log Debugging in Production Code:**
- Issue: Extensive console.log calls left in production code paths
- Files: 
  - `bot/whatsapp-bot.ts` (lines 356, 700, 720, 743, 759, 867, 894, 918)
  - `bot/telegram-bot.ts` (lines 511, 544, 577, 612, 802, 809, 813)
  - `bot/discord-bot.ts` (lines 691, 693, 739-740, 596)
  - `api/lib/solana-mint.ts` (lines 185, 201)
  - 50+ additional occurrences
- Impact: Leaks potentially sensitive information to logs. Makes log analysis difficult. Unexpected noise in monitoring systems.
- Fix approach: Replace with structured logging using winston or pino. Implement log levels (debug, info, warn, error) and configure environment-specific output.

**Development Mode Fallbacks in Production Code:**
- Issue: Code checks NODE_ENV and returns mock data when not in production
- Files: 
  - `packages/node-runtime/src/api/health.ts` (lines 48-51, 68-74, 111-117, 147-150)
  - `packages/node-runtime/src/api/drift.ts` (lines 136-139, 163-166, 185-187, 224-226, 269-273)
  - `packages/node-runtime/src/api/kin-status.ts` (lines 37-40, 60-63)
- Impact: Development fallbacks may be accidentally deployed to production. Test environments may pass with fake data while real services are broken.
- Fix approach: Completely remove development mode checks. Separate dev-specific utilities into `__dev__` files or test fixtures. Always fail fast if required services are unavailable.

## Known Bugs

**Website Pipeline TODO:**
- Symptoms: Generated code may contain placeholders, TODOs, or incomplete implementation
- Files: `website/pipeline.ts` (lines 121, 313, 385)
- Trigger: Running website code generation pipeline without proper completion validation
- Workaround: Manual code review before deployment. Implement strict regex validation for placeholder detection.

**Subscription Upgrade TODO:**
- Symptoms: Subscription tier upgrades don't actually update Stripe
- Files: `bot/handlers/upgrade.ts` (line 124)
- Trigger: User attempts to upgrade subscription through bot
- Workaround: Use Stripe dashboard to manually update subscription status

**Missing Active Companion Context:**
- Symptoms: Dashboard soul page may display wrong companion or no companion
- Files: `web/src/app/dashboard/soul/page.tsx` (line 97)
- Trigger: User navigates to soul customization page without explicit companion selection
- Workaround: Force companion selection in routing guard

## Security Considerations

**Environment Variable Exposure:**
- Risk: Many sensitive config values could be leaked in error messages, logs, or error boundaries
- Files: 
  - `api/server.ts` (lines 158-167, 278-287, 500-504)
  - `bot/whatsapp-bot.ts` (lines 142-151)
  - `companions/config.ts` (lines 67-69, 85-87, 103-105)
- Current mitigation: Environment variables are loaded but not validated for presence. No secrets manager integration.
- Recommendations: 
  1. Use `zod` or similar to validate all env vars at startup and fail if required ones are missing
  2. Implement secrets redaction in error boundaries and logging
  3. Use Vault or AWS Secrets Manager instead of raw env vars
  4. Add pre-commit hook to prevent `.env` files from being committed

**JWT Secret Generation Fallback:**
- Risk: In non-production environments, JWT_SECRET may be auto-generated, creating non-deterministic authentication
- Files: `api/server.ts` (line 163)
- Current mitigation: Throws error if in production without JWT_SECRET set
- Recommendations: Always require explicit JWT_SECRET, even in development. Use a standard dev token like `dev-secret-key-not-for-production`.

**Unvalidated SQL Parameter Substitution:**
- Risk: While using prepared statements with parameter binding (good), the placeholder string interpolation could fail silently
- Files: 
  - `api/routes/family.ts` (line 434)
  - `api/routes/memory.ts` (line 169)
  - `api/routes/training.ts` (line 96)
- Current mitigation: Using `.all(...memberIds)` to bind parameters correctly
- Recommendations: Add validation that `memberIds.length > 0` before constructing query. Use safer library helpers if available.

**Rate Limiting Not Applied to All Endpoints:**
- Risk: Some authentication endpoints may be vulnerable to brute force
- Files: 
  - `api/middleware/auth-rate-limit.ts` - implements per-endpoint limits
  - Missing from several routes
- Current mitigation: Auth-specific rate limiter exists but coverage unclear
- Recommendations: Audit all auth-related endpoints. Apply rate limiting globally with exceptions for trusted IPs.

**Device Pairing Code Security:**
- Risk: DM-security pairing codes are generated but validation mechanism unclear
- Files: 
  - `bot/whatsapp-bot.ts` (line 790)
  - `bot/telegram-bot.ts` (line 511)
  - `bot/discord-bot.ts` (line 596)
- Current mitigation: `validatePairingCode()` function exists
- Recommendations: Document pairing code generation algorithm and expiration. Use cryptographically secure random generation. Implement rate limiting on pairing attempts.

## Performance Bottlenecks

**Memory-Based Circuit Breaker State:**
- Problem: Inference provider circuit breaker state is stored in memory with no persistence
- Files: `inference/providers/circuit-breaker.ts` (line 59)
- Cause: Singleton `Map<FrontierProviderId, ProviderCircuit>` will reset on process restart, losing failure state
- Improvement path: Persist circuit state to Redis or SQLite. Add metrics collection for circuit state transitions.

**Console.log in Hot Paths:**
- Problem: Logging in frequently-called handlers (WhatsApp, Telegram) can cause synchronous I/O delays
- Files: Multiple bot handler files
- Cause: Blocking console output in async message handlers
- Improvement path: Implement async logging. Use buffered logger with batch writes.

**Database Connection Not Pooled:**
- Problem: Single SQLite connection via better-sqlite3 may bottleneck under concurrent load
- Files: `db/connection.ts` (line 46)
- Cause: WAL mode helps but single connection has inherent limits
- Improvement path: For high-concurrency scenarios, migrate to PostgreSQL with connection pooling. Add connection metrics.

**Mock Data Generation Called on Every Request:**
- Problem: Health and drift checks regenerate mock data on every request instead of caching
- Files: 
  - `packages/node-runtime/src/api/health.ts` (lines 50, 70, 113, 149)
  - `packages/node-runtime/src/api/drift.ts` (lines 138, 165, 187, 226)
- Cause: No caching layer, generateMintAddress is O(n) per request
- Improvement path: Cache mock data with TTL. For real implementation, query database once per check interval.

**Setters in Tight Loops:**
- Problem: `setInterval` cleanup in rate limiter may accumulate timers
- Files: `bot/utils/rate-limit.ts` (line 16)
- Cause: Global cleanup interval without cleanup validation
- Improvement path: Use WeakMap for rate limit entries. Implement proper timer cleanup on shutdown.

## Fragile Areas

**Website Code Generation Pipeline:**
- Files: `website/pipeline.ts`
- Why fragile: Complex regex-based validation for detecting placeholders, secrets, and incomplete code. Brittle pattern matching can miss edge cases.
- Safe modification: Add comprehensive test suite for each validation pattern. Use AST parsing instead of regex for code structure validation.
- Test coverage: Has test file (`tests/website-pipeline.test.ts`) but coverage for edge cases likely incomplete.

**Telegram Bot Message Handling:**
- Files: `bot/telegram-bot.ts`
- Why fragile: Many early returns and guards but message type handling is distributed across handlers. Adding new message types requires modifying multiple functions.
- Safe modification: Refactor into handler registry pattern. Each message type gets its own handler function with clear contract.
- Test coverage: `tests/bot-handlers.test.ts` exists but may not cover all message type combinations.

**Conversation Memory Store:**
- Files: `bot/memory/conversation-store.ts`
- Why fragile: In-memory store with no persistence. Process restart loses all conversations. Race conditions possible with concurrent messages.
- Safe modification: Persist to database on each message. Add mutex/lock for critical sections. Add test for concurrent access.
- Test coverage: `tests/conversation-store.test.ts` exists but may not test concurrency.

**Drift Detection Mock Data:**
- Files: `packages/node-runtime/src/api/drift.ts` (lines 355-673)
- Why fragile: 1000+ lines of hardcoded mock Drift data with timestamps and complex alert structures. Real implementation will have different shape.
- Safe modification: Extract mock data to separate JSON fixture file. Create clear data contracts (TypeScript interfaces) that both mock and real implementations follow.
- Test coverage: No tests validate drift mock data shape matches schema expectations.

**NFT Record Generation:**
- Files: `packages/node-runtime/src/api/nft.ts` (lines 85-141)
- Why fragile: Deterministic mock address generation via base64 hash substitution is non-standard. Real Solana addresses have specific format requirements.
- Safe modification: Validate generated addresses against Solana address format. Use proper Solana address generation library (e.g., `@solana/web3.js`).
- Test coverage: No tests validate generated NFT records have valid Solana addresses.

**Setup Wizard Step Ordering:**
- Files: `api/lib/setup-wizard-status.ts`
- Why fragile: Complex interdependencies between blocking/non-blocking steps. Order matters but not enforced by types.
- Safe modification: Create dependency graph type. Use topological sort for step ordering. Add integration tests that verify valid step sequences.
- Test coverage: `tests/completion-status.test.ts` exists but may not test all step ordering edge cases.

## Scaling Limits

**SQLite Concurrent Write Bottleneck:**
- Current capacity: WAL mode supports multiple readers but single writer
- Limit: Under sustained write load (>100 writes/sec), sqlite will become bottleneck
- Scaling path: Migrate to PostgreSQL. Implement write-ahead logging at application level. Add read replicas.

**Memory-Based Provider Circuit State:**
- Current capacity: O(n) memory for active providers, lost on restart
- Limit: No practical limit but zero persistence = poor visibility
- Scaling path: Persist circuit state to Redis. Add metrics collection for observability.

**Mock Data Generation Without Caching:**
- Current capacity: Regenerates mock data on every request
- Limit: At scale, this becomes O(n*m) where n=requests, m=mock data size
- Scaling path: Implement Redis cache with TTL. For real implementation, query time-series database.

**Single WebSocket Connection per User:**
- Current capacity: Each user gets own WebSocket connection
- Limit: Memory usage grows linearly with connected users. No connection pooling.
- Scaling path: Implement message broker (Redis Pub/Sub) for broadcast messages. Share WebSocket connections across multiple users if needed.

## Dependencies at Risk

**Baileys (WhatsApp Library):**
- Risk: Unofficial WhatsApp client library that reverse-engineers WhatsApp Web. Meta actively blocks this.
- Impact: WhatsApp bot may stop working if Meta changes protocol or blocks accounts
- Migration plan: Switch to official WhatsApp Cloud API. Requires registered business account and phone number.

**Grammy (Telegram Framework):**
- Risk: Active maintenance but smaller ecosystem than discord.py
- Impact: If unmaintained, Telegram integration becomes security liability
- Migration plan: Telegram Bot API is stable; migration to lower-level library is straightforward.

**Ollama (Local LLM Runtime):**
- Risk: Rapid iteration on model formats and performance. Production deployment requires careful version pinning.
- Impact: Model compatibility breaks on upgrade. Inference latency increases unexpectedly.
- Migration plan: Pin Ollama version. Test new versions in staging. Consider vLLM or TensorRT for production.

**Better-sqlite3 (SQLite Binding):**
- Risk: Native binding requires compilation. npm install can fail on some systems.
- Impact: Deployment failures on CI/CD systems without proper build tools. Runtime crashes if binding missing.
- Migration plan: Use `sqlite` npm package (pure JS) for fallback. Add pre-install checks.

**Discord.js v14:**
- Risk: Major version upgrade required significant codebase changes. Future versions may break API again.
- Impact: Staying on outdated version accumulates security debt
- Migration plan: Plan upgrade to v15+ before EOL announced. Create compatibility layer for major changes.

## Missing Critical Features

**Python-to-Node Bridge Implementation:**
- Problem: 5+ critical features are stubbed with TODO comments
- Blocks: 
  1. Subscription management (billing can't update)
  2. Drift detection (monitoring is non-functional)
  3. Health checking (system visibility lost)
  4. Kin status queries (core API returns null)
- Fix priority: CRITICAL — blocks production deployment

**Proper Secret Management:**
- Problem: Secrets stored in `.env` files and environment variables with no encryption
- Blocks: Compliance with security standards. Cannot safely deploy to shared infrastructure.
- Fix priority: HIGH — required for any regulated use case

**Comprehensive Error Handling and Recovery:**
- Problem: Many async operations lack proper error boundaries and retry logic
- Blocks: Graceful degradation when services fail. Customers see raw errors instead of helpful messages.
- Fix priority: HIGH — impacts user experience and operations

**Production-Ready Logging:**
- Problem: Mix of console.log and no structured logging
- Blocks: Debugging in production. Monitoring and alerting setup.
- Fix priority: MEDIUM — critical for ops but can be added incrementally

**Rate Limiting on API Endpoints:**
- Problem: Global rate limiting exists but not applied consistently to all endpoints
- Blocks: Protection against DDoS and brute force attacks
- Fix priority: MEDIUM — becomes CRITICAL at scale

## Test Coverage Gaps

**Drift Detection Logic:**
- What's not tested: Baseline calculation, alert generation logic, reset functionality
- Files: `packages/node-runtime/src/api/drift.ts`
- Risk: Drift detection is core monitoring feature. Changes could introduce blind spots without detection.
- Priority: HIGH

**NFT Record Generation and Validation:**
- What's not tested: Address format validation, metadata correctness, Solana compatibility
- Files: `packages/node-runtime/src/api/nft.ts`
- Risk: NFT records could have invalid addresses and fail during minting without being caught.
- Priority: HIGH

**Message Type Handling in Bots:**
- What's not tested: All message type combinations, edge cases for media handling, concurrent message processing
- Files: `bot/telegram-bot.ts`, `bot/whatsapp-bot.ts`, `bot/discord-bot.ts`
- Risk: New message types could crash bot or cause data loss. Concurrency bugs may only surface under load.
- Priority: MEDIUM

**Conversation State Concurrency:**
- What's not tested: Race conditions with simultaneous messages from same user, memory corruption scenarios
- Files: `bot/memory/conversation-store.ts`
- Risk: Process restart loses all conversations. Concurrent messages could cause state inconsistency.
- Priority: MEDIUM

**Setup Wizard Step Validation:**
- What's not tested: All valid/invalid step transition sequences, blocking step enforcement
- Files: `api/lib/setup-wizard-status.ts`
- Risk: Users could bypass required setup steps. Invalid state transitions could leave system in broken state.
- Priority: MEDIUM

**Database Migration and Schema Evolution:**
- What's not tested: Migration scripts, rollback scenarios, data integrity during schema changes
- Files: `db/schema.sql`, `db/connection.ts`
- Risk: Schema changes could corrupt data or cause downtime. No rollback procedure defined.
- Priority: MEDIUM

**API Error Response Consistency:**
- What's not tested: All error paths return proper HTTP status codes, error message formatting
- Files: Multiple route files
- Risk: Client-side error handling code could fail if error format varies. Debugging becomes harder.
- Priority: LOW

---

*Concerns audit: 2026-04-11*
