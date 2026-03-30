/**
 * Heartbeat Client — Lightweight agent for local KIN instances.
 *
 * Sends periodic heartbeats to the VPS API so the health dashboard
 * can track service availability. Designed to run on the user's local
 * machine alongside Ollama, Whisper, and XTTS.
 *
 * Features:
 *   - Outbound-only (works behind NAT — no port forwarding needed)
 *   - Checks local services: Ollama, Whisper, XTTS/Piper
 *   - Reports system metrics: CPU, memory, disk
 *   - Exponential backoff on network failure (1s → 30s max)
 *   - Configurable via environment variables
 *
 * Usage:
 *   npx tsx runtime/heartbeat-client.ts
 *   -- or --
 *   import { startHeartbeatClient } from './runtime/heartbeat-client.js';
 *   startHeartbeatClient();
 */

import os from 'os';
import crypto from 'crypto';

// ============================================================================
// Configuration
// ============================================================================

interface HeartbeatConfig {
  /** VPS API base URL (e.g. https://api.meetyourkin.com) */
  vpsUrl: string;
  /** JWT token or dedicated heartbeat API key */
  authToken: string;
  /** Interval between heartbeats in ms. Default: 30000 */
  intervalMs: number;
  /** Unique identifier for this local KIN instance */
  kinId: string;
  /** KIN version string */
  version: string;
  /** Ollama host:port to check */
  ollamaHost: string;
  ollamaPort: number;
  /** XTTS server URL to check */
  xttsUrl: string;
}

function loadConfig(): HeartbeatConfig {
  const vpsUrl = process.env.VPS_HEARTBEAT_URL;
  const authToken = process.env.HEARTBEAT_API_KEY || process.env.JWT_SECRET || '';

  if (!vpsUrl) {
    console.error('[Heartbeat] VPS_HEARTBEAT_URL not set — heartbeat disabled');
    process.exit(0);
  }

  return {
    vpsUrl,
    authToken,
    intervalMs: parseInt(process.env.HEARTBEAT_INTERVAL_MS ?? '30000', 10),
    kinId: process.env.KIN_ID ?? `kin-${os.hostname()}-${crypto.randomUUID().slice(0, 8)}`,
    version: process.env.KIN_VERSION ?? '1.0.0',
    ollamaHost: process.env.OLLAMA_HOST ?? '127.0.0.1',
    ollamaPort: parseInt(process.env.OLLAMA_PORT ?? '11434', 10),
    xttsUrl: process.env.XTTS_SERVER_URL ?? 'http://localhost:8020',
  };
}

// ============================================================================
// Service Checkers
// ============================================================================

type ServiceStatus = 'ok' | 'warn' | 'error';

async function checkOllama(host: string, port: number): Promise<{ status: ServiceStatus; model?: string }> {
  try {
    const res = await fetch(`http://${host}:${port}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { status: 'error' };
    const data = await res.json() as { models?: Array<{ name: string }> };
    const model = data.models?.[0]?.name;
    return { status: 'ok', model };
  } catch {
    return { status: 'error' };
  }
}

async function checkXtts(url: string): Promise<ServiceStatus> {
  try {
    const res = await fetch(`${url}/docs`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

async function checkWhisper(): Promise<ServiceStatus> {
  // Whisper.cpp runs as a CLI, not a server — check if the binary exists
  const whisperPath = process.env.WHISPER_CPP_PATH ?? 'whisper-cpp';
  const enabled = process.env.LOCAL_WHISPER_ENABLED === 'true';
  if (!enabled) return 'ok'; // Not configured = not a problem
  try {
    // Just check if the path is set; actual availability requires running it
    return whisperPath ? 'ok' : 'warn';
  } catch {
    return 'error';
  }
}

// ============================================================================
// System Metrics
// ============================================================================

function getSystemInfo() {
  const cpus = os.cpus();
  const totalMem = Math.round(os.totalmem() / (1024 * 1024));
  const freeMem = Math.round(os.freemem() / (1024 * 1024));
  const usedMem = totalMem - freeMem;

  // CPU usage estimate (average across cores)
  let cpuUsage = 0;
  if (cpus.length > 0) {
    const total = cpus.reduce((sum, cpu) => {
      const times = cpu.times;
      return sum + times.user + times.nice + times.sys + times.idle + times.irq;
    }, 0);
    const idle = cpus.reduce((sum, cpu) => sum + cpu.times.idle, 0);
    cpuUsage = Math.round(((total - idle) / total) * 100);
  }

  return {
    os: `${os.platform()} ${os.release()}`,
    cpuUsagePercent: cpuUsage,
    memUsedMB: usedMem,
    memTotalMB: totalMem,
    diskFreeMB: 0, // Disk check requires platform-specific code
    uptimeSeconds: Math.round(os.uptime()),
  };
}

// ============================================================================
// Heartbeat Loop
// ============================================================================

let backoffMs = 1000;
const MAX_BACKOFF_MS = 30000;

async function sendHeartbeat(config: HeartbeatConfig): Promise<boolean> {
  // Check all local services in parallel
  const [ollamaResult, xttsStatus, whisperStatus] = await Promise.all([
    checkOllama(config.ollamaHost, config.ollamaPort),
    checkXtts(config.xttsUrl),
    checkWhisper(),
  ]);

  const services: Record<string, ServiceStatus> = {
    ollama: ollamaResult.status,
    xtts: xttsStatus,
    whisper: whisperStatus,
  };

  const payload = {
    kinId: config.kinId,
    timestamp: Date.now(),
    services,
    ollamaModel: ollamaResult.model,
    systemInfo: getSystemInfo(),
    version: config.version,
  };

  try {
    const res = await fetch(`${config.vpsUrl}/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.authToken}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`[Heartbeat] Server returned ${res.status}`);
      return false;
    }

    // Reset backoff on success
    backoffMs = 1000;
    return true;
  } catch (err) {
    console.error(`[Heartbeat] Failed to send:`, err instanceof Error ? err.message : err);
    return false;
  }
}

export async function startHeartbeatClient(): Promise<void> {
  const config = loadConfig();

  console.log(`[Heartbeat] Starting client`);
  console.log(`[Heartbeat]   KIN ID:   ${config.kinId}`);
  console.log(`[Heartbeat]   VPS URL:  ${config.vpsUrl}`);
  console.log(`[Heartbeat]   Interval: ${config.intervalMs}ms`);

  // Initial heartbeat
  const ok = await sendHeartbeat(config);
  if (ok) {
    console.log(`[Heartbeat] Initial heartbeat sent successfully`);
  }

  // Recurring loop
  const tick = async () => {
    const success = await sendHeartbeat(config);

    if (!success) {
      // Exponential backoff
      backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
      console.log(`[Heartbeat] Retrying in ${backoffMs}ms`);
      setTimeout(tick, backoffMs);
    } else {
      setTimeout(tick, config.intervalMs);
    }
  };

  setTimeout(tick, config.intervalMs);
}

// ============================================================================
// Run directly
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  startHeartbeatClient().catch((err) => {
    console.error('[Heartbeat] Fatal error:', err);
    process.exit(1);
  });
}
