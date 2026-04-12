# Coding Conventions

**Analysis Date:** 2026-04-11

## Naming Patterns

**Files:**
- `kebab-case.ts` for feature files: `conversation-store.ts`, `circuit-breaker.ts`, `personality-check.ts`
- `camelCase` for exported functions within modules
- Route files: `chat.ts`, `auth.ts`, `skills.ts` (simple names reflecting route prefix)
- Type/interface files co-located with implementations, not separate

**Functions:**
- camelCase: `sanitizeInput()`, `detectLanguage()`, `getCircuit()`, `maybeTransitionToHalfOpen()`
- Async functions use `async`/`await`, not promise chains: `async function handleStart()`
- Private helper functions prefixed with underscore optional but not enforced
- Exported public functions grouped under "Public API" section with JSDoc

**Variables:**
- camelCase for all variables and constants: `authToken`, `companionId`, `messageCount`, `maxMessagesPerUser`
- Const preferred over let/var
- Database fields: `snake_case` (follows SQLite convention): `user_id`, `created_at`, `companion_id`
- API response fields: camelCase: `{ companionId, createdAt, messageCount }`
- Constants for configuration defaults: `UPPERCASE`: `DEFAULT_CONFIG`, `MAIN_KEYBOARD`, `JAILBREAK_PATTERNS`

**Types:**
- PascalCase interfaces: `ConversationMemory`, `CircuitBreakerConfig`, `SessionData`
- Type aliases PascalCase: `CircuitState`, `BotContext`, `LanguageCode`
- Interface for data shapes, type for function signatures
- Discriminated unions used for state: `type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'`

## Code Style

**Formatting:**
- No linting config file found (eslint or prettier not configured at root)
- 2-space indentation observed throughout codebase
- Import statements in source use `.js` extensions (ESM module syntax)
- Line length appears to be ~100 characters but not strictly enforced

**Linting:**
- eslint ^9.17.0 in devDependencies
- Run command: `npm run lint`
- No custom eslint config found — using project defaults
- TypeScript strict mode enabled in tsconfig.json

## Import Organization

**Order:**
1. Built-in Node modules: `import fs from 'fs'`, `import path from 'path'`, `import crypto from 'crypto'`
2. Third-party packages: `import Fastify from 'fastify'`, `import Database from 'better-sqlite3'`
3. Local imports: `import { getCompanionConfig } from '../../companions/config.js'`
4. Type-only imports: `import type { ConversationMemory } from './conversation-store.js'`

**Path Aliases:**
- `@/*` maps to root directory: `import { sanitizeInput } from '@/bot/utils/sanitize.js'` (not observed in practice, but configured in tsconfig)
- Most code uses relative paths: `../bot/utils/sanitize.js`

**Example from `api/routes/chat.ts`:**
```typescript
import { FastifyPluginAsync, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { supervisedChat } from '../../inference/supervisor.js';
import type { AgeBracket } from '../../inference/child-safety.js';
import { getCompanionConfig } from '../../companions/config.js';
```

## Error Handling

**Patterns:**
- Try-catch blocks for synchronous errors: `try { db.exec(migration); } catch { /* safe to ignore */ }`
- Promise .catch() for async operations with fire-and-forget patterns: `.catch(() => { /* K013 */ })`
- Explicit condition checks before operations: `if (!conversation) { reply.status(404); return { error: '...' }; }`
- Fastify sensible plugin used for built-in error responses: `reply.status(400)`
- Log errors with fastify.log.error(): `fastify.log.error(\`[module] Message: ${err}\`)`
- Comments in catch blocks document why error is ignored: `/* column already exists — safe to ignore */`

**Example from `api/server.ts`:**
```typescript
try {
  db.exec(migration);
} catch {
  /* column already exists — safe to ignore */
}
```

## Logging

**Framework:** fastify.log (Pino logger via Fastify)

