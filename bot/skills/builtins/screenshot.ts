/**
 * Screenshot Skill — Screen capture from connected desktop device.
 *
 * Captures the desktop screen and returns a base64-encoded image
 * that can be fed into Gemma 4 vision for analysis. Trust level 1+.
 *
 * @module bot/skills/builtins/screenshot
 */

import type { KinSkill, SkillContext, SkillResult } from '../types.js';
import { getDeviceBridge } from '../device-bridge.js';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// ScreenshotSkill
// ---------------------------------------------------------------------------

export const screenshotSkill: KinSkill = {
  name: 'screenshot',
  description: 'Capture a screenshot of your connected desktop screen',

  triggers: [
    'screenshot',
    'screen\\s+capture',
    'what.*on\\s+(?:my\\s+)?screen',
    'show\\s+me\\s+(?:your|the)\\s+screen',
    'capture\\s+screen',
  ],

  async execute(ctx: SkillContext): Promise<SkillResult> {
    const bridge = getDeviceBridge();

    // 1. Check device connection
    if (!bridge.isConnected(ctx.userId)) {
      return {
        content: 'No desktop device connected. Use /device pair to connect your computer first.',
        type: 'text',
      };
    }

    // 2. Check trust level (screenshot requires 1+)
    const trustLevel = ctx.trustLevel ?? bridge.getTrustLevel(ctx.userId);
    if (trustLevel < 1) {
      return {
        content: 'Screenshot access requires trust level 1 or higher. Upgrade your device trust level first.',
        type: 'error',
        metadata: { requiredTrust: 1, currentTrust: trustLevel },
      };
    }

    // 3. Determine optional region/monitor from message
    const monitorMatch = ctx.message.match(/monitor\s+(\d+)/i);
    const monitor = monitorMatch ? parseInt(monitorMatch[1], 10) : undefined;

    // 4. Send tool request to device
    try {
      const response = await bridge.sendToolRequest(ctx.userId, {
        requestId: crypto.randomUUID(),
        toolName: 'screenshot',
        params: {
          monitor,
          format: 'png',
        },
        trustLevel: trustLevel as 0 | 1 | 2 | 3,
      });

      const result = response.result as { image?: string; width?: number; height?: number } | undefined;

      if (!result?.image) {
        return {
          content: 'Screenshot captured but no image data was returned.',
          type: 'error',
          metadata: { requestId: response.requestId },
        };
      }

      return {
        content: `Screenshot captured (${result.width ?? '?'}x${result.height ?? '?'})`,
        type: 'text',
        metadata: {
          image: result.image, // base64 PNG for vision pipeline
          width: result.width,
          height: result.height,
          format: 'png',
          requestId: response.requestId,
        },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      if (msg.includes('timed out')) {
        return {
          content: 'Screenshot capture timed out. The device may be unresponsive.',
          type: 'error',
          metadata: { error: 'timeout' },
        };
      }

      if (msg.includes('disconnected') || msg.includes('not open')) {
        return {
          content: 'Device disconnected during screenshot capture. Please reconnect.',
          type: 'error',
          metadata: { error: 'disconnected' },
        };
      }

      return {
        content: `Screenshot failed: ${msg}`,
        type: 'error',
        metadata: { error: 'capture_failed' },
      };
    }
  },
};

export default screenshotSkill;
