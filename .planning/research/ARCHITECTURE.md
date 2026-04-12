# Architecture Patterns: Local AI Companion

**Domain:** Local AI companion platform with cloud supervisor integration
**Researched:** 2026-04-11
**Confidence:** MEDIUM-HIGH (verified across multiple sources, some integration patterns are novel)

---

## System Overview

The kr8tiv local companion is a **desktop-installed AI agent** that runs inference locally for speed and privacy, escalates to frontier cloud models for complex reasoning, and uses MCP servers for tool integration. It speaks, sees rendered output, manages its own memory, and receives updates through a mesh network.

```
+------------------------------------------------------------------+
|                     COMPANION DESKTOP APP                        |
|  (Electron shell + React UI)                                     |
|                                                                  |
|  +------------------+  +------------------+  +----------------+  |
|  |   Chat / Voice   |  |  Render Preview  |  | Settings/Mgmt  |  |
|  |   Interface      |  |  (Playwright)    |  | Panel          |  |
|  +--------+---------+  +--------+---------+  +-------+--------+  |
|           |                      |                    |          |
|  +--------v----------------------v--------------------v--------+ |
|  |                    ORCHESTRATION LAYER                      | |
|  |  Router  |  Memory Manager  |  Tool Dispatcher  |  TTS Mgr | |
|  +----+----------+------------------+-----------------+--------+ |
|       |          |                  |                 |          |
+------------------------------------------------------------------+
        |          |                  |                 |
   +----v----+ +---v-----+    +------v------+   +------v------+
   | Ollama  | | SQLite  |    | MCP Server  |   | Pocket TTS  |
   | Server  | | + Sync  |    | Registry    |   | Engine      |
   | :11434  | |         |    |             |   |             |
   +---------+ +---------+    +-------------+   +-------------+
        |          |                  |
   +----v----+ +---v-----------+ +---v-----------+
   | Local   | | Supermemory   | | External      |
   | Models  | | Cloud Sync    | | Tools (fs,    |
   | (GGUF)  | |               | |  browser, etc)|
   +---------+ +---------------+ +---------------+
                       |
              +--------v--------+
              | Tailscale Mesh  |
              | (device tunnel  |
              |  + kr8tiv svc)  |
              +-----------------+
```

---

## Component Boundaries

### 1. Electron Host Shell

**Responsibility:** Window management, process lifecycle, auto-update, IPC bridge, system tray.

| Sub-component | What It Does | Technology |
|---------------|-------------|------------|
| Main process | Spawns Ollama, TTS, MCP processes; manages lifecycle | Electron main |
| Renderer | Chat UI, settings, render preview | React + Tailwind |
| Preload bridge | Secure IPC between renderer and main | Electron preload API |
| Auto-updater | App binary updates via electron-updater | electron-builder NSIS |

**Key decision:** Use `electron-ollama` pattern -- detect existing Ollama instance, install if missing, manage lifecycle. The library deliberately avoids hard Electron deps so the same logic works in Node.js for headless/CI scenarios.

**Process tree:**
```
electron (main)
  +-- ollama serve (subprocess, port 11434)
  +-- mcp-server-registry (subprocess, stdio transport)
  +-- pocket-tts (subprocess or in-process WASM)
  +-- renderer (chromium, chat UI)
  +-- playwright (on-demand, headless chromium for render-critique)
```

### 2. Inference Engine (Ollama)

**Responsibility:** Local LLM inference, model management, GPU/CPU allocation.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Backend | Ollama v0.18+ | 52M monthly downloads, OpenAI-compatible API, handles quantization/GPU automatically |
| Default model | Qwen 2.5 7B Q4_K_M | Best quality-per-VRAM at consumer hardware tier |
| Fallback model | Phi-3.5 Mini 3.8B Q4 | For machines with less than 8GB RAM |
| API surface | `/api/chat` (streaming), `/api/generate`, `/api/embeddings` | Chat for conversations, embeddings for memory retrieval |
| Model storage | `%APPDATA%/kr8tiv/models/` (symlinked to Ollama blob dir) | Keep models with the app, not polluting user's Ollama |

