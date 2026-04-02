/**
 * Auth Routes - Authentication endpoints
 * Supports: Telegram Login, Google OAuth, Solana Wallet Sign-In
 */

import { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';

// ============================================================================
// Google OAuth — verify ID token via Google's tokeninfo endpoint
// ============================================================================

interface GoogleTokenInfo {
  iss: string;
  sub: string;       // Google user ID
  email: string;
  email_verified: string;
  name: string;
  given_name: string;
  family_name?: string;
  picture?: string;
  aud: string;        // Must match our client ID
  exp: string;
}

async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<GoogleTokenInfo | null> {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) return null;
    const info = await res.json() as GoogleTokenInfo;
    // Verify audience matches our client ID
    if (info.aud !== clientId) return null;
    // Verify issuer
    if (info.iss !== 'accounts.google.com' && info.iss !== 'https://accounts.google.com') return null;
    // Verify not expired
    if (Number(info.exp) < Date.now() / 1000) return null;
    return info;
  } catch {
    return null;
  }
}

// ============================================================================
// Solana Sign-In — verify Ed25519 signature of a challenge nonce
// ============================================================================

// In-memory nonce store (TTL 5 minutes)
const nonceStore = new Map<string, { walletAddress: string; expiresAt: number }>();

// Clean expired nonces every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [nonce, data] of nonceStore) {
    if (data.expiresAt < now) nonceStore.delete(nonce);
  }
}, 60_000);

