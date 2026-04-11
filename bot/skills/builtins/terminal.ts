/**
 * Terminal Skill — Shell command execution on connected desktop device.
 *
 * ALWAYS requires user approval (high-risk operation per action-catalog.md).
 * Detects the device platform from DevicePairing and adapts command syntax.
 * Routes commands through the DeviceBridgeManager WebSocket connection.
 *
 * @module bot/skills/builtins/terminal
 */

import type { KinSkill, SkillContext, SkillResult } from '../types.js';
import { getDeviceBridge } from '../device-bridge.js';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Command Extraction
// ---------------------------------------------------------------------------

/**
 * Extract the shell command from the user's message.
 * Strips common prefixes like "run", "execute", "terminal".
 */
function extractCommand(message: string): string | null {
  const patterns = [
    /^(?:run|execute|terminal|shell)\s*[:>]?\s*`([^`]+)`/i,
    /^(?:run|execute|terminal|shell)\s*[:>]?\s*(.+)/i,
    /`([^`]+)`/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  return null;
}

// ---------------------------------------------------------------------------
// Result Formatting
// ---------------------------------------------------------------------------

function formatTerminalResult(command: string, output: unknown, platform: string): string {
  const lines: string[] = [];
  const prompt = platform === 'windows' ? '>' : '$';

  lines.push(`\`\`\`${platform === 'windows' ? 'cmd' : 'bash'}`);
  lines.push(`${prompt} ${command}`);

  if (typeof output === 'string') {
    // Truncate very long output
    const display = output.length > 2000 ? output.slice(0, 2000) + '\n... (truncated)' : output;
    lines.push(display);
  } else if (output && typeof output === 'object') {
    const obj = output as Record<string, unknown>;
    if (obj['stdout']) lines.push(String(obj['stdout']));
    if (obj['stderr']) lines.push(`stderr: ${String(obj['stderr'])}`);
    if (obj['exitCode'] !== undefined) lines.push(`exit code: ${obj['exitCode']}`);
  }

  lines.push('```');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// TerminalSkill
// ---------------------------------------------------------------------------

export const terminalSkill: KinSkill = {
  name: 'terminal',
  description: 'Execute shell commands on your connected desktop device',

  triggers: [
    'run\\s+command',
    'execute\\s+',
    'terminal\\s+',
    'shell\\s+',
    'npm\\s+',
    'git\\s+',
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

    // 2. Check trust level (terminal requires level 2+)
    const trustLevel = ctx.trustLevel ?? bridge.getTrustLevel(ctx.userId);
    if (trustLevel < 2) {
      return {
        content: 'Terminal access requires trust level 2 or higher. Upgrade your device trust level first.',
        type: 'error',
        metadata: { requiredTrust: 2, currentTrust: trustLevel },
      };
    }

    // 3. Extract command
    const command = extractCommand(ctx.message);
    if (!command) {
      return {
        content: 'Please specify a command to run. Try: "run `ls -la`" or "execute npm install"',
        type: 'text',
      };
    }

    // 4. Send tool request to device
    const device = bridge.getDevice(ctx.userId);
    const platform = device?.platform ?? 'linux';

    try {
      const response = await bridge.sendToolRequest(ctx.userId, {
        requestId: crypto.randomUUID(),
        toolName: 'terminal',
        params: { command, platform },
        trustLevel: trustLevel as 0 | 1 | 2 | 3,
      });

      return {
        content: formatTerminalResult(command, response.result, platform),
        type: 'markdown',
        metadata: { command, platform, requestId: response.requestId },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      if (msg.includes('timed out')) {
        return {
          content: `Command timed out after 30 seconds: \`${command}\``,
          type: 'error',
          metadata: { command, error: 'timeout' },
        };
      }

      if (msg.includes('disconnected') || msg.includes('not open')) {
        return {
          content: 'Device disconnected during command execution. Please reconnect.',
          type: 'error',
          metadata: { command, error: 'disconnected' },
        };
      }

      return {
        content: `Command failed: ${msg}`,
        type: 'error',
        metadata: { command, error: 'execution_failed' },
      };
    }
  },
};

export default terminalSkill;