**Model management pattern:**
```
App startup:
  1. Check if Ollama process is running (HTTP health check :11434)
  2. If not: spawn from bundled/downloaded binary
  3. Check if required model exists (GET /api/tags)
  4. If not: pull model (POST /api/pull) with progress UI
  5. Warm the model (single inference call to load into VRAM)
```

### 3. Two-Brain Router

**Responsibility:** Decide whether a query goes to local model or frontier cloud model.

This is the core architectural differentiator. Research shows an 80/20 split where ~80% of queries can be handled locally with significant cost and latency savings.

**Routing strategy -- classifier-based:**

```typescript
interface RouteDecision {
  target: 'local' | 'frontier';
  reason: string;
  confidence: number;
}

// Classification signals (no ML classifier needed initially -- use heuristics)
function routeQuery(query: string, context: ConversationContext): RouteDecision {
  // FRONTIER triggers:
  // - Explicit user request ("use Claude for this")
  // - Code generation > 50 lines
  // - Multi-step reasoning chains
  // - Query references external knowledge the local model lacks
  // - Previous local attempt scored low confidence
  
  // LOCAL handles:
  // - Conversational chat, emotional support, personality
  // - Short code edits, explanations
  // - Summarization of provided text
  // - Voice-mode interactions (latency critical)
  // - Private/sensitive content (stays on device)
}
```

**Escalation pattern (not just routing):**
```
User query
  --> Local model attempts (streaming response begins)
  --> If local model outputs low-confidence markers OR user thumbs-down:
      --> Pause local stream
      --> Forward to frontier with local attempt as context
      --> Frontier response replaces/augments local response
```

**Frontier integration:**
- Cloud endpoint: kr8tiv API gateway (not direct Anthropic/OpenAI calls)
- Auth: Tailscale device identity + kr8tiv API key
- Models: Claude Opus 4 for complex reasoning, Claude Sonnet 4 for balanced tasks
- Billing: Per-user token budget tracked server-side

### 4. MCP Server Registry

**Responsibility:** Tool-use capabilities via Model Context Protocol servers.

**Architecture: Local MCP hub with stdio transport.**

```
Companion App (MCP Host)
  |
  +-- MCP Client (in orchestration layer)
       |
       +-- [stdio] filesystem-server    (read/write local files)
       +-- [stdio] playwright-server    (browser automation)
       +-- [stdio] memory-server        (SQLite query/store)
       +-- [stdio] kr8tiv-server        (platform API calls)
       +-- [http+sse] remote-tools      (cloud-hosted MCP servers)
```

**Key MCP decisions:**
- Use **stdio transport** for all local servers (lowest latency, no port conflicts)
- Use **HTTP+SSE transport** for remote/cloud MCP servers through Tailscale tunnel
- Server discovery via local config file (`~/.kr8tiv/mcp-servers.json`)
- MCP v2.1 Server Cards for capability advertisement
- Tool approval: user must approve first use of each tool category, then auto-approve

**Built-in MCP servers to ship:**

| Server | Tools Provided | Priority |
|--------|---------------|----------|
| `@kr8tiv/mcp-filesystem` | read_file, write_file, list_dir, search | P0 |
| `@kr8tiv/mcp-memory` | store_memory, recall, search_memories | P0 |
| `@kr8tiv/mcp-browser` | navigate, screenshot, click, type (Playwright) | P1 |
| `@kr8tiv/mcp-kr8tiv` | bags_api, profile, portfolio | P1 |
| `@kr8tiv/mcp-code` | run_code, lint, format | P2 |

### 5. The Kraken Sees (Render-Critique Loop)

**Responsibility:** Automated visual QA -- render a page/component, screenshot it, critique with vision model.

**Architecture:**

```
Code change detected (or user triggers)
  --> Playwright launches headless Chromium
  --> Navigate to target URL / render component
  --> page.screenshot() --> PNG buffer
  --> Accessibility tree extraction (2-5KB vs 100KB+ screenshot)
  
  --> Send to critique pipeline:
      Option A: Local vision model (if available, e.g., LLaVA)
      Option B: Frontier model with vision (Claude with image)
      
  --> Critique response: {issues: [], suggestions: [], score: number}
  --> Display in Companion UI with annotated screenshot
  --> Optional: auto-fix cycle (apply suggestion --> re-render --> re-critique)
```

