/**
 * Heartbeat & Recovery Routes
 *
 * Receives heartbeats from local KIN instances, serves health dashboard
 * data, and provides recovery/snapshot endpoints.
 *
 * POST   /heartbeat               Receive heartbeat from local KIN
 * GET    /heartbeat/status        Health dashboard data for authenticated user
 * GET    /heartbeat/history       Last 24h of heartbeat events
 * POST   /recovery/snapshot       Trigger manual recovery snapshot
 * GET    /recovery/snapshots      List available snapshots
 * POST   /recovery/restore/:id   Restore from snapshot (reset error counters)
 */

import { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HeartbeatBody {
  kinId: string;
  timestamp: number;
  services: Record<string, 'ok' | 'warn' | 'error'>;
  ollamaModel?: string;
  systemInfo?: {
    os?: string;
    cpuUsagePercent?: number;
    memUsedMB?: number;
    memTotalMB?: number;
    diskFreeMB?: number;
    uptimeSeconds?: number;
  };
  version?: string;
}

interface ServiceStatusRow {
  name: string;
  status: 'ok' | 'warn' | 'error';
}

// Timeout: 3 missed beats (30s each) = 90s
const HEARTBEAT_TIMEOUT_MS = parseInt(
  process.env.HEARTBEAT_TIMEOUT_MS ?? '90000',
  10,
);

// Service display labels
const SERVICE_LABELS: Record<string, string> = {
  ollama: 'Ollama (Local LLM)',
  whisper: 'Whisper (Speech-to-Text)',
  xtts: 'XTTS (Text-to-Speech)',
  piper: 'Piper (TTS Fallback)',
  telegram: 'Telegram Bot',
  discord: 'Discord Bot',
  whatsapp: 'WhatsApp Bot',
  api: 'API Server',
};

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

// JSON Schema for heartbeat validation
const heartbeatSchema = {
  type: 'object' as const,
  required: ['kinId', 'timestamp', 'services'],
  properties: {
    kinId: { type: 'string' as const, minLength: 1, maxLength: 128 },
    timestamp: { type: 'number' as const },
    services: { type: 'object' as const },
    ollamaModel: { type: 'string' as const, maxLength: 128 },
    systemInfo: { type: 'object' as const },
    version: { type: 'string' as const, maxLength: 32 },
  },
  additionalProperties: false,
};

const heartbeatRoutes: FastifyPluginAsync = async (fastify) => {

  // ── POST /heartbeat ──────────────────────────────────────────────────
  // Receive heartbeat from local KIN. UPSERT into heartbeats table.
  fastify.post<{ Body: HeartbeatBody }>('/heartbeat', {
    schema: { body: heartbeatSchema },
  } as any, async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;
    const {
      kinId,
      timestamp,
      services = {},
      ollamaModel,
      systemInfo,
      version,
    } = request.body;

    if (!kinId || typeof kinId !== 'string') {
      return reply.badRequest('kinId is required');
    }

    const now = Date.now();
    const servicesJson = JSON.stringify(services);
    const systemInfoJson = systemInfo ? JSON.stringify(systemInfo) : null;
    const ip = request.ip;
    const heartbeatId = `hb-${crypto.randomUUID()}`;

    // UPSERT: update if kin_id exists, insert otherwise
    const existing = fastify.context.db.prepare(
      `SELECT id, services FROM heartbeats WHERE kin_id = ?`,
    ).get(kinId) as any;

    if (existing) {
      fastify.context.db.prepare(`
        UPDATE heartbeats
        SET last_seen_at = ?, ip_address = ?, services = ?,
            ollama_model = ?, system_info = ?, version = ?
        WHERE kin_id = ?
      `).run(timestamp || now, ip, servicesJson, ollamaModel ?? null, systemInfoJson, version ?? null, kinId);

      // Detect state transitions for alerting
      try {
        const oldServices = JSON.parse(existing.services || '{}');
        for (const [svc, newStatus] of Object.entries(services)) {
          const oldStatus = oldServices[svc];
          if (oldStatus && oldStatus !== newStatus) {
            // Log state transition
            fastify.log.info(
              `[Heartbeat] ${kinId}: ${svc} ${oldStatus} → ${newStatus}`,
            );
          }
        }
      } catch {
        // Non-fatal: old services JSON was corrupt
      }
    } else {
      fastify.context.db.prepare(`
        INSERT INTO heartbeats (id, kin_id, user_id, last_seen_at, ip_address, services, ollama_model, system_info, version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(heartbeatId, kinId, userId, timestamp || now, ip, servicesJson, ollamaModel ?? null, systemInfoJson, version ?? null);
    }

    return { ack: true, serverTime: now };
  });

  // ── GET /heartbeat/status ──────────────────────────────────────────────
  // Health dashboard data for the authenticated user.
  fastify.get('/heartbeat/status', async (request) => {
    const userId = (request.user as { userId: string }).userId;
    const now = Date.now();

    // Get the most recent heartbeat for this user
    const heartbeat = fastify.context.db.prepare(`
      SELECT kin_id, last_seen_at, ip_address, services, ollama_model,
             system_info, version
      FROM heartbeats
      WHERE user_id = ?
      ORDER BY last_seen_at DESC
      LIMIT 1
    `).get(userId) as any;

    if (!heartbeat) {
      return {
        overallStatus: 'offline',
        lastHeartbeat: null,
        latencyMs: 0,
        kinVersion: null,
        services: [],
        system: {
          cpuUsagePercent: 0,
          memUsedMB: 0,
          memTotalMB: 0,
          diskFreeMB: 0,
          uptimeSeconds: 0,
        },
        recentEvents: [],
      };
    }

    const lastSeenAt = heartbeat.last_seen_at;
    const timeSinceHeartbeat = now - lastSeenAt;
    const isOnline = timeSinceHeartbeat < HEARTBEAT_TIMEOUT_MS;

    // Parse services
    let servicesMap: Record<string, string> = {};
    try {
      servicesMap = JSON.parse(heartbeat.services || '{}');
    } catch { /* empty */ }

    // Parse system info
    let systemInfo: any = {};
    try {
      systemInfo = JSON.parse(heartbeat.system_info || '{}');
    } catch { /* empty */ }

    // Determine overall status
    const serviceStatuses = Object.values(servicesMap);
    const hasError = serviceStatuses.includes('error');
    const hasWarn = serviceStatuses.includes('warn');

    let overallStatus: 'healthy' | 'degraded' | 'offline' = 'healthy';
    if (!isOnline) {
      overallStatus = 'offline';
    } else if (hasError) {
      overallStatus = 'degraded';
    } else if (hasWarn) {
      overallStatus = 'degraded';
    }

    // Build service list
    const services = Object.entries(servicesMap).map(([name, status]) => ({
      name,
      status: status as 'ok' | 'warn' | 'error',
      detail: status === 'ok' ? 'Running' : status === 'warn' ? 'Degraded' : 'Offline',
      label: SERVICE_LABELS[name] ?? name,
    }));

    return {
      overallStatus,
      lastHeartbeat: new Date(lastSeenAt).toISOString(),
      latencyMs: isOnline ? Math.round(timeSinceHeartbeat) : 0,
      kinVersion: heartbeat.version ?? null,
      services,
      system: {
        cpuUsagePercent: systemInfo.cpuUsagePercent ?? 0,
        memUsedMB: systemInfo.memUsedMB ?? 0,
        memTotalMB: systemInfo.memTotalMB ?? 0,
        diskFreeMB: systemInfo.diskFreeMB ?? 0,
        uptimeSeconds: systemInfo.uptimeSeconds ?? 0,
      },
      recentEvents: [], // Populated when state transition logging is added
    };
  });

  // ── GET /heartbeat/history ──────────────────────────────────────────────
  // Returns all heartbeat records for the user (most recent first).
  fastify.get('/heartbeat/history', async (request) => {
    const userId = (request.user as { userId: string }).userId;

    const rows = fastify.context.db.prepare(`
      SELECT kin_id, last_seen_at, services, version
      FROM heartbeats
      WHERE user_id = ?
      ORDER BY last_seen_at DESC
      LIMIT 100
    `).all(userId) as any[];

    return rows.map((r) => ({
      kinId: r.kin_id,
      lastSeenAt: new Date(r.last_seen_at).toISOString(),
      services: JSON.parse(r.services || '{}'),
      version: r.version,
    }));
  });

  // ── POST /recovery/snapshot ─────────────────────────────────────────────
  // Trigger a manual recovery snapshot. Counts conversations, messages, memories.
  fastify.post('/recovery/snapshot', async (request) => {
    const userId = (request.user as { userId: string }).userId;

    // Get the user's kin_id from heartbeats
    const heartbeat = fastify.context.db.prepare(`
      SELECT kin_id FROM heartbeats WHERE user_id = ? ORDER BY last_seen_at DESC LIMIT 1
    `).get(userId) as any;

    const kinId = heartbeat?.kin_id ?? `local-${userId}`;

    // Count data
    const convCount = (fastify.context.db.prepare(
      `SELECT COUNT(*) as c FROM conversations WHERE user_id = ?`,
    ).get(userId) as any)?.c ?? 0;

    const msgCount = (fastify.context.db.prepare(`
      SELECT COUNT(*) as c FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.user_id = ?
    `).get(userId) as any)?.c ?? 0;

    const memCount = (fastify.context.db.prepare(
      `SELECT COUNT(*) as c FROM memories WHERE user_id = ?`,
    ).get(userId) as any)?.c ?? 0;

    const snapshotId = `snap-${crypto.randomUUID()}`;
    const now = Date.now();

    fastify.context.db.prepare(`
      INSERT INTO recovery_snapshots
        (id, kin_id, user_id, snapshot_type, conversation_count, message_count, memory_count, status, created_at)
      VALUES (?, ?, ?, 'manual', ?, ?, ?, 'valid', ?)
    `).run(snapshotId, kinId, userId, convCount, msgCount, memCount, now);

    return {
      id: snapshotId,
      snapshotType: 'manual',
      conversationCount: convCount,
      messageCount: msgCount,
      memoryCount: memCount,
      status: 'valid',
      createdAt: new Date(now).toISOString(),
    };
  });

  // ── GET /recovery/snapshots ─────────────────────────────────────────────
  // List available recovery snapshots for the authenticated user.
  fastify.get('/recovery/snapshots', async (request) => {
    const userId = (request.user as { userId: string }).userId;

    const rows = fastify.context.db.prepare(`
      SELECT id, kin_id, snapshot_type, conversation_count, message_count,
             memory_count, status, created_at, metadata
      FROM recovery_snapshots
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(userId) as any[];

    return rows.map((r) => ({
      id: r.id,
      kinId: r.kin_id,
      snapshotType: r.snapshot_type,
      conversationCount: r.conversation_count,
      messageCount: r.message_count,
      memoryCount: r.memory_count,
      status: r.status,
      createdAt: new Date(r.created_at).toISOString(),
      metadata: r.metadata ? JSON.parse(r.metadata) : null,
    }));
  });

  // ── POST /recovery/restore/:id ──────────────────────────────────────────
  // "Restore" from a snapshot — reset error counters, mark KIN healthy.
  // Data (messages, memories, conversations) is NEVER deleted.
  fastify.post<{ Params: { id: string } }>(
    '/recovery/restore/:id',
    async (request, reply) => {
      const userId = (request.user as { userId: string }).userId;
      const { id: snapshotId } = request.params;

      const snapshot = fastify.context.db.prepare(`
        SELECT id, kin_id, status FROM recovery_snapshots
        WHERE id = ? AND user_id = ?
      `).get(snapshotId, userId) as any;

      if (!snapshot) {
        return reply.notFound('Snapshot not found');
      }

      if (snapshot.status !== 'valid') {
        return reply.badRequest(`Snapshot is in "${snapshot.status}" state`);
      }

      // Mark snapshot as restoring
      fastify.context.db.prepare(`
        UPDATE recovery_snapshots SET status = 'restoring' WHERE id = ?
      `).run(snapshotId);

      // Reset the heartbeat services to 'ok' (clears error state)
      fastify.context.db.prepare(`
        UPDATE heartbeats
        SET services = '{}', last_seen_at = ?
        WHERE kin_id = ? AND user_id = ?
      `).run(Date.now(), snapshot.kin_id, userId);

      // Mark snapshot as restored
      fastify.context.db.prepare(`
        UPDATE recovery_snapshots SET status = 'restored' WHERE id = ?
      `).run(snapshotId);

      return {
        success: true,
        message: 'Recovery complete. Error counters reset. All data preserved.',
      };
    },
  );
};

export default heartbeatRoutes;