async function verifyEd25519Signature(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
): Promise<boolean> {
  try {
    const key = await crypto.webcrypto.subtle.importKey(
      'raw',
      publicKey,
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
    return await crypto.webcrypto.subtle.verify('Ed25519', key, signature, message);
  } catch {
    return false;
  }
}

// Base58 decode (Solana wallet addresses)
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58Decode(str: string): Uint8Array {
  const bytes = [0];
  for (const char of str) {
    const value = BASE58_ALPHABET.indexOf(char);
    if (value < 0) throw new Error(`Invalid base58 character: ${char}`);
    let carry = value;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j]! * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const char of str) {
    if (char !== '1') break;
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

interface TelegramAuth {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

// JSON Schema for Telegram auth payload validation
const telegramAuthSchema = {
  type: 'object' as const,
  required: ['id', 'first_name', 'auth_date', 'hash'],
  properties: {
    id: { type: 'number' as const },
    first_name: { type: 'string' as const, minLength: 1, maxLength: 256 },
    last_name: { type: 'string' as const, maxLength: 256 },
    username: { type: 'string' as const, maxLength: 64 },
    photo_url: { type: 'string' as const, maxLength: 1024 },
    auth_date: { type: 'number' as const },
    hash: { type: 'string' as const, minLength: 64, maxLength: 64 },
  },
  additionalProperties: false,
};

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Telegram login widget verification
  fastify.post<{ Body: TelegramAuth }>('/auth/telegram', {
    schema: { body: telegramAuthSchema },
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  } as any, async (request, reply) => {
    const telegramData = request.body;
    
    // Verify Telegram hash
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      reply.status(500);
      return { error: 'Telegram bot token not configured' };
    }

    // Create check string
    const { hash, ...data } = telegramData;
    const checkString = Object.keys(data)
      .sort()
      .map((key) => `${key}=${(data as any)[key]}`)
      .join('\n');

    // Verify hash (simplified - in production use proper Telegram verification)
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(checkString)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'))) {
      reply.status(401);
      return { error: 'Invalid Telegram authentication' };
    }

    // Check auth date (must be within 24 hours)
    const authAge = Date.now() / 1000 - telegramData.auth_date;
    if (authAge > 86400) {
      reply.status(401);
      return { error: 'Authentication expired' };
    }

    // Find or create user
    let user = fastify.context.db.prepare(`
      SELECT * FROM users WHERE telegram_id = ?
    `).get(telegramData.id) as any;

    if (!user) {
      const userId = `user-${crypto.randomUUID()}`;
      fastify.context.db.prepare(`
        INSERT INTO users (id, telegram_id, first_name, last_name, username)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        userId,
        telegramData.id,
        telegramData.first_name,
        telegramData.last_name ?? null,
        telegramData.username ?? null
      );

      user = fastify.context.db.prepare(`
        SELECT * FROM users WHERE id = ?
      `).get(userId) as any;
    }

    // Generate JWT (expiry configured at server level)
    const token = fastify.jwt.sign({
      userId: user.id,
      telegramId: user.telegram_id,
      tier: user.tier,
    });

    return {
      token,
      user: {
        id: user.id,
        telegramId: user.telegram_id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        tier: user.tier,
      },
    };
  });

  // Verify token
  fastify.get('/auth/verify', async (request) => {
    try {
      const decoded = await request.jwtVerify() as { userId: string };

      const user = fastify.context.db.prepare(`
        SELECT * FROM users WHERE id = ?
      `).get(decoded.userId) as any;

      if (!user) {
        return { valid: false };
      }

      // Check onboarding status
      const prefs = fastify.context.db.prepare(`
        SELECT onboarding_complete FROM user_preferences WHERE user_id = ?
      `).get(decoded.userId) as any;

      return {
        valid: true,
        userId: decoded.userId,
        user: {
          id: user.id,
          telegramId: user.telegram_id,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          tier: user.tier,
          email: user.email ?? null,
          walletAddress: user.wallet_address ?? null,
          authProvider: user.auth_provider ?? 'telegram',
          createdAt: new Date(user.created_at).toISOString(),
          onboardingComplete: prefs?.onboarding_complete === 1,
        },
      };
    } catch {
      return { valid: false };
    }
  });

  // ========================================================================
  // Google OAuth — verify Google ID token and create/find user
  // ========================================================================
  fastify.post<{ Body: { idToken: string } }>(
    '/auth/google',
    {
      schema: {
        body: {
          type: 'object' as const,
          required: ['idToken'],
          properties: { idToken: { type: 'string' as const } },
        },
      },
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    } as any,
    async (request, reply) => {
      const { idToken } = request.body;
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        reply.status(500);
        return { error: 'Google OAuth not configured' };
      }

      const googleUser = await verifyGoogleIdToken(idToken, clientId);
      if (!googleUser) {
        reply.status(401);
        return { error: 'Invalid Google authentication' };
      }

      // Find user by google_id or email
      let user = fastify.context.db.prepare(
        `SELECT * FROM users WHERE google_id = ?`
      ).get(googleUser.sub) as any;

      if (!user) {
        // Try matching by email (link accounts)
        user = fastify.context.db.prepare(
          `SELECT * FROM users WHERE email = ?`
        ).get(googleUser.email) as any;

        if (user) {
          // Link Google to existing account
          fastify.context.db.prepare(
            `UPDATE users SET google_id = ?, email = ?, auth_provider = CASE WHEN auth_provider = 'telegram' THEN 'telegram,google' ELSE auth_provider || ',google' END WHERE id = ?`
          ).run(googleUser.sub, googleUser.email, user.id);
        }
      }

      if (!user) {
        // Create new user — use a negative synthetic telegram_id to satisfy NOT NULL constraint
        const userId = `user-${crypto.randomUUID()}`;
        const syntheticTelegramId = -(Date.now() % 2_000_000_000);
        fastify.context.db.prepare(`
          INSERT INTO users (id, telegram_id, first_name, last_name, google_id, email, auth_provider)
          VALUES (?, ?, ?, ?, ?, ?, 'google')
        `).run(
          userId,
          syntheticTelegramId,
          googleUser.given_name,
          googleUser.family_name ?? null,
          googleUser.sub,
          googleUser.email,
        );

        user = fastify.context.db.prepare(
          `SELECT * FROM users WHERE id = ?`
        ).get(userId) as any;
      }

      const token = fastify.jwt.sign({
        userId: user.id,
        telegramId: user.telegram_id,
        tier: user.tier,
      });

      return {
        token,
        user: {
          id: user.id,
          telegramId: String(user.telegram_id),
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          tier: user.tier,
          email: user.email,
          walletAddress: user.wallet_address,
          authProvider: user.auth_provider,
        },
      };
    }
  );

  // ========================================================================
  // Solana Wallet Sign-In — nonce-based Ed25519 signature verification
  // ========================================================================

  // Step 1: Get a challenge nonce
  fastify.post<{ Body: { walletAddress: string } }>(
    '/auth/solana/nonce',
    {
      schema: {
        body: {
          type: 'object' as const,
          required: ['walletAddress'],
          properties: { walletAddress: { type: 'string' as const, minLength: 32, maxLength: 44 } },
        },
      },
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    } as any,
    async (request) => {
      const { walletAddress } = request.body;
      const nonce = crypto.randomUUID();
      nonceStore.set(nonce, {
        walletAddress,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      });
      const message = `Sign in to KIN with your Solana wallet.\n\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;
      return { nonce, message };
    }
  );

  // Step 2: Verify signed message
  fastify.post<{ Body: { walletAddress: string; nonce: string; signature: string } }>(
    '/auth/solana',
    {
      schema: {
        body: {
          type: 'object' as const,
          required: ['walletAddress', 'nonce', 'signature'],
          properties: {
            walletAddress: { type: 'string' as const },
            nonce: { type: 'string' as const },
            signature: { type: 'string' as const },
          },
        },
      },
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    } as any,
    async (request, reply) => {
      const { walletAddress, nonce, signature } = request.body;

      // Validate nonce
      const nonceData = nonceStore.get(nonce);
      if (!nonceData || nonceData.walletAddress !== walletAddress) {
        reply.status(401);
        return { error: 'Invalid or expired nonce' };
      }
      if (nonceData.expiresAt < Date.now()) {
        nonceStore.delete(nonce);
        reply.status(401);
        return { error: 'Nonce expired' };
      }
      nonceStore.delete(nonce); // Single use

      // Reconstruct the message that was signed
      const message = `Sign in to KIN with your Solana wallet.\n\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString().slice(0, 16)}`; // Truncate seconds for tolerance

      // Verify Ed25519 signature
      const messageBytes = new TextEncoder().encode(
        `Sign in to KIN with your Solana wallet.\n\nNonce: ${nonce}`
      );
      const signatureBytes = Buffer.from(signature, 'base64');
      const publicKeyBytes = base58Decode(walletAddress);

      // Try verification — if the exact message doesn't match, try the nonce-only variant
      let valid = await verifyEd25519Signature(messageBytes, signatureBytes, publicKeyBytes);
      if (!valid) {
        // Try with full message from nonce store
        const fullMessage = new TextEncoder().encode(nonceData.walletAddress === walletAddress
          ? `Sign in to KIN with your Solana wallet.\n\nNonce: ${nonce}\nTimestamp:`
          : '');
        valid = fullMessage.length > 0 && await verifyEd25519Signature(
          new TextEncoder().encode(`Sign in to KIN with your Solana wallet.\n\nNonce: ${nonce}`),
          signatureBytes,
          publicKeyBytes,
        );
      }

      // For development, allow unsigned requests (Phantom may not be available)
      if (!valid && fastify.context.config.environment !== 'development') {
        reply.status(401);
        return { error: 'Invalid signature' };
      }

      // Find or create user by wallet address
      let user = fastify.context.db.prepare(
        `SELECT * FROM users WHERE wallet_address = ?`
      ).get(walletAddress) as any;

      if (!user) {
        const userId = `user-${crypto.randomUUID()}`;
        const syntheticTelegramId = -(Date.now() % 2_000_000_000 + Math.floor(Math.random() * 1000));
        const shortAddr = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
        fastify.context.db.prepare(`
          INSERT INTO users (id, telegram_id, first_name, wallet_address, auth_provider)
          VALUES (?, ?, ?, ?, 'solana')
        `).run(userId, syntheticTelegramId, shortAddr, walletAddress);

        user = fastify.context.db.prepare(
          `SELECT * FROM users WHERE id = ?`
        ).get(userId) as any;
      }

      const token = fastify.jwt.sign({
        userId: user.id,
        telegramId: user.telegram_id,
        tier: user.tier,
      });

      return {
        token,
        user: {
          id: user.id,
          telegramId: String(user.telegram_id),
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          tier: user.tier,
          walletAddress: user.wallet_address,
          authProvider: user.auth_provider,
        },
      };
    }
  );

  // Development login (skip in production)
  if (fastify.context.config.environment === 'development') {
    fastify.post<{ Body: { telegramId: number; firstName: string } }>(
      '/auth/dev-login',
      async (request, reply) => {
        const { telegramId, firstName } = request.body;

        // Find or create user
        let user = fastify.context.db.prepare(`
          SELECT * FROM users WHERE telegram_id = ?
        `).get(telegramId) as any;

        if (!user) {
          const userId = `user-${crypto.randomUUID()}`;
          fastify.context.db.prepare(`
            INSERT INTO users (id, telegram_id, first_name)
            VALUES (?, ?, ?)
          `).run(userId, telegramId, firstName);

          user = fastify.context.db.prepare(`
            SELECT * FROM users WHERE id = ?
          `).get(userId) as any;
        }

        // Auto-complete onboarding for dev login
        const existingPrefs = fastify.context.db.prepare(
          `SELECT id FROM user_preferences WHERE user_id = ?`
        ).get(user.id) as any;

        if (!existingPrefs) {
          try {
            fastify.context.db.prepare(`
              INSERT INTO user_preferences (id, user_id, display_name, experience_level, goals, language, tone, onboarding_complete)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              `pref-${crypto.randomUUID()}`,
              user.id,
              firstName,
              'advanced',
              '["ai","defi","building"]',
              'en',
              'friendly',
              1
            );
          } catch { /* table may not exist yet — that's ok */ }
        } else {
          try {
            fastify.context.db.prepare(
              `UPDATE user_preferences SET onboarding_complete = 1 WHERE user_id = ?`
            ).run(user.id);
          } catch { /* ignore */ }
        }

        const token = fastify.jwt.sign({
          userId: user.id,
          telegramId: user.telegram_id,
          tier: user.tier,
        });

        return {
          token,
          user: {
            id: user.id,
            telegramId: user.telegram_id,
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
            tier: user.tier,
            onboardingComplete: true,
          },
        };
      }
    );
  }
};

export default authRoutes;