**Key decision:** Prefer accessibility tree over screenshots for the local model path. Screenshots require a vision model (heavy, local options are mediocre). Accessibility tree is 2-5KB of structured text that even a 7B text model can reason about effectively. Use screenshots only for the frontier escalation path.

**Implementation:** Use the official Playwright MCP server rather than building custom. It already provides navigate, screenshot, accessibility snapshot, click, and type tools. Wire it as an MCP server in the registry.

### 6. TTS Pipeline

**Responsibility:** Voice output for the companion -- personality expression through speech.

**Recommended model: Kyutai Pocket TTS (100M params)**

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Model | Pocket TTS | 100M params, runs 6x real-time on CPU, no GPU needed |
| Fallback | Voxtral TTS (cloud) | Higher quality for non-latency-critical scenarios |
| Voice cloning | 5-10 second reference sample | Pocket TTS supports single-sample voice cloning |
| Streaming | Token-level streaming | CALM architecture processes text and audio in parallel |
| Runtime | Python subprocess OR WASM in-browser | WASM preferred for simplicity, Python for quality |

**Pipeline architecture:**
```
LLM output (streaming text tokens)
  --> Sentence boundary detection (buffer until period/question mark)
  --> Pocket TTS inference (sentence-level)
  --> PCM audio chunks --> Web Audio API playback
  --> Overlap: next sentence synthesizing while current plays
```

**Voice switching:**
- Store voice reference samples in `~/.kr8tiv/voices/`
- Each voice = 5-10 second WAV file + metadata JSON
- Switch voice at runtime without model reload (Pocket TTS zero-shot)
- Ship 3-4 default voice personas with the app

### 7. Memory Architecture

**Responsibility:** Persistent memory across conversations with cloud sync.

**Two-tier design: Local SQLite (fast/private) + Supermemory cloud (sync/search).**

```
+-------------------+          +--------------------+
|   LOCAL SQLITE    |  sync    |   SUPERMEMORY      |
|                   | -------> |   CLOUD            |
| - conversations   |          | - cross-device     |
| - user prefs      | <------- | - semantic search  |
| - tool results    |  recall  | - memory graphs    |
| - embeddings      |          | - contradiction    |
|   (local RAG)     |          |   resolution       |
+-------------------+          +--------------------+
```

**SQLite schema (core tables):**
```sql
-- Conversations
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  title TEXT,
  metadata JSON
);

-- Messages  
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id),
  role TEXT CHECK(role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT,
  model_used TEXT,        -- 'local:qwen2.5-7b' or 'frontier:claude-opus-4'
  route_reason TEXT,      -- why this model was chosen
  tokens_used INTEGER,
  created_at TIMESTAMP
);

-- Memory entries (extractd facts, preferences, learnings)
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  content TEXT,
  category TEXT,          -- 'fact', 'preference', 'skill', 'relationship'
  importance REAL,        -- 0.0 to 1.0
  embedding BLOB,         -- local embedding vector (Ollama /api/embeddings)
  source_message_id TEXT,
  created_at TIMESTAMP,
  last_accessed TIMESTAMP,
  access_count INTEGER DEFAULT 0,
  synced_at TIMESTAMP     -- NULL = not yet synced to cloud
);

-- Sync log
CREATE TABLE sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT,
  entity_id TEXT,
  action TEXT,            -- 'push', 'pull', 'conflict_resolved'
  synced_at TIMESTAMP
);
```

**Sync strategy:**
- **Offline-first:** Local SQLite is source of truth. App works fully offline.
- **Background sync:** When online, push new memories to Supermemory every 60 seconds.
- **Conflict resolution:** Last-write-wins for preferences; append-only for facts/memories.
- **Privacy filter:** User configurable -- some memory categories marked "local only" never sync.
- **Embedding dual-write:** Local embeddings via Ollama, cloud embeddings via Supermemory's pipeline. Local for fast retrieval, cloud for cross-device semantic search.

### 8. Tailscale Integration

