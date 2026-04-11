/**
 * App Launcher Skill — Open and close applications on connected desktop.
 *
 * Trust level 1+, medium-risk operation requiring approval.
 * Routes application launch/close requests through the DeviceBridgeManager.
 *
 * @module bot/skills/builtins/app-launcher
 */

import type { KinSkill, SkillContext, SkillResult } from '../types.js';
import { getDeviceBridge } from '../device-bridge.js';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Intent Detection
// ---------------------------------------------------------------------------

export type AppIntent = 'open' | 'close';

interface ParsedAppIntent {
  intent: AppIntent;
  appName: string;
}

/**
 * Parse the user's message to extract app launch/close intent and app name.
 */
export function parseAppIntent(message: string): ParsedAppIntent | null {
  // Close patterns
  const closeMatch = message.match(
    /\b(?:close|quit|exit|kill|stop)\s+(?:the\s+)?([a-zA-Z0-9\s._-]+?)(?:\s+app(?:lication)?)?$/i,
  );
  if (closeMatch?.[1]?.trim()) {
    return { intent: 'close', appName: closeMatch[1].trim() };
  }

  // Open/launch patterns
  const openMatch = message.match(
    /\b(?:open|launch|start|run)\s+(?:the\s+)?(?:app(?:lication)?\s+)?([a-zA-Z0-9\s._-]+?)(?:\s+app(?:lication)?)?$/i,
  );
  if (openMatch?.[1]?.trim()) {
    return { intent: 'open', appName: openMatch[1].trim() };
  }

  return null;
}

// ---------------------------------------------------------------------------
// AppLauncherSkill
// ---------------------------------------------------------------------------

export const appLauncherSkill: KinSkill = {
  name: 'app-launcher',
  description: 'Open or close applications on your connected desktop',

  triggers: [
    'open\\s+(?:the\\s+)?(?:app|application|program)',
    'launch\\s+',
    'close\\s+(?:the\\s+)?(?:app|application|program)',
    'start\\s+(?:the\\s+)?program',
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

    // 2. Check trust level (app-launcher requires 1+)
    const trustLevel = ctx.trustLevel ?? bridge.getTrustLevel(ctx.userId);
    if (trustLevel < 1) {
      return {
        content: 'App launcher requires trust level 1 or higher. Upgrade your device trust level first.',
        type: 'error',
        metadata: { requiredTrust: 1, currentTrust: trustLevel },
      };
    }

    // 3. Parse intent
    const parsed = parseAppIntent(ctx.message);
    if (!parsed) {
      return {
        content: 'Could not determine which app to open or close. Try: "open Chrome" or "close Notepad"',
        type: 'text',
      };
    }

    // 4. Get device platform for OS-aware commands
    const device = bridge.getDevice(ctx.userId);
    const platform = device?.platform ?? 'windows';

    // 5. Send tool request to device
    try {
      const response = await bridge.sendToolRequest(ctx.userId, {
        requestId: crypto.randomUUID(),
        toolName: 'app-launcher',
        params: {
          intent: parsed.intent,
          appName: parsed.appName,
          platform,
        },
        trustLevel: trustLevel as 0 | 1 | 2 | 3,
      });

      const verb = parsed.intent === 'open' ? 'launched' : 'closed';
      const icon = parsed.intent === 'open' ? '🚀' : '❌';

      return {
        content: `${icon} **${parsed.appName}** ${verb} successfully.`,
        type: 'markdown',
        metadata: {
          intent: parsed.intent,
          appName: parsed.appName,
          platform,
          requestId: response.requestId,
        },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      if (msg.includes('timed out')) {
        return {
          content: `Timed out trying to ${parsed.intent} ${parsed.appName}.`,
          type: 'error',
          metadata: { intent: parsed.intent, appName: parsed.appName, error: 'timeout' },
        };
      }

      return {
        content: `Failed to ${parsed.intent} ${parsed.appName}: ${msg}`,
        type: 'error',
        metadata: { intent: parsed.intent, appName: parsed.appName, error: 'execution_failed' },
      };
    }
  },
};

export default appLauncherSkill;
