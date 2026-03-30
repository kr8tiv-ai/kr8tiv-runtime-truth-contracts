/**
 * Recovery — Snapshot/restore logic for corrupted state.
 *
 * Key principle: Data (messages, memories, conversations) is NEVER deleted.
 * Recovery only resets error counters and metadata.
 *
 * SQLite WAL mode makes the DB inherently crash-safe — corruption is
 * extremely rare. This module provides a safety net for edge cases.
 *
 * Usage:
 *   import { RecoveryManager } from './runtime/recovery.js';
 *   const recovery = new RecoveryManager(db);
 *   const snapshot = recovery.createSnapshot('kin-1', 'user-123');
 *   recovery.restoreFromSnapshot(snapshot.id);
 */

import crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface RecoverySnapshot {
  id: string;
  kinId: string;
  userId: string;
  snapshotType: 'auto' | 'manual' | 'pre_recovery';
  conversationCount: number;
  messageCount: number;
  memoryCount: number;
  status: 'valid' | 'restoring' | 'restored' | 'corrupt';
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface RecoveryResult {
  success: boolean;
  snapshotId: string;
  message: string;
  dataPreserved: {
    conversations: number;
    messages: number;
    memories: number;
  };
}

// ============================================================================
// Recovery Manager
// ============================================================================

export class RecoveryManager {
  private db: any; // better-sqlite3 Database instance

  constructor(db: any) {
    this.db = db;
  }

  // --------------------------------------------------------------------------
  // Snapshot Creation
  // --------------------------------------------------------------------------

  /**
   * Create a recovery snapshot. Counts all user data without modifying it.
   */
  createSnapshot(
    kinId: string,
    userId: string,
    type: 'auto' | 'manual' | 'pre_recovery' = 'manual',
  ): RecoverySnapshot {
    const convCount = (this.db.prepare(
      `SELECT COUNT(*) as c FROM conversations WHERE user_id = ?`,
    ).get(userId) as any)?.c ?? 0;

    const msgCount = (this.db.prepare(`
      SELECT COUNT(*) as c FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.user_id = ?
    `).get(userId) as any)?.c ?? 0;

    const memCount = (this.db.prepare(
      `SELECT COUNT(*) as c FROM memories WHERE user_id = ?`,
    ).get(userId) as any)?.c ?? 0;

    const snapshot: RecoverySnapshot = {
      id: `snap-${crypto.randomUUID()}`,
      kinId,
      userId,
      snapshotType: type,
      conversationCount: convCount,
      messageCount: msgCount,
      memoryCount: memCount,
      status: 'valid',
      createdAt: Date.now(),
    };

    this.db.prepare(`
      INSERT INTO recovery_snapshots
        (id, kin_id, user_id, snapshot_type, conversation_count, message_count,
         memory_count, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      snapshot.id,
      snapshot.kinId,
      snapshot.userId,
      snapshot.snapshotType,
      snapshot.conversationCount,
      snapshot.messageCount,
      snapshot.memoryCount,
      snapshot.status,
      snapshot.createdAt,
    );

    console.log(
      `[Recovery] Snapshot ${snapshot.id}: ${convCount} conversations, ${msgCount} messages, ${memCount} memories`,
    );

    return snapshot;
  }

  // --------------------------------------------------------------------------
  // Restore
  // --------------------------------------------------------------------------

  /**
   * "Restore" from a snapshot — resets error counters without touching data.
   * Returns details of what was preserved.
   */
  restoreFromSnapshot(snapshotId: string): RecoveryResult {
    const snapshot = this.db.prepare(`
      SELECT * FROM recovery_snapshots WHERE id = ?
    `).get(snapshotId) as any;

    if (!snapshot) {
      return {
        success: false,
        snapshotId,
        message: 'Snapshot not found',
        dataPreserved: { conversations: 0, messages: 0, memories: 0 },
      };
    }

    if (snapshot.status !== 'valid') {
      return {
        success: false,
        snapshotId,
        message: `Snapshot is in "${snapshot.status}" state`,
        dataPreserved: { conversations: 0, messages: 0, memories: 0 },
      };
    }

    // Create a pre-recovery snapshot first (safety net)
    this.createSnapshot(snapshot.kin_id, snapshot.user_id, 'pre_recovery');

    // Mark snapshot as restoring
    this.db.prepare(`
      UPDATE recovery_snapshots SET status = 'restoring' WHERE id = ?
    `).run(snapshotId);

    // Reset heartbeat error state
    this.db.prepare(`
      UPDATE heartbeats SET services = '{}', last_seen_at = ? WHERE kin_id = ?
    `).run(Date.now(), snapshot.kin_id);

    // Count current data (should match or exceed snapshot counts)
    const currentConvs = (this.db.prepare(
      `SELECT COUNT(*) as c FROM conversations WHERE user_id = ?`,
    ).get(snapshot.user_id) as any)?.c ?? 0;

    const currentMsgs = (this.db.prepare(`
      SELECT COUNT(*) as c FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.user_id = ?
    `).get(snapshot.user_id) as any)?.c ?? 0;

    const currentMems = (this.db.prepare(
      `SELECT COUNT(*) as c FROM memories WHERE user_id = ?`,
    ).get(snapshot.user_id) as any)?.c ?? 0;

    // Mark snapshot as restored
    this.db.prepare(`
      UPDATE recovery_snapshots SET status = 'restored' WHERE id = ?
    `).run(snapshotId);

    console.log(
      `[Recovery] Restored from ${snapshotId}. Data preserved: ${currentConvs} convs, ${currentMsgs} msgs, ${currentMems} mems`,
    );

    return {
      success: true,
      snapshotId,
      message: 'Recovery complete. All data preserved. Error counters reset.',
      dataPreserved: {
        conversations: currentConvs,
        messages: currentMsgs,
        memories: currentMems,
      },
    };
  }

  // --------------------------------------------------------------------------
  // Integrity Check
  // --------------------------------------------------------------------------

  /**
   * Quick integrity check — verifies DB tables are readable.
   * Returns true if the database appears healthy.
   */
  checkIntegrity(userId: string): boolean {
    try {
      // Attempt reads from all critical tables
      this.db.prepare(`SELECT COUNT(*) FROM conversations WHERE user_id = ?`).get(userId);
      this.db.prepare(`SELECT COUNT(*) FROM memories WHERE user_id = ?`).get(userId);
      this.db.prepare(`SELECT COUNT(*) FROM users WHERE id = ?`).get(userId);
      return true;
    } catch (err) {
      console.error(`[Recovery] Integrity check failed for ${userId}:`, err);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // List Snapshots
  // --------------------------------------------------------------------------

  listSnapshots(userId: string, limit = 20): RecoverySnapshot[] {
    const rows = this.db.prepare(`
      SELECT * FROM recovery_snapshots
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, limit) as any[];

    return rows.map((r) => ({
      id: r.id,
      kinId: r.kin_id,
      userId: r.user_id,
      snapshotType: r.snapshot_type,
      conversationCount: r.conversation_count,
      messageCount: r.message_count,
      memoryCount: r.memory_count,
      status: r.status,
      createdAt: r.created_at,
      metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
    }));
  }
}