**Responsibility:** Secure device mesh for companion-to-cloud and companion-to-companion communication.

**Architecture:**

```
User's Devices (Tailscale tailnet)
  +-- Desktop (companion installed) -- 100.x.x.1
  +-- Laptop (companion installed)  -- 100.x.x.2
  +-- Phone (companion lite)        -- 100.x.x.3
  
kr8tiv Infrastructure (same tailnet via shared node)
  +-- API Gateway                   -- 100.x.x.50
  +-- Frontier Model Proxy          -- 100.x.x.51
  +-- Supermemory Sync Endpoint     -- 100.x.x.52
```

**Key decisions:**
- Use **Tailscale client library** (not CLI) embedded in the Electron app
- Device auth via Tailscale OAuth + kr8tiv account linking
- All frontier model calls route through Tailscale tunnel (encrypted, no public internet)
- **Headscale** as self-hosted control plane option for enterprise/privacy-conscious users
- MagicDNS for service discovery: `frontier.kr8tiv.ts.net`, `sync.kr8tiv.ts.net`

**Benefits for the companion:**
- Zero-config networking between user's devices
- No port forwarding or firewall issues
- Device-level identity (each companion instance = authenticated node)
- Cross-device memory sync without public cloud endpoints

### 9. Installer Architecture

**Responsibility:** First-run experience from download to working companion.

**Strategy: Thin installer + first-run download.**

| Component | In Installer (~150MB) | First-Run Download |
|-----------|----------------------|-------------------|
| Electron app | Yes | No |
| React UI bundle | Yes | No |
| Ollama binary | Yes (platform-specific) | No |
| Pocket TTS (WASM) | Yes (~50MB) | No |
| MCP server binaries | Yes | No |
| Tailscale client | Yes | No |
| Default LLM model | No | Yes (~4-5GB, Qwen 2.5 7B Q4) |
| Voice samples | No | Yes (~20MB, download from CDN) |
| Additional models | No | User-initiated |

**Rationale:** The installer must be under 200MB for reasonable download times. The LLM model is 4-5GB and would make the installer impractical. Instead:

1. Installer drops all runtime binaries (~150MB compressed NSIS)
2. First launch shows onboarding wizard with model download progress
3. Model download is resumable (Ollama pull handles this natively)
4. App is partially functional during download (settings, account setup, cloud-only mode)

**Update channels:**
- **App updates:** electron-updater, standard auto-update (check on launch, install on restart)
- **Model updates:** Managed pull via Ollama API, triggered by kr8tiv backend notification
- **MCP server updates:** npm-style versioned packages, auto-update check weekly
- **Voice updates:** CDN-hosted, versioned manifests, optional download

### 10. Update / Model Improvement Pipeline

**Responsibility:** Push model improvements to installed companions.

**Architecture:**

```
kr8tiv Backend
  --> Publishes model manifest update to API
  --> Companion polls manifest every 24h (or push via Tailscale)
  
Companion receives update notification:
  --> Compare local model hash vs manifest
  --> If update available:
      --> Notify user ("New model available: +12% coding, +8% reasoning")
      --> User approves --> ollama pull (delta download, shared layers)
      --> Swap model on next conversation (not mid-conversation)
      --> Keep previous model as rollback for 7 days
```

**Custom model distribution:**
- kr8tiv can publish fine-tuned models to a private Ollama registry
- Modelfile-based customization layered on base models
- System prompt + personality updates pushed as Modelfile changes (KB-sized, instant)
- Full model weight updates only when base model improves

---

## Data Flow Diagrams

### Happy Path: User Sends Message (Local Route)

```
1. User types message in React UI
2. Renderer --> IPC --> Main process
3. Main: Router classifies query --> LOCAL
4. Main: Fetch relevant memories (SQLite embedding search)
5. Main: Build prompt (system + memories + conversation + user message)
6. Main: POST /api/chat to Ollama (streaming)
7. Ollama: Stream tokens back
8. Main: Forward tokens to Renderer via IPC (real-time display)
9. Main: Detect sentence boundaries --> feed to Pocket TTS
10. TTS: Stream audio chunks --> Web Audio API in Renderer
11. Main: Extract memories from response --> store in SQLite
12. Main: Queue memory sync to Supermemory (background)
```

