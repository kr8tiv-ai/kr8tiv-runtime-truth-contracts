# Testing Patterns

**Analysis Date:** 2026-04-11

## Test Framework

**Runner:**
- vitest ^2.1.8
- Config: `vitest.config.ts`

**Assertion Library:**
- Vitest built-in expect() API (no external assertion library)

**Run Commands:**
```bash
npm run test              # Run all tests once
npm run test:watch       # Watch mode
# (no separate coverage command found)
```

**Vitest Config (`vitest.config.ts`):**
```typescript
export default defineConfig({
  test: {
    globals: true,           // describe, it, expect available globally
    testTimeout: 15000,       // 15s per test
    hookTimeout: 15000,       // 15s for beforeAll/afterAll
    include: ['tests/**/*.test.ts'],  // Test file location
  },
});
```

## Test File Organization

**Location:**
- All tests in `tests/` directory at root: `tests/*.test.ts`
- Co-located approach NOT used — tests separate from source

**Naming:**
- Pattern: `{feature}.test.ts`
- Examples: `api.test.ts`, `bot-handlers.test.ts`, `conversation-store.test.ts`, `website-pipeline.test.ts`

**Structure:**
```
tests/
├── api.test.ts                    # API server integration tests
├── bot-handlers.test.ts           # Bot utility function tests
├── conversation-store.test.ts     # Conversation storage tests
└── website-pipeline.test.ts       # Website generation tests
```

## Test Structure

**Suite Organization:**
```typescript
describe('Feature name', () => {
  // Setup hooks
  beforeEach(async () => {
    // Initialize state
  });

  afterEach(async () => {
    // Cleanup
  });

  // Test cases
  it('should do something when condition X', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

**Example from `tests/conversation-store.test.ts`:**
```typescript
describe('InMemoryConversationStore', () => {
  let store: ReturnType<typeof getConversationStore>;

  beforeEach(async () => {
    store = getConversationStore({ maxMessagesPerUser: 5 });
    await store.clearHistory(USER_A);
    await store.clearHistory(USER_B);
  });

  afterEach(async () => {
    await store.clearHistory(USER_A);
    await store.clearHistory(USER_B);
  });

  describe('addMessage', () => {
    it('returns a message id starting with "msg-"', async () => {
      const id = await store.addMessage(USER_A, 'user', 'Hello', COMPANION);
      expect(id).toMatch(/^msg-/);
    });
  });
});
```

**Patterns:**
- Setup: `beforeEach` for per-test initialization, `beforeAll` for one-time setup (server creation)
- Teardown: `afterEach` for cleanup, `afterAll` for server shutdown
- Assertion: Direct expect() calls, no separate assertion phase markers
- Nested describe blocks for organization by method/feature
- Constants defined at file scope for test data

**Example from `tests/api.test.ts`:**
```typescript
let app: Awaited<ReturnType<typeof createServer>>;
let authToken: string;

beforeAll(async () => {
  app = await createServer({
    environment: 'development',
    databasePath: ':memory:',
    jwtSecret: 'test-secret-key',
  });
  await app.ready();

  const loginRes = await app.inject({
    method: 'POST',
    url: '/auth/dev-login',
    payload: { telegramId: 12345, firstName: 'TestUser' },
  });

  const loginBody = JSON.parse(loginRes.body);
  authToken = loginBody.token;
});

afterAll(async () => {
  await app.close();
});
```

## Mocking

**Framework:** None — Vitest provides built-in mocking but not used in existing tests

**Patterns:**
- Mock objects created manually as plain JavaScript objects
- No dependency injection used — tests create real instances with test config
- Environment manipulation: `process.env.NODE_ENV = 'test'` to control behavior

**Example from `tests/website-pipeline.test.ts` (manual mock):**
```typescript
function mockLLM(response: string) {
  return {
    chat: async (_messages: { role: string; content: string }[]) => response,
  };
}

// Usage in test
const llm = mockLLM('```html:index.html\n<h1>Hello</h1>\n```');
const result = await generateWebsite({ prompt: 'make a page' }, config, llm);
```

**Spy Pattern used:**
```typescript
const spyLLM = {
  chat: async (messages: { role: string; content: string }[]) => {
    capturedMessages = messages;  // Capture arguments
    return '```html:index.html\n<h1>Hi</h1>\n```';
  },
};

