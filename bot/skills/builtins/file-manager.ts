/**
 * File Manager Skill — File CRUD on connected desktop device.
 *
 * Read = low-risk (trust level 0+), Write = medium (trust 1+),
 * Delete = high (trust 2+, always requires approval).
 * Routes operations through the DeviceBridgeManager WebSocket connection.
 *
 * @module bot/skills/builtins/file-manager
 */

import type { KinSkill, SkillContext, SkillResult } from '../types.js';
import { getDeviceBridge } from '../device-bridge.js';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Intent Detection
// ---------------------------------------------------------------------------

export type FileIntent = 'read' | 'write' | 'create' | 'delete' | 'list';

interface ParsedFileIntent {
  intent: FileIntent;
  path?: string;
  content?: string;
}

/** Trust level required per intent */
const INTENT_TRUST: Record<FileIntent, number> = {
  read: 0,
  list: 0,
  write: 1,
  create: 1,
  delete: 2,
};

/**
 * Parse the user's message into a structured file operation intent.
 */
export function parseFileIntent(message: string): ParsedFileIntent | null {
  const msg = message.toLowerCase().trim();

  // Delete
  if (/\b(?:delete|remove)\s+(?:file|folder|directory)/i.test(msg)) {
    const pathMatch = message.match(/(?:delete|remove)\s+(?:file|folder|directory)\s+[`"']?([^\s`"']+)/i);
    return { intent: 'delete', path: pathMatch?.[1] };
  }

  // Write / update
  if (/\b(?:write|update|save|modify)\s+(?:to\s+)?(?:file)?/i.test(msg)) {
    const pathMatch = message.match(/(?:write|update|save|modify)\s+(?:to\s+)?(?:file\s+)?[`"']?([^\s`"']+)/i);
    return { intent: 'write', path: pathMatch?.[1] };
  }

  // Create
  if (/\b(?:create|new)\s+(?:file|folder|directory)/i.test(msg)) {
    const pathMatch = message.match(/(?:create|new)\s+(?:file|folder|directory)\s+[`"']?([^\s`"']+)/i);
    return { intent: 'create', path: pathMatch?.[1] };
  }

  // List / show directory
  if (/\b(?:list\s+files|show\s+directory|ls\b|dir\b)/i.test(msg)) {
    const pathMatch = message.match(/(?:list\s+files|show\s+directory|ls|dir)\s+(?:in\s+)?[`"']?([^\s`"']+)/i);
    return { intent: 'list', path: pathMatch?.[1] ?? '.' };
  }

  // Read
  if (/\b(?:read|show|cat|open|view)\s+(?:file\s+)?/i.test(msg)) {
    const pathMatch = message.match(/(?:read|show|cat|open|view)\s+(?:file\s+)?[`"']?([^\s`"']+)/i);
    return { intent: 'read', path: pathMatch?.[1] };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Result Formatting
// ---------------------------------------------------------------------------

function formatFileResult(intent: FileIntent, result: unknown, path?: string): string {
  if (intent === 'list' && Array.isArray(result)) {
    const items = result as Array<{ name: string; type: string; size?: number }>;
    if (items.length === 0) return `Directory \`${path}\` is empty.`;

    const lines = items.map((item) => {
      const icon = item.type === 'directory' ? '📁' : '📄';
      const size = item.size != null ? ` (${formatBytes(item.size)})` : '';
      return `${icon} ${item.name}${size}`;
    });

    return `**Contents of \`${path}\`:**\n\n${lines.join('\n')}`;
  }

  if (intent === 'read' && typeof result === 'string') {
    const display = result.length > 3000 ? result.slice(0, 3000) + '\n... (truncated)' : result;
    return `**\`${path}\`:**\n\`\`\`\n${display}\n\`\`\``;
  }

  if (intent === 'delete') {
    return `Deleted \`${path}\` successfully.`;
  }

  if (intent === 'write' || intent === 'create') {
    return `File \`${path}\` ${intent === 'create' ? 'created' : 'written'} successfully.`;
  }

  return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ---------------------------------------------------------------------------
// FileManagerSkill
// ---------------------------------------------------------------------------

export const fileManagerSkill: KinSkill = {
  name: 'file-manager',
  description: 'Read, write, create, delete, and list files on your connected desktop',

  triggers: [
    'read\\s+file',
    'write\\s+file',
    'create\\s+file',
    'delete\\s+file',
    'list\\s+files',
    'show\\s+directory',
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
    const parsed = parseFileIntent(ctx.message);
    if (!parsed) {
      return {
        content: 'Could not determine file operation. Try: "read file config.json", "list files in /home", or "create file notes.txt"',
        type: 'text',
      };
    }

    // 3. Check trust level
    const trustLevel = ctx.trustLevel ?? bridge.getTrustLevel(ctx.userId);
    const requiredTrust = INTENT_TRUST[parsed.intent] ?? 0;

    if (trustLevel < requiredTrust) {
      return {
        content: `${parsed.intent} operations require trust level ${requiredTrust}+. Current level: ${trustLevel}.`,
        type: 'error',
        metadata: { requiredTrust, currentTrust: trustLevel, intent: parsed.intent },
      };
    }

    if (!parsed.path) {
      return {
        content: 'Please specify a file path. Example: "read file ~/Documents/notes.txt"',
        type: 'text',
      };
    }

    // 4. Send tool request to device
    try {
      const response = await bridge.sendToolRequest(ctx.userId, {
        requestId: crypto.randomUUID(),
        toolName: 'file-manager',
        params: {
          intent: parsed.intent,
          path: parsed.path,
          content: parsed.content,
        },
        trustLevel: trustLevel as 0 | 1 | 2 | 3,
      });

      return {
        content: formatFileResult(parsed.intent, response.result, parsed.path),
        type: 'markdown',
        metadata: {
          intent: parsed.intent,
          path: parsed.path,
          requestId: response.requestId,
        },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      if (msg.includes('timed out')) {
        return {
          content: `File operation timed out: ${parsed.intent} ${parsed.path}`,
          type: 'error',
          metadata: { intent: parsed.intent, path: parsed.path, error: 'timeout' },
        };
      }

      return {
        content: `File operation failed: ${msg}`,
        type: 'error',
        metadata: { intent: parsed.intent, path: parsed.path, error: 'execution_failed' },
      };
    }
  },
};

export default fileManagerSkill;