**Patterns:**
- Request-level logging: `request.log.error({ ... }, message)`
- Server-level logging: `fastify.log.warn(msg)`, `fastify.log.error(msg)`
- Console.error for one-off errors not in request context: `console.error(\`[module] Error: ${msg}\`)`
- Context object prefixes used for module identification: `[fleet]`, `[scheduler]`, `[pipeline]`, `[proactive]`
- Error objects passed as context: `fastify.log.error(\`[circuit-breaker] failure: ${reason}\`)`

**Example from `api/server.ts`:**
```typescript
const logger = {
  warn: (msg: string, ctx?: Record<string, unknown>) => 
    fastify.log.warn(ctx ?? {}, `[fleet] ${msg}`),
  error: (msg: string, ctx?: Record<string, unknown>) => 
    fastify.log.error(ctx ?? {}, `[fleet] ${msg}`),
};
```

## Comments

**When to Comment:**
- Complex algorithms need explanation: `/* Prevents wasting time on providers that are down */`
- Non-obvious decision rationale: `/* fire-and-forget delivery — K013 */`
- State machine transitions: `/* OPEN -> HALF_OPEN transition */`
- Hack/workaround explanations: No FIXME/TODO comments observed in main code (only in test stubs)

**JSDoc/TSDoc:**
- Module-level JSDoc: `/** Circuit Breaker — Tracks provider failures and skips unhealthy ones */`
- Function JSDoc with parameter descriptions:
  ```typescript
  /**
   * Record a successful response from a provider.
   */
  ```
- Type documentation in interface comments
- Full sentences with proper punctuation

**Example from `inference/providers/circuit-breaker.ts`:**
```typescript
/**
 * Return the circuit entry for a provider, creating a healthy default if absent.
 */
function getCircuit(providerId: FrontierProviderId): ProviderCircuit {
```

## Function Design

**Size:** Functions keep to single responsibility, typically 10-30 lines

**Parameters:**
- Named parameters preferred over positional for config objects
- Destructuring used for type safety: `const { conversationId } = request.params`
- Default parameters provided: `companionId: string = 'cipher'`, `maxLength = 4096`
- Optional parameters use `?`: `metadata?: ConversationMemory['metadata']`

**Return Values:**
- Explicit return types: `async function addMessage(...): Promise<string>`
- Objects returned with camelCase keys from snake_case database rows
- Data transformation at boundary (database to API): `{ companionId: c.companion_id, createdAt: new Date(c.created_at).toISOString() }`

**Example from `bot/memory/conversation-store.ts`:**
```typescript
async addMessage(
  userId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  companionId: string = 'cipher',
  metadata?: ConversationMemory['metadata']
): Promise<string>
```

## Module Design

**Exports:**
- Default export for Fastify plugin routes: `const conversationRoutes: FastifyPluginAsync = async (fastify) => { ... }`
- Named exports for utility functions: `export function sanitizeInput(...)`, `export function detectLanguage(...)`
- No mixing of default and named exports in same file (each module has one primary responsibility)

**Barrel Files:**
- Used in some locations: `export { ... } from './...'` pattern
- Example: `packages/mission-control/src/components/index.ts`, `packages/mission-control/src/hooks/index.ts`
- Re-export pattern: `export * from './module.js'` not observed; explicit named exports preferred

**File Organization:**
- Type definitions at top of file
- Internal constants below types
- Internal helper functions before public API
- Public API functions grouped at end
- Section comments with `// ============================================================================` separators

**Example structure from `inference/providers/circuit-breaker.ts`:**
```
// Types
export type CircuitState = ...
export interface CircuitBreakerConfig { ... }

// Defaults
const DEFAULT_CONFIG: CircuitBreakerConfig = { ... }

// State
const circuits = new Map<...>(...)

// Internal Helpers
function getCircuit(...) { ... }
function maybeTransitionToHalfOpen(...) { ... }

// Public API
export function recordSuccess(...) { ... }
export function recordFailure(...) { ... }
```

---

*Convention analysis: 2026-04-11*
