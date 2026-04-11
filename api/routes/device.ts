/**
 * Device Routes — Desktop device pairing, status, and trust management.
 *
 * JWT-protected endpoints for managing the desktop computer control bridge.
 * Follows approvals.ts patterns for type safety, ownership enforcement,
 * and camelCase responses.
 *
 * @module api/routes/device
 */

import type { FastifyPluginAsync } from 'fastify';
import { getDeviceBridge } from '../../bot/skills/device-bridge.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrustLevelBody {
  confirm: boolean;
}

// ---------------------------------------------------------------------------
// Protected routes (require JWT)
// ---------------------------------------------------------------------------

const deviceRoutes: FastifyPluginAsync = async (fastify) => {
  const bridge = getDeviceBridge();

  // GET /device/status — returns current device connection status
  fastify.get('/device/status', async (request) => {
    const userId = (request.user as { userId: string }).userId;
    return bridge.getDeviceStatus(userId);
  });

  // POST /device/pair — generates a 6-digit pairing code
  fastify.post('/device/pair', async (request) => {
    const userId = (request.user as { userId: string }).userId;
    const pairing = bridge.generatePairingCode(userId);

    return {
      pairingCode: pairing.code,
      expiresAt: new Date(pairing.expiresAt).toISOString(),
    };
  });

  // POST /device/unpair — disconnects the paired device
  fastify.post('/device/unpair', async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;

    if (!bridge.isConnected(userId)) {
      reply.status(404);
      return { error: 'No device connected' };
    }

    bridge.handleDisconnect(userId);
    return { success: true, message: 'Device disconnected' };
  });

  // GET /device/trust-level — returns current trust level
  fastify.get('/device/trust-level', async (request) => {
    const userId = (request.user as { userId: string }).userId;
    return { trustLevel: bridge.getTrustLevel(userId) };
  });

  // POST /device/trust-level — upgrade trust level (+1 increment)
  fastify.post<{ Body: TrustLevelBody }>('/device/trust-level', async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;
    const body = request.body as TrustLevelBody | undefined;

    if (!body?.confirm) {
      reply.status(400);
      return { error: 'Confirmation required. Send { "confirm": true } to upgrade trust level.' };
    }

    if (!bridge.isConnected(userId)) {
      reply.status(404);
      return { error: 'No device connected' };
    }

    const newLevel = bridge.upgradeTrustLevel(userId);
    if (newLevel === null) {
      reply.status(404);
      return { error: 'No device connected' };
    }

    return { trustLevel: newLevel, message: `Trust level upgraded to ${newLevel}` };
  });
};

export default deviceRoutes;
