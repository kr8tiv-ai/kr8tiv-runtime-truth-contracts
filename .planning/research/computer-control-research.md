# KIN/Cipher Remote Computer Control - Research

**Researched:** 2026-04-10
**Domain:** AI Agent Remote Desktop Control / Computer Use
**Confidence:** HIGH
**Author:** Matt Haynes (kr8tiv-ai)

## Summary

This research evaluates five architectural approaches for enabling KIN (an AI companion hosted on a remote server) to control a non-technical user's local computer. The core challenge is bridging a hosted AI service to a local machine while keeping setup trivial and security tight.

**Primary recommendation:** Build a **Tauri desktop agent app** that connects to the KIN server via persistent WebSocket. This is the only approach that achieves one-click install simplicity, full system access, cross-platform support, and a built-in approval UI -- all in a single package. Every other option either requires too much user configuration (Tailscale, Cloudflare Tunnel), is limited in scope (browser extension), or is insecure for non-technical users (SSH/RDP).

The desktop agent pattern is what the industry has converged on. Anthropic's Computer Use, Open Interpreter, and ByteDance's UI-TARS-desktop all use local agent processes. The only difference is whether the AI model runs locally or remotely -- in KIN's case it's remote, so the local agent just needs to be a thin execution layer with an approval UI.

---

## Option-by-Option Analysis

### Option 1: Tailscale + MCP Server

**How it works:** User installs Tailscale on their machine. KIN server also joins the same Tailnet. A local MCP server runs on the user's machine. KIN connects to it over the Tailscale mesh network.

| Criterion | Rating |
|-----------|--------|
| Setup difficulty | **6/10** -- Tailscale install is ~3 min, but user must: create account, authenticate via SSO, understand what a "tailnet" is, install + configure a separate MCP server process |
| Security | **Excellent** -- WireGuard encrypted P2P, no ports exposed to internet, identity-based access |
| Cross-platform | Windows, Mac, Linux, iOS, Android |
| Latency | **Low** -- Direct P2P WireGuard tunnel, ~1-5ms overhead |
| Capabilities | **Full system** -- MCP server can expose any tools (terminal, filesystem, browser, screenshots) |
| Maintenance | **Medium** -- Two separate processes to keep running (Tailscale + MCP server) |