### Escalation Path: Local to Frontier

```
1. User sends complex query (e.g., multi-file code refactor)
2. Router classifies --> FRONTIER (or local attempt fails)
3. Main: Package context (conversation + memories + local attempt if any)
4. Main: POST to frontier.kr8tiv.ts.net via Tailscale
5. kr8tiv API: Route to appropriate frontier model
6. Frontier: Stream response back through Tailscale tunnel
7. Main: Forward to Renderer (same streaming UI)
8. Main: Tag message with model_used='frontier:claude-opus-4'
9. Main: Extract memories, sync
```

### Render-Critique Loop (The Kraken Sees)

```
1. User: "Check how this page looks"
2. Companion: Launch Playwright headless browser
3. Playwright MCP: navigate(url) --> screenshot + accessibility_tree
4. Router: accessibility_tree --> local model for quick critique
5. If issues found OR user wants deep review:
   --> screenshot + context --> frontier vision model
6. Companion: Display annotated feedback in UI
7. Optional: "Want me to fix these?" --> code edit --> re-render --> re-critique
```

---

## Suggested Build Order

Build order is driven by dependency chains and the principle of "useful at every stage."

### Phase 1: Core Loop (Weeks 1-3)
**Goal:** Chat with a local model in a desktop window.

Build:
1. Electron shell with React renderer
2. Ollama integration (electron-ollama pattern: detect/install/manage)
3. Basic chat UI (streaming responses)
4. First-run onboarding (model download wizard)
5. SQLite conversation storage

**Why first:** This is the minimum viable companion. Everything else layers on top.

### Phase 2: Two-Brain Intelligence (Weeks 4-5)
**Goal:** Smart routing between local and frontier models.

Build:
1. Router heuristics (classify local vs frontier)
2. kr8tiv API gateway integration for frontier calls
3. Tailscale client integration (secure tunnel to kr8tiv services)
4. Escalation UX (show when frontier is being used, token budget)
5. Model indicator in chat UI

**Why second:** Without routing, the companion is just a local chatbot. The two-brain architecture is the core differentiator.

### Phase 3: Memory System (Weeks 6-7)
**Goal:** Companion remembers across conversations.

Build:
1. Memory extraction pipeline (identify facts/preferences from conversations)
2. Local embedding generation (Ollama /api/embeddings)
3. SQLite memory tables + vector search
4. Memory-augmented prompts (inject relevant memories into context)
5. Supermemory cloud sync (background, offline-first)

**Why third:** Memory transforms it from stateless chat to an actual companion.

### Phase 4: Voice (Weeks 8-9)
**Goal:** The companion speaks.

Build:
1. Pocket TTS integration (WASM or Python subprocess)
2. Sentence boundary detection for streaming TTS
3. Audio playback pipeline (Web Audio API)
4. Voice selection UI + voice sample management
5. Push-to-talk and voice activity detection for input

**Why fourth:** Voice is personality, not functionality. The companion must be useful before it's expressive.

### Phase 5: Tool Use / MCP (Weeks 10-12)
**Goal:** The companion can act, not just talk.

Build:
1. MCP client implementation in orchestration layer
2. Filesystem MCP server
3. Memory MCP server (expose memory system as tools)
4. Playwright MCP server (browser automation)
5. kr8tiv platform MCP server
6. Tool approval UX

**Why fifth:** Tools require a stable chat loop, router, and memory system. MCP integration is the extensibility layer.

### Phase 6: The Kraken Sees (Weeks 13-14)
**Goal:** Visual render-critique capability.

Build:
1. Playwright headless browser management
2. Accessibility tree extraction pipeline
3. Critique prompt engineering (local + frontier paths)
4. Annotated feedback UI
5. Auto-fix loop (optional, depends on code MCP server)

**Why sixth:** Depends on both MCP (Playwright server) and two-brain (vision needs frontier).

### Phase 7: Distribution (Weeks 15-16)
**Goal:** Installable product.

