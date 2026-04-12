# Phase 9: Memory & Intelligence - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Build persistent memory with privacy controls. Companion auto-remembers by default + user has a "memory panel" to see/delete what's stored. Supermemory cloud sync is opt-in.

Requirements covered: MEM-01 through MEM-04.

</domain>

<decisions>
## Implementation Decisions

### Auto-Remember + Privacy Controls (Both)
- Companion automatically remembers important context (design preferences, project details, learning progress)
- Shows "I remember you mentioned..." naturally in conversation
- User has a dedicated "Memory" panel in the UI:
  - See everything the companion remembers
  - Delete specific memories
  - Toggle auto-remember on/off
  - Export memory as JSON
  - Clear all memory with confirmation

### Memory Architecture
- **Local SQLite** — Primary storage, always available, survives offline
- **Supermemory cloud** — Opt-in sync for cross-device persistence
- Personal memory boundary: NEVER stores credentials, financial info, personal life details
- Memory categories: design preferences, project context, teaching progress, user preferences

### Privacy Controls
- Clear indicator when companion is "remembering" something
- Memory panel shows categories with counts
- One-click "forget everything" with in-character confirmation
- Companion respects deletion: "I won't remember that anymore"

### Claude's Discretion
- SQLite schema for memory storage
- Embedding model for semantic memory search
- Supermemory sync protocol
- Memory extraction algorithm (what to remember vs ignore)
- Rolling summarization for long-term memory compression

</decisions>

---
*Phase: 09-memory-intelligence | Context: 2026-04-12*