**Pros:**
- Best-in-class security model (zero trust, no public exposure)
- Tailscale has a proven track record and good docs
- MCP is becoming the standard protocol for AI tool access (13,000+ servers on GitHub in 2025)
- [`tailscale-mcp-proxy`](https://github.com/jaxxstorm/tailscale-mcp-proxy) already exists as a Go bridge

**Cons:**
- Two separate installs for the user (Tailscale + MCP server)
- User needs to understand authentication flow
- MCP server needs to be configured and kept running (no built-in auto-start on Windows/Mac without extra work)
- If user's Tailscale session expires, KIN loses access silently
- No built-in approval UI -- you'd have to build one

**Verdict:** Great security, too many moving parts for newbies.

---

### Option 2: Cloudflare Tunnel + MCP Server

**How it works:** User runs `cloudflared` daemon that creates an outbound-only tunnel to Cloudflare's network. A local MCP server is exposed through this tunnel. KIN server connects to it via a Cloudflare-assigned URL.

| Criterion | Rating |
|-----------|--------|
| Setup difficulty | **7/10** -- Requires Cloudflare account, domain (for persistent tunnels), CLI installation, tunnel configuration |
| Security | **Good** -- Outbound-only connections, Cloudflare Access policies available, but MCP endpoint is technically on the internet behind Cloudflare |
| Cross-platform | Windows, Mac, Linux |
| Latency | **Medium** -- Traffic routes through Cloudflare edge (~10-50ms added) |
| Capabilities | **Full system** via MCP server |
| Maintenance | **Medium-High** -- cloudflared process + MCP server + domain/DNS management |

**Pros:**
- No open ports on user's machine (outbound only)
- Cloudflare's edge network adds DDoS protection
- Quick tunnels exist for testing (`trycloudflare.com` subdomain, no account needed)
- Zero Trust dashboard available for access policies

**Cons:**
- **Domain requirement** for persistent tunnels is a dealbreaker for non-tech users
- Quick tunnels are testing-only (200 concurrent request limit, no SSE support)
- Three things to manage: cloudflared, MCP server, Cloudflare dashboard
- If the tunnel drops, user must troubleshoot CLI tools
- No built-in approval UI

**Verdict:** Powerful for developers, terrible for non-tech end users. Domain requirement alone kills it.

---

### Option 3: Desktop Agent App (RECOMMENDED)

**How it works:** User downloads and installs a native desktop app (built with Tauri or Electron). The app runs in the system tray, connects to KIN's server via persistent WebSocket, receives commands, executes them locally, and sends results back. All approval dialogs happen in the app's native UI.

| Criterion | Rating |
|-----------|--------|
| Setup difficulty | **2/10** -- Download installer, run it, sign in. That's it. |
| Security | **Excellent** (if built right) -- Outbound WebSocket only, no ports exposed. Approval UI is local. Auth via KIN account token. |
| Cross-platform | Windows, Mac, Linux (Tauri 2.x also supports mobile) |
| Latency | **Low** -- Persistent WebSocket, ~5-20ms for command relay |
| Capabilities | **Full system** -- terminal, filesystem, browser automation, screenshots, app interaction |
| Maintenance | **Low** -- Auto-update built in. Single process. System tray keeps it running. |

**Recommended framework: Tauri 2.x over Electron**

| Factor | Tauri 2.x | Electron |
|--------|-----------|----------|
| Bundle size | 2-10 MB | 80-200 MB |
| Memory usage | 30-40 MB idle | 200-300 MB idle |
| Startup time | < 0.5s | 1-2s |
| Auto-update | Built-in (JSON manifest) | Built-in (Squirrel/electron-updater) |
| Native APIs | Rust plugins, system tray, notifications, filesystem | Full Node.js, mature ecosystem |
| Learning curve | Higher (Rust backend) | Lower (all JavaScript) |

**Architecture:**

```
+-------------------+          WebSocket (wss://)         +------------------+
|   KIN Server      | <=================================> |  Tauri Agent App |
|   (hosted API)    |    Commands / Results / Streams     |  (user's PC)     |
|                   |                                     |                  |
|  - AI Model       |    1. KIN sends command request     |  - Command exec  |
|  - Conversation   |    2. Agent shows approval dialog   |  - File manager  |
|  - Memory/Context |    3. User approves/denies          |  - Screenshot    |
|  - Tool routing   |    4. Agent executes locally        |  - Browser ctrl  |
+-------------------+    5. Agent sends result back       +------------------+
                                                          |  System Tray UI  |
                                                          |  - Status light  |
                                                          |  - Action log    |
                                                          |  - Kill switch   |
                                                          +------------------+
```

**Approval Gate System:**

```
Action Categories:
  GREEN  (auto-approve):  Read file, list directory, take screenshot, get system info
  YELLOW (notify + approve): Run terminal command, open URL, install package
  RED    (explicit confirm): Delete files, modify system settings, send data, execute scripts
  BLACK  (always block):  Format disk, disable firewall, access password stores
```

The approval dialog should show:
- Plain English description of what KIN wants to do
- The exact command/action
- "Allow" / "Allow Once" / "Deny" / "Always Allow This Type" buttons
- A 30-second auto-deny timeout for safety

**Pros:**
- **One-click install** -- exactly what non-tech users need
- Single process to manage (system tray app)
- Built-in approval UI -- no separate tool needed
- Auto-update keeps agent current without user action
- Outbound-only connection (no firewall/port issues)
- Full system access via Rust/Node.js backend
- Activity log gives users transparency
- Kill switch (disconnect button) gives users control

**Cons:**
- Most engineering effort upfront (build the app)
- Must maintain installers for Windows (.msi/.exe) and Mac (.dmg)
- Tauri requires Rust knowledge; Electron is JS-only but heavier
- Code signing required for both platforms ($99/yr Apple, ~$200-500/yr Windows EV cert)

**Verdict:** The clear winner for non-tech users. This is the pattern the entire industry has converged on.

---

### Option 4: Browser Extension

**How it works:** User installs a Chrome/Firefox extension. Extension communicates with KIN server, can control browser tabs, inject scripts, and relay commands.

| Criterion | Rating |
|-----------|--------|
| Setup difficulty | **1/10** -- Click "Add to Chrome". Easiest possible install. |
| Security | **Limited** -- Sandboxed to browser. Chrome's permission model. |
| Cross-platform | Any platform with Chrome/Firefox |
| Latency | **Low** -- Direct HTTPS/WebSocket to KIN server |
| Capabilities | **Browser only** -- Cannot run terminal commands, manage files, or control other apps without a companion process |
| Maintenance | **Low** -- Chrome Web Store handles updates |

**Pros:**
- Absolute easiest install (one click in Chrome Web Store)
- No OS-level permissions needed
- Browser sandbox provides security isolation
- Cross-platform by default

**Cons:**
- **Cannot control anything outside the browser** -- this is the fatal flaw
- To get system access, you need a Native Messaging Host (a separate binary), which brings you back to Option 3
- Extension review process (Chrome Web Store) adds deployment friction
- Manifest V3 limitations on background scripts (service workers only, no persistent connections without workarounds)
- Users must keep browser open for KIN to work

**Verdict:** Good as a supplementary tool alongside the desktop agent, but cannot be the primary control mechanism.

---

### Option 5: SSH/RDP

**How it works:** User enables SSH or RDP on their machine. KIN server connects directly (or via tunnel) to execute commands.

| Criterion | Rating |
|-----------|--------|
| Setup difficulty | **9/10** -- Enabling SSH/RDP, configuring firewalls, setting up port forwarding or tunnels, managing keys |
| Security | **Poor for this use case** -- Requires exposed ports or complex tunneling. Full system access with no approval gates. |
| Cross-platform | SSH: Mac/Linux native, Windows via OpenSSH. RDP: Windows native, Mac via client. |
| Latency | **Low** -- Direct connection |
| Capabilities | **Full system** (SSH: terminal only. RDP: full GUI) |
| Maintenance | **High** -- Port forwarding, dynamic IPs, firewall rules, key rotation |

**Pros:**
- Battle-tested protocols
- Full system access
- No custom software needed (built into OS)

**Cons:**
- **Absolutely not viable for non-tech users** -- even tech users struggle with SSH key management and port forwarding
- No approval gates (once connected, full access)
- Requires open ports or complex NAT traversal
- Dynamic IPs break connections
- RDP sessions lock the local screen (confusing for users)
- No built-in action logging or transparency

**Verdict:** Hard no. This is for sysadmins, not regular users.

---

## Comparison Matrix

| Criterion | Tailscale+MCP | CF Tunnel+MCP | Desktop Agent | Browser Ext | SSH/RDP |
|-----------|:---:|:---:|:---:|:---:|:---:|
| Setup (1=easiest) | 6 | 7 | **2** | **1** | 9 |
| Security | A+ | A | **A** | B | D |
| Cross-platform | A | A | **A** | A | B |
| Latency | A | B | **A** | A | A |
| Full system access | Yes | Yes | **Yes** | **No** | Yes |
| Approval gates | Build it | Build it | **Built-in** | Limited | None |
| Auto-update | No | No | **Yes** | Yes | N/A |
| Single install | No (2 things) | No (2+ things) | **Yes** | Yes | No |
| Maintenance | Medium | High | **Low** | Low | High |

**Winner: Desktop Agent App** -- It is the only option that scores well across ALL criteria.

---

## Existing Product Analysis

### Anthropic Computer Use
- **Architecture:** API-based. Claude model receives screenshots, returns mouse/keyboard actions. The execution environment is client-side -- Anthropic does NOT host the computer. You must provide the sandbox (Docker container, VM, or local machine).
- **How it connects:** There is no "remote connection" -- the computer_use tool runs in YOUR environment. The API call sends screenshots to Claude, Claude returns actions, your code executes them locally.
- **Key insight for KIN:** Anthropic's approach requires a local execution layer. This IS the desktop agent pattern. KIN would need the same -- a local process that captures screenshots, sends them to the AI, and executes returned actions.
- **Approval gates:** None built-in. Anthropic recommends building your own.
- **Source:** [Anthropic Computer Use Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)

### OpenAI Operator / ChatGPT Agent Mode
- **Architecture:** Initially a standalone product (Jan 2025), merged into ChatGPT as "agent mode" (Jul 2025), standalone deprecated (Aug 2025).
- **How it connects:** Browser-based. Operates within a cloud-hosted browser instance (not the user's local machine). The user watches via a stream.
- **Key insight for KIN:** Operator does NOT control the user's actual computer. It runs in a sandboxed cloud browser. This limits it to web tasks only. KIN wants more than this.
- **Approval gates:** Requires user confirmation for sensitive actions (purchases, emails).
- **Source:** [WorkOS Comparison](https://workos.com/blog/anthropics-computer-use-versus-openais-computer-using-agent-cua)

### Replit Agent
- **Architecture:** Multi-agent system with manager, editor, and verifier agents. Runs entirely within Replit's cloud environment.
- **How it connects:** No local connection needed -- everything runs in Replit's hosted workspace. The user interacts through the Replit web UI.
- **Key insight for KIN:** Replit constrains the agent to a controlled environment (their cloud IDE). This is the opposite of KIN's model. However, their tool DSL approach (Python-based, 30+ tools) and automatic checkpointing (commit on every step) are patterns worth adopting.
- **Approval gates:** Automatic commits let users "time travel" back if agent makes mistakes. More recovery-oriented than prevention-oriented.
- **Source:** [LangChain Case Study](https://www.langchain.com/breakoutagents/replit)

### Cursor / Windsurf
- **Architecture:** Modified VS Code (Electron-based). AI runs as an integrated feature within the editor. Local-first with API calls to AI model.
- **How it connects:** The app IS the local agent. AI features are built directly into the editor. Terminal commands, file edits, and code generation all happen locally.
- **Key insight for KIN:** Cursor proves the desktop agent model works at massive scale. Their approach: AI proposes changes, user reviews diffs, approves or rejects. This diff-review pattern is the gold standard for approval gates in code editing.
- **Approval gates:** Diff view before applying changes. User must accept/reject each edit.

### Open Interpreter
- **Architecture:** Python CLI/library that bridges LLMs to local code execution. Supports multiple LLM providers (OpenAI, Anthropic, Ollama, etc.).
- **How it connects:** Runs locally. The LLM connection is outbound API calls. Code execution happens in local Python, Node.js, or shell.
- **Key insight for KIN:** Open Interpreter is the closest existing product to what KIN needs, but it is developer-focused (CLI). Their architecture (LLM generates code -> local execution -> capture output -> feed back) is the exact pattern the KIN desktop agent should follow, wrapped in a friendly GUI.
- **Approval gates:** Prompts user in terminal before executing code. `-y` flag to auto-approve.
- **Source:** [Open Interpreter GitHub](https://github.com/openinterpreter/open-interpreter)

### UI-TARS Desktop (ByteDance)
- **Architecture:** Open-source desktop agent with Remote Computer Operator and Remote Browser Operator. Uses multimodal models for screen understanding.
- **Key insight for KIN:** They solved the remote control problem by building a desktop app that connects to remote machines. Their architecture validates the desktop agent approach.
- **Source:** [GitHub](https://github.com/bytedance/UI-TARS-desktop)

---

## Recommended Architecture for KIN

### The Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Desktop agent | **Tauri 2.x** | 2-10MB installer, 30MB RAM, Rust security, auto-update, system tray |
| Agent frontend | **React 19** (in Tauri webview) | Approval dialogs, action log, settings UI |
| Server connection | **WebSocket (wss://)** | Persistent, bidirectional, low-latency, reconnects automatically |
| Command execution | **Rust (via Tauri commands)** + **Node.js sidecar** for complex scripting | Rust for system ops, Node for flexibility |
| Screenshot capture | **Tauri screenshot plugin** or **Rust bindings to OS APIs** | Cross-platform screen capture |
| Browser automation | **Playwright** (bundled as sidecar) or **Chrome DevTools Protocol** | Programmatic browser control |
| Approval system | **Tauri dialog + custom React UI** | Native OS dialogs for critical actions, in-app for routine |
| Auth | **OAuth 2.0 PKCE flow** to KIN server | Secure, no secrets stored locally |

### Security Model

```
1. OUTBOUND ONLY -- Agent connects to KIN server, never the reverse.
   No open ports. No firewall configuration. No NAT traversal.

2. AUTH -- OAuth 2.0 PKCE flow. Token stored in OS keychain (Tauri
   has keychain plugin). Token refresh handled automatically.

3. TRANSPORT -- WebSocket over TLS (wss://). Certificate pinning
   for KIN's server certificate.

4. APPROVAL TIERS -- Every action classified GREEN/YELLOW/RED/BLACK.
   User can customize tier assignments. Defaults are conservative.

5. ACTION LOG -- Every action (approved or denied) logged locally.
   User can review full history. Optional: sync log to KIN server
   for the AI to learn user preferences.

6. KILL SWITCH -- System tray icon, one click to disconnect.
   Also: auto-disconnect after N minutes of inactivity.

7. SANDBOXING -- Terminal commands run in a restricted shell where
   possible. File operations limited to user home directory by default.
   User can expand scope in settings.
```

### WebSocket Protocol Design

```json
// KIN Server -> Agent: Action Request
{
  "type": "action_request",
  "id": "req_abc123",
  "action": "run_command",
  "params": {
    "command": "ls -la ~/Documents",
    "working_dir": "~"
  },
  "tier": "YELLOW",
  "description": "List files in your Documents folder",
  "timeout_ms": 30000
}

// Agent -> KIN Server: Approval Response
{
  "type": "action_response",
  "id": "req_abc123",
  "status": "approved",  // or "denied", "timeout", "modified"
  "result": {
    "stdout": "total 48\ndrwxr-xr-x  6 user  staff  192 Apr 10 12:00 .\n...",
    "stderr": "",
    "exit_code": 0
  }
}

// Agent -> KIN Server: Screenshot
{
  "type": "screenshot",
  "id": "ss_def456",
  "data": "<base64 encoded PNG>",
  "resolution": "1920x1080",
  "timestamp": "2026-04-10T12:00:00Z"
}

// Heartbeat (both directions)
{
  "type": "ping",
  "timestamp": "2026-04-10T12:00:00Z"
}
```

### Installation Flow for Non-Tech Users

```
1. User goes to kin.kr8tiv.ai/download
2. Site detects OS, shows big "Download for Windows" or "Download for Mac" button
3. User downloads installer (~5-10MB for Tauri)
4. Windows: Double-click .msi, click "Install", done.
   Mac: Drag .app to Applications, done.
5. App opens, shows "Sign in to KIN" button
6. OAuth flow opens browser, user logs in with their KIN account
7. App minimizes to system tray with green dot = "Connected"
8. Done. KIN can now send commands. User sees approval dialogs as needed.
```

Total user actions: **Download, Install, Sign In.** Three steps.

---

## Common Pitfalls

### Pitfall 1: WebSocket Disconnection Handling
**What goes wrong:** WebSocket drops silently (network change, sleep/wake, ISP hiccup). Agent appears connected but isn't.
**Why it happens:** WebSockets don't have built-in keep-alive at the protocol level.
**How to avoid:** Implement heartbeat ping/pong every 15s. Exponential backoff reconnection (1s, 2s, 4s, 8s... max 60s). Visual indicator in system tray (green=connected, yellow=reconnecting, red=disconnected).
**Warning signs:** Commands timing out, stale screenshots.

### Pitfall 2: Approval Fatigue
**What goes wrong:** Users get tired of approving every action and either disable approval entirely or stop reading dialogs.
**Why it happens:** Too many YELLOW-tier actions, or actions described in technical jargon users don't understand.
**How to avoid:** Keep GREEN tier generous for read-only operations. Use plain English descriptions ("KIN wants to see what's in your Documents folder"). Offer "Always allow this type" for repetitive safe actions. Track approval rate -- if user approves >95%, suggest upgrading those action types to GREEN.
**Warning signs:** Users clicking "allow all" or complaining about popups.

### Pitfall 3: Cross-Platform Shell Differences
**What goes wrong:** Commands that work on Mac fail on Windows (different paths, different shell syntax, different available tools).
**Why it happens:** The AI generates Unix commands but user is on Windows, or vice versa.
**How to avoid:** Agent reports OS to KIN server on connect. KIN includes OS context in AI prompts. Agent normalizes paths (forward/back slashes). Ship a minimal set of cross-platform tools (e.g., bundle `busybox` for Windows).
**Warning signs:** Commands failing with "command not found" or path errors.

### Pitfall 4: Lies-in-the-Loop Attack
**What goes wrong:** Malicious instructions embedded in AI prompts mislead users reviewing approval dialogs. The approval dialog shows a benign description but the actual command is harmful.
**Why it happens:** If the description shown to the user comes from the AI model, the model could be manipulated via prompt injection.
**How to avoid:** Description in approval dialog should be generated by the LOCAL agent based on parsing the actual command, NOT from the AI's description. Show the raw command alongside the friendly description. Color-code dangerous operations.
**Warning signs:** Description doesn't match the actual command.

### Pitfall 5: Code Signing and OS Gatekeeper
**What goes wrong:** Users can't install the app because Windows SmartScreen or macOS Gatekeeper blocks unsigned apps.
**Why it happens:** Missing or invalid code signing certificates.
**How to avoid:** Budget for code signing from day one. Apple Developer ($99/yr) + Windows EV code signing cert ($200-500/yr). Notarize Mac builds. Test on clean machines before release.
**Warning signs:** Users reporting "Windows protected your PC" or "app is damaged" errors.

---

## Hybrid Approach: Desktop Agent + Browser Extension

For maximum coverage, ship both:

1. **Desktop Agent (Tauri)** -- Primary. Full system control. Required install.
2. **Browser Extension (Chrome)** -- Optional. Enhanced browser control (DOM inspection, form filling, tab management). Communicates with the desktop agent via Chrome's Native Messaging API, NOT directly with KIN server.

This way the browser extension adds capabilities without being a separate connection to manage.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket management | Custom WS reconnection logic | `tokio-tungstenite` (Rust) + reconnection middleware | Edge cases around reconnection, buffering, backpressure |
| Screenshot capture | Raw OS API calls per platform | `xcap` crate (Rust) or Tauri screenshot plugin | Cross-platform nightmare with DPI scaling, multi-monitor |
| Browser automation | Selenium/custom CDP client | Playwright (via sidecar) | Handles browser lifecycle, waits, selectors properly |
| Auto-update | Custom update server | Tauri's built-in updater | Handles signatures, rollback, differential updates |
| OS keychain access | Direct keychain/credential store API | `tauri-plugin-stronghold` or `keytar` | OS-specific APIs are complex and security-sensitive |
| Process management | Custom daemon/service code | Tauri system tray + OS auto-start | Windows services and macOS LaunchAgents are complex |

---

## Open Questions

1. **MCP vs. Custom Protocol?**
   - MCP (Model Context Protocol) is becoming the standard for AI tool access (13,000+ servers in 2025). Should the desktop agent expose an MCP server internally, with the WebSocket bridge translating between KIN's protocol and MCP?
   - Recommendation: Yes, use MCP internally. This lets you leverage the existing MCP tool ecosystem and swap/add tools easily. The WebSocket layer is just transport.

2. **Screen Understanding vs. Structured Commands?**
   - Anthropic's Computer Use uses vision (screenshot -> pixel coordinates -> click). Open Interpreter uses structured commands (code generation -> execution). Which should KIN use?
   - Recommendation: **Both.** Default to structured commands (faster, more reliable, lower cost). Fall back to vision-based screen interaction when dealing with GUI-only apps that have no CLI/API.

3. **What about mobile (iOS/Android)?**
   - Tauri 2.x supports mobile. But mobile OS restrictions (sandboxing, no background processes, no system-level access) make computer control much harder.
   - Recommendation: Defer mobile. Focus on Windows + Mac desktop first.

4. **Offline capability?**
   - What happens when the user's internet drops? Should the agent have any local AI capability?
   - Recommendation: Minimal local capability (action log review, settings). Don't try to run the AI locally -- that's a completely different product.

---

## Sources

### Primary (HIGH confidence)
- [Anthropic Computer Use Tool Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool) -- Architecture, API design, capabilities
- [Tauri v2 Official Site](https://v2.tauri.app/) -- Framework capabilities, plugins, auto-update
- [Tauri WebSocket Plugin](https://v2.tauri.app/plugin/websocket/) -- WebSocket implementation
- [Open Interpreter GitHub](https://github.com/openinterpreter/open-interpreter) -- Local agent architecture
- [Tailscale MCP Proxy](https://github.com/jaxxstorm/tailscale-mcp-proxy) -- Tailscale + MCP bridge pattern
- [Tailscale MCP Blog](https://tailscale.com/blog/model-for-mcp-connectivity-lee-briggs) -- MCP security architecture
- [UI-TARS Desktop](https://github.com/bytedance/UI-TARS-desktop) -- Remote computer operator pattern
- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/) -- Tunnel architecture

### Secondary (MEDIUM confidence)
- [Tauri vs Electron 2026 Comparison](https://tech-insider.org/tauri-vs-electron-2026/) -- Bundle size, memory, startup benchmarks
- [Replit Agent Architecture (LangChain)](https://www.langchain.com/breakoutagents/replit) -- Multi-agent patterns, tool DSL
- [Liveblocks: Why WebSockets for AI Agents](https://liveblocks.io/blog/why-we-built-our-ai-agents-on-websockets-instead-of-http) -- WebSocket vs HTTP for agents
- [MCP WebSocket Architecture Guide](https://skywork.ai/skypage/en/A-Comprehensive-Guide-to-MCP-WebSocket-Servers-for-AI-Engineers/1972577355133153280) -- MCP transport patterns
- [Securing MCP Servers 2026 Guide](https://medium.com/@instatunnel/securing-mcp-servers-the-2026-guide-to-ai-tool-tunneling-aafa113b08db) -- Tunneling approaches compared
- [WorkOS: Anthropic vs OpenAI Computer Use](https://workos.com/blog/anthropics-computer-use-versus-openais-computer-using-agent-cua) -- Product comparison
- [Trustworthy AI Agents: HITL Governance](https://www.sakurasky.com/blog/missing-primitives-for-trustworthy-ai-part-16/) -- Approval gate design patterns

### Tertiary (LOW confidence)
- [Top 10 AI Desktop Agents 2026 (o-mega)](https://o-mega.ai/articles/top-10-ai-agents-for-desktop-automation-2026-mac-windows) -- Market overview
- [CSO: Lies-in-the-Loop Attack](https://www.csoonline.com/article/4108592/human-in-the-loop-isnt-enough-new-attack-turns-ai-safeguards-into-exploits.html) -- HITL security vulnerabilities
