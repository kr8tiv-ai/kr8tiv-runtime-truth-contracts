# Phase 8: Tailscale Networking - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Integrate Tailscale mesh networking so companions are accessible across devices and connected to kr8tiv services. Fully automated setup — user clicks one button.

Requirements covered: TAIL-01 through TAIL-04.

</domain>

<decisions>
## Implementation Decisions

### Fully Automated Setup (CRITICAL)
- Installer handles Tailscale install + authentication + mesh configuration
- User clicks ONE button: "Enable multi-device access"
- No terminal, no config files, no manual network setup
- Tailscale CLI wrapped from Node.js backend (no SDK exists)

### Device Mesh
- Access companion from phone/tablet/other PCs on same tailnet
- MagicDNS: companion discoverable at e.g., cipher.kin.local
- Web dashboard accessible from any tailnet device

### kr8tiv Service Tunnel
- Secure connection to Mission Control (prompt evolution, governance)
- Supermemory cloud sync (opt-in cross-device memory)
- Model update checks + LoRA adapter downloads
- Telemetry export (opt-in)

### Tailscale Auth: kr8tiv-Managed with User Option
- **Default:** User auto-joins kr8tiv's Tailscale network. Zero setup.
- **Advanced:** Power users can connect their own Tailscale account instead.
- kr8tiv manages the tailnet, handles provisioning, DNS routing.

### Device Discovery: Auto-Discover + Approve
- Companion detects new devices on the tailnet
- Asks user once: "A new device wants to connect — approve?"
- Once approved, device is remembered permanently
- User can revoke devices from settings panel

### Claude's Discretion
- Tailscale OAuth flow implementation
- MagicDNS configuration
- Firewall/NAT traversal handling
- Device fingerprinting for approval
- kr8tiv tailnet provisioning API

</decisions>

---
*Phase: 08-tailscale-networking | Context: 2026-04-12*