// Execute and verify arguments were passed correctly
await pipeline.generate({ prompt: 'page' }, spyLLM);
expect(systemMsg!.content).toContain('TEACHING MODE');
```

**What to Mock:**
- External services (LLM clients) — replaced with predictable responses
- Database interactions — use in-memory SQLite (`:memory:`) instead
- Request/response objects — use Fastify's built-in `app.inject()` helper

**What NOT to Mock:**
- Core business logic — test real implementations
- Conversation store — create real instances with test config
- API routes — test via Fastify inject(), not mocked

## Fixtures and Factories

**Test Data:**
```typescript
const USER_A = 'user-test-alice';
const USER_B = 'user-test-bob';
const COMPANION = 'cipher';
```

**Location:**
- Defined at top of test file as module-level constants
- No separate fixtures directory
- Factory functions used for complex setup: `mockLLM(response: string)`, `getConversationStore(config)`

**Example from `tests/bot-handlers.test.ts`:**
```typescript
describe('sanitizeInput', () => {
  it('returns trimmed input unchanged when already clean', () => {
    expect(sanitizeInput('hello world')).toBe('hello world');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });
});
```

## Coverage

**Requirements:** Not enforced (no coverage configuration found)

**View Coverage:** Not available (would require vitest config)

## Test Types

**Unit Tests:**
- Scope: Individual functions and utilities
- Approach: Direct function calls with inputs/outputs verified
- Examples: `sanitizeInput()`, `escapeMarkdown()`, `detectLanguage()` tests in `bot-handlers.test.ts`
- Async utilities tested with `async`/`await`: `await store.addMessage(...)`

**Integration Tests:**
- Scope: API endpoints via HTTP-like interface, conversation storage with multiple operations
- Approach: Fastify `app.inject()` for server requests, in-memory database for persistence
- Examples: `api.test.ts` tests auth flow, skills, rate limiting, GDPR export
- Database interaction tested end-to-end with real SQLite in memory

**E2E Tests:**
- Framework: Not used
- No browser automation or live server tests found

## Common Patterns

**Async Testing:**
```typescript
it('returns messages in chronological order', async () => {
  await store.addMessage(USER_A, 'user', 'First', COMPANION);
  await store.addMessage(USER_A, 'assistant', 'Second', COMPANION);

  const history = await store.getHistory(USER_A, 10, COMPANION);

  expect(history.length).toBe(2);
  expect(history[0]!.content).toBe('First');
  expect(history[1]!.content).toBe('Second');
});
```

**Error Testing:**
```typescript
it('POST /chat rejects an empty message with 400', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/chat',
    headers: { authorization: 'Bearer ' + authToken },
    payload: { companionId: 'cipher', message: '' },
  });

  expect(res.statusCode).toBe(400);
  const body = JSON.parse(res.body);
  expect(JSON.stringify(body).toLowerCase()).toMatch(/message/);
});
```

**Array Assertions:**
```typescript
it('returns an array of approved skills', async () => {
  const res = await app.inject({
    method: 'GET',
    url: '/skills',
    headers: { authorization: 'Bearer ' + authToken },
  });

  expect(res.statusCode).toBe(200);
  const body = JSON.parse(res.body);
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBeGreaterThan(0);
  
  const first = body[0];
  expect(first).toHaveProperty('id');
  expect(first).toHaveProperty('name');
});
```

**HTTP Testing with Fastify inject():**
```typescript
// Create request without live server
const res = await app.inject({
  method: 'GET',
  url: '/health',
});

// Verify response
expect(res.statusCode).toBe(200);
const body = JSON.parse(res.body);
expect(body).toHaveProperty('status');
```

**Database State Verification:**
```typescript
// After operation, query database directly to verify persistence
const rows = app.context.db
  .prepare('SELECT COUNT(*) as c FROM heartbeats WHERE kin_id = ?')
  .get('test-kin-upsert') as { c: number };
expect(rows.c).toBe(1);
```

**Isolation Patterns:**
```typescript
// Tests create isolated instances to prevent state leakage
it('creates a user and returns a JWT token', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/dev-login',
    payload: { telegramId: 99999, firstName: 'NewUser' },
  });

  expect(res.statusCode).toBe(200);
  // Each test gets fresh in-memory database via beforeAll
});
```

## Fastify Testing Pattern

All API tests use Fastify's built-in request simulation:

```typescript
// Instead of: new server.listen(3000) + http.request()
// Use: app.inject() - no network needed

const res = await app.inject({
  method: 'POST',
  url: '/endpoint',
  headers: { authorization: 'Bearer TOKEN' },
  payload: { key: 'value' },
});

expect(res.statusCode).toBe(200);
expect(JSON.parse(res.body)).toHaveProperty('field');
```

Benefits: No live server, faster tests, in-memory database, no port conflicts.

---

*Testing analysis: 2026-04-11*
