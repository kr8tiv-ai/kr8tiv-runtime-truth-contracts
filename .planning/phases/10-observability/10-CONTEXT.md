# Phase 10: Observability - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Health dashboard, Ollama session management (memory leak mitigation), heartbeat monitoring, and opt-in telemetry to Mission Control.

Requirements covered: OBS-01 through OBS-04.

</domain>

<decisions>
## Implementation Decisions

### Health Dashboard
- Built into the desktop app (Tauri) and web dashboard
- Shows: local brain status, frontier availability, memory status, render loop status (Cipher)
- Color-coded: green (healthy), yellow (degraded), red (down)
- Companion announces degradation in-character (not technical error messages)

### Ollama Session Manager
- Research confirmed Ollama has memory leaks in long-running sessions
- Periodic session restart (every 4-6 hours or when memory exceeds threshold)
- Graceful restart: save context → restart Ollama → reload model → restore context
- User never notices — companion stays responsive

### Heartbeat Monitoring
- Per HEARTBEAT.md contract: check local brain, frontier, render loop, memory
- One notification per degradation event (no spam)
- Companion explains degradation naturally: "My cloud backup is down — I'll handle everything locally"

### Telemetry (Opt-In)
- Export metrics to Mission Control for prompt evolution
- Inference latency, escalation rate, user satisfaction, personality adherence
- Strictly opt-in with clear privacy explanation
- No conversation content ever sent — only aggregate metrics

### Health Dashboard: System Tray + Settings Panel (Both)
- **System tray:** Traffic light icon (green/yellow/red). Click to expand quick status.
- **Settings panel:** Full details — each component's status, latency, last check time.
- Both surfaces show the same data, different detail levels.

### Usage Stats: Companion Commentary
- Stats presented BY the companion in their voice:
  - Cipher: "We've built 12 websites together! Our best work was that Three.js portfolio — chef's kiss. 🐙"
  - Forge: "47 bugs squashed this month. Our debugging streak is 8 days. NICE! 🦄"
- Gamified: streaks, milestones, "level" progression
- Messages exchanged, hours chatted, topics explored, projects completed
- Weekly summary sent proactively (ties into Phase 4 smart proactive feature)

### Claude's Discretion
- Dashboard component architecture
- Ollama process monitoring implementation
- Metric collection and aggregation
- Mission Control API integration
- Gamification logic and milestone thresholds

</decisions>

---
*Phase: 10-observability | Context: 2026-04-12*