Build:
1. NSIS installer (electron-builder)
2. Code signing (Windows + macOS)
3. Auto-update mechanism
4. Model update manifest + pull pipeline
5. Onboarding flow polish

**Why last:** Don't optimize distribution until the product is worth distributing.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Bundling the LLM in the Installer
**What:** Shipping a 4-5GB model inside the installer executable.
**Why bad:** 5GB+ download kills conversion. Antivirus flags large executables. Can't update model independently.
**Instead:** Thin installer + first-run model download with progress UI.

### Anti-Pattern 2: Direct Frontier API Calls from Client
**What:** Embedding Anthropic/OpenAI API keys in the Electron app.
**Why bad:** Keys are extractable from Electron apps. No usage control. No billing aggregation.
**Instead:** All frontier calls go through kr8tiv API gateway via Tailscale tunnel. Device identity = auth.

### Anti-Pattern 3: Screenshot-Only Visual Critique
**What:** Always sending full screenshots to the vision model for page critique.
**Why bad:** 100KB+ per screenshot, requires vision model (frontier-only), slow, expensive.
**Instead:** Accessibility tree first (2-5KB, local model capable), screenshots only for frontier escalation.

### Anti-Pattern 4: Synchronous Memory Sync
**What:** Blocking on cloud sync before responding to user.
**Why bad:** Network latency in the hot path. App feels slow when offline.
**Instead:** Offline-first. Local SQLite is source of truth. Cloud sync is background, eventual.

### Anti-Pattern 5: Single Global Ollama Instance
**What:** Sharing the system Ollama with the companion app.
**Why bad:** Model conflicts, port conflicts, user confusion about which models are for what.
**Instead:** Managed Ollama lifecycle. Detect existing instance but prefer app-managed. Separate model namespace.

---

## Scalability Considerations

| Concern | Single User | 100 Users | 10K Users |
|---------|-------------|-----------|-----------|
| Inference | Local Ollama | Local Ollama | Local Ollama (no server cost) |
| Frontier calls | Direct via Tailscale | kr8tiv API gateway | Load-balanced API gateway |
| Memory sync | Direct Supermemory | Direct Supermemory | Supermemory handles scale |
| Model updates | Direct CDN pull | CDN with regional cache | CDN + P2P for large models |
| Tailscale | Single tailnet | Shared tailnet | Per-org tailnets |

The local-first architecture means infrastructure cost scales with frontier usage, not user count. 80% of queries hitting local models means the kr8tiv backend only handles the 20% that need frontier intelligence.

---

## Sources

- [Ollama API and Architecture](https://deepwiki.com/ollama/ollama) -- HIGH confidence
- [electron-ollama bundling pattern](https://github.com/antarasi/electron-ollama) -- HIGH confidence
- [Multi-LLM Routing Architecture](https://api7.ai/blog/multi-llm-routing-ai-gateway-qwen) -- MEDIUM confidence
- [Local-Cloud Router Energy Savings](https://arxiv.org/html/2511.07885v3) -- HIGH confidence
- [MCP v2.1 Specification](https://modelcontextprotocol.io/specification/2025-11-25) -- HIGH confidence
- [MCP Architecture Deep Dive](https://dasroot.net/posts/2026/04/model-context-protocol-mcp-technical-deep-dive/) -- MEDIUM confidence
- [Playwright MCP for AI Browser Automation](https://testdino.com/blog/playwright-mcp/) -- HIGH confidence
- [Kyutai Pocket TTS](https://kyutai.org/tts) -- HIGH confidence
- [Pocket TTS GitHub](https://github.com/kyutai-labs/pocket-tts) -- HIGH confidence
- [Supermemory Architecture](https://supermemory.ai/blog/memory-engine/) -- MEDIUM confidence
- [SQLite Sync CRDT Pattern](https://github.com/sqliteai/sqlite-sync/) -- MEDIUM confidence
- [Tailscale Mesh Networking](https://tailscale.com/docs/concepts/what-is-tailscale) -- HIGH confidence
- [Electron Builder NSIS](https://www.electron.build/nsis.html) -- HIGH confidence
- [Ollama Model Management](https://oneuptime.com/blog/post/2026-02-02-ollama-model-management/view) -- HIGH confidence
