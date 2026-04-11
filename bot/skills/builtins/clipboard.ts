/**
 * Clipboard Skill — Read from and write to the desktop clipboard.
 *
 * Read = low-risk (trust level 0+), Write = medium-risk (trust level 1+).
 * Routes clipboard operations through the DeviceBridgeManager WebSocket.
 *
 * @module bot/skills/builtins/clipboard
 */

import type { KinSkill, SkillContext, SkillResult } from '../types.js';
import { getDeviceBridge } from '../device-bridge.js';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Intent Detection
// ---------------------------------------------------------------------------

export type ClipboardIntent = 'read' | 'write';

interface ParsedClipboardIntent {
  intent: ClipboardIntent;
  content?: string;
}

/**
 * Parse clipboard intent from the user's message.
 */
export function parseClipboardIntent(message: string): ParsedClipboardIntent | null {
  const msg = message.toLowerCase().trim();

  // Write / copy to clipboard
  const writeMatch = message.match(
    /\b(?:copy|write|set|put)\s+(?:to\s+)?(?:clipboard|clip)\s*[:>]?\s*(.+)/i,
  );
  if (writeMatch?.[1]?.trim()) {
    return { intent: 'write', content: writeMatch[1].trim() };
  }

  // Check for backtick-wrapped content to copy
  const backtickMatch = message.match(/copy\s+`([^`]+)`/i);
  if (backtickMatch?.[1]) {
    return { intent: 'write', content: backtickMatch[1] };
  }

  // Read / paste / what's copied
  if (/\b(?:clipboard|what.*cop(?:y|ied)|paste|show\s+clip)/i.test(msg)) {
    return { intent: 'read' };
  }

  return null;
}

// ---------------------------------------------------------------------------
// ClipboardSkill
// ---------------------------------------------------------------------------

export const clipboardSkill: KinSkill = {
  name: 'clipboard',
  description: 'Read from or write to the clipboard on your connected desktop',

  triggers: [
    'clipboard',
    'copy\\s+',
    'paste',
    'what\\s+did\\s+I\\s+copy',
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

    // 2. Parse intent
    const parsed = parseClipboardIntent(ctx.message);
    if (!parsed) {
      return {
        content: 'Could not determine clipboard action. Try: "what did I copy", "clipboard", or "copy `some text` to clipboard"',
        type: 'text',
      };
    }

    // 3. Check trust level (read = 0+, write = 1+)
    const trustLevel = ctx.trustLevel ?? bridge.getTrustLevel(ctx.userId);
    const requiredTrust = parsed.intent === 'write' ? 1 : 0;

    if (trustLevel < requiredTrust) {
      return {
        content: `Clipboard ${parsed.intent} requires trust level ${requiredTrust}+. Current level: ${trustLevel}.`,
        type: 'error',
        metadata: { requiredTrust, currentTrust: trustLevel, intent: parsed.intent },
      };
    }

    // 4. Send tool request to device
    try {
      const response = await bridge.sendToolRequest(ctx.userId, {
        requestId: crypto.randomUUID(),
        toolName: 'clipboard',
        params: {
          intent: parsed.intent,
          content: parsed.content,
        },
        trustLevel: trustLevel as 0 | 1 | 2 | 3,
      });

      if (parsed.intent === 'read') {
        const clipContent = typeof response.result === 'string' ? response.result : '';
        if (!clipContent) {
          return { content: 'Clipboard is empty.', type: 'text' };
        }

        const display = clipContent.length > 2000
          ? clipContent.slice(0, 2000) + '\n... (truncated)'
          : clipContent;

        return {
          content: `**Clipboard contents:**\n\`\`\`\n${display}\n\`\`\``,
          type: 'markdown',
          metadata: { intent: 'read', length: clipContent.length, requestId: response.requestId },
        };
      }

      // Write intent
      return {
        content: 'Text copied to clipboard.',
        type: 'text',
        metadata: { intent: 'write', requestId: response.requestId },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      if (msg.includes('timed out')) {
        return {
          content: 'Clipboard operation timed out. Device may be unresponsive.',
          type: 'error',
          metadata: { intent: parsed.intent, error: 'timeout' },
        };
      }

      return {
        content: `Clipboard operation failed: ${msg}`,
        type: 'error',
        metadata: { intent: parsed.intent, error: 'execution_failed' },
      };
    }
  },
};

export default clipboardSkill;
