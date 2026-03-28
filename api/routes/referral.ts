/**
 * Referral Routes - User referral system
 *
 * Uses the `referrals` table from the schema.
 * One row per referral code — a user may only hold one active code.
 * Redeeming a code creates a new referrals row (with referred_user_id set)
 * for the referrer. Referral codes never expire by default; expiry may be
 * added later via a `expires_at` column extension.
 */

import { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generates a short, URL-safe referral code: 8 uppercase alphanumeric chars */
function generateCode(): string {
  return crypto
    .randomBytes(6)
    .toString('base64url')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 8)
    .padEnd(8, '0');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RedeemBody {
  code: string;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const referralRoutes: FastifyPluginAsync = async (fastify) => {

  // -------------------------------------------------------------------------
  // GET /referral — get user's referral code and stats
  // -------------------------------------------------------------------------
  fastify.get('/referral', async (request) => {
    const userId = (request.user as { userId: string }).userId;

    // Find this user's own referral entry (where they are the referrer and no
    // referred_user_id, i.e. the "header" record that holds their code)
    const ownRecord = fastify.context.db.prepare(`
      SELECT referral_code, created_at
      FROM referrals
      WHERE referrer_user_id = ? AND referred_user_id IS NULL
      ORDER BY created_at ASC
      LIMIT 1
    `).get(userId) as any;

    if (!ownRecord) {
      return {
        referralCode: null,
        totalReferrals: 0,
        completedReferrals: 0,
        rewardsGranted: 0,
        createdAt: null,
      };
    }

    const code: string = ownRecord.referral_code;

    // Count referrals that used this code (rows where referred_user_id is set)
    const stats = fastify.context.db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN reward_granted = 1 THEN 1 ELSE 0 END) AS rewards
      FROM referrals
      WHERE referrer_user_id = ? AND referred_user_id IS NOT NULL
    `).get(userId) as any;

    return {
      referralCode: code,
      totalReferrals: stats.total ?? 0,
      completedReferrals: stats.completed ?? 0,
      rewardsGranted: stats.rewards ?? 0,
      createdAt: new Date(ownRecord.created_at).toISOString(),
    };
  });

  // -------------------------------------------------------------------------
  // POST /referral/generate — create code if user doesn't have one
  // -------------------------------------------------------------------------
  fastify.post('/referral/generate', async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;

    // Idempotent: return existing code if already present
    const existing = fastify.context.db.prepare(`
      SELECT referral_code FROM referrals
      WHERE referrer_user_id = ? AND referred_user_id IS NULL
      LIMIT 1
    `).get(userId) as any;

    if (existing) {
      return {
        referralCode: existing.referral_code,
        isNew: false,
      };
    }

    // Generate a unique code (retry if collision occurs)
    let code: string;
    let attempts = 0;
    do {
      code = generateCode();
      attempts++;
      if (attempts > 10) {
        reply.status(500);
        return { error: 'Failed to generate unique referral code' };
      }
      const collision = fastify.context.db.prepare(`
        SELECT 1 FROM referrals WHERE referral_code = ?
      `).get(code);
      if (!collision) break;
    } while (true);

    const id = `ref-${crypto.randomUUID()}`;
    fastify.context.db.prepare(`
      INSERT INTO referrals (id, referrer_user_id, referral_code, status)
      VALUES (?, ?, ?, 'pending')
    `).run(id, userId, code);

    reply.status(201);
    return { referralCode: code, isNew: true };
  });

  // -------------------------------------------------------------------------
  // POST /referral/redeem — redeem a referral code
  // -------------------------------------------------------------------------
  fastify.post<{ Body: RedeemBody }>('/referral/redeem', async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;
    const { code } = request.body ?? {};

    if (!code?.trim()) {
      reply.status(400);
      return { error: 'code is required' };
    }

    const normalizedCode = code.trim().toUpperCase();

    // Find the header record for this code
    const codeRecord = fastify.context.db.prepare(`
      SELECT id, referrer_user_id, status
      FROM referrals
      WHERE referral_code = ? AND referred_user_id IS NULL
      LIMIT 1
    `).get(normalizedCode) as any;

    if (!codeRecord) {
      reply.status(404);
      return { error: 'Referral code not found' };
    }

    // Self-referral check
    if (codeRecord.referrer_user_id === userId) {
      reply.status(400);
      return { error: 'You cannot redeem your own referral code' };
    }

    // Check if this user has already redeemed any code
    const alreadyRedeemed = fastify.context.db.prepare(`
      SELECT 1 FROM referrals
      WHERE referred_user_id = ?
      LIMIT 1
    `).get(userId);

    if (alreadyRedeemed) {
      reply.status(409);
      return { error: 'You have already redeemed a referral code' };
    }

    // Check if the code's status allows redemption (not expired)
    if (codeRecord.status === 'expired') {
      reply.status(410);
      return { error: 'This referral code has expired' };
    }

    // Create referral record
    const id = `ref-${crypto.randomUUID()}`;
    const now = Date.now();

    fastify.context.db.prepare(`
      INSERT INTO referrals
        (id, referrer_user_id, referred_user_id, referral_code, status, completed_at)
      VALUES (?, ?, ?, ?, 'completed', ?)
    `).run(id, codeRecord.referrer_user_id, userId, normalizedCode, now);

    return {
      success: true,
      message: 'Referral code redeemed successfully',
      referrerId: codeRecord.referrer_user_id,
    };
  });

  // -------------------------------------------------------------------------
  // GET /referral/leaderboard — top 10 referrers (anonymized)
  // -------------------------------------------------------------------------
  fastify.get('/referral/leaderboard', async () => {
    const rows = fastify.context.db.prepare(`
      SELECT
        r.referrer_user_id,
        u.first_name,
        u.last_name,
        COUNT(r.id) AS referral_count
      FROM referrals r
      JOIN users u ON r.referrer_user_id = u.id
      WHERE r.referred_user_id IS NOT NULL
        AND r.status = 'completed'
      GROUP BY r.referrer_user_id
      ORDER BY referral_count DESC
      LIMIT 10
    `).all() as any[];

    const leaderboard = rows.map((row, index) => {
      // Anonymize: show first name + last initial only
      const firstName: string = row.first_name ?? 'Anonymous';
      const lastInitial: string = row.last_name
        ? `${row.last_name.charAt(0).toUpperCase()}.`
        : '';

      return {
        rank: index + 1,
        displayName: lastInitial ? `${firstName} ${lastInitial}` : firstName,
        referralCount: row.referral_count,
      };
    });

    return { leaderboard };
  });
};

export default referralRoutes;
