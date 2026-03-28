/**
 * Export Handler - Chat history export
 *
 * Fetches up to 500 of the user's messages, formats them into a
 * human-readable text document with timestamps, and sends the file
 * via Telegram's sendDocument API.
 *
 * Falls back to a long text message if file construction fails.
 */

import { Context, SessionFlavor, InputFile } from 'grammy';
import type { conversationStore } from '../memory/conversation-store.js';

// ============================================================================
// Types
// ============================================================================

interface SessionData {
  userId: string;
  companionId: string;
  conversationStarted: boolean;
  lastActivity: Date;
  preferences: {
    voiceEnabled: boolean;
    teachingMode: boolean;
  };
}

type BotContext = Context & SessionFlavor<SessionData>;

// ============================================================================
// Formatting helpers
// ============================================================================

function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function roleLabel(role: string): string {
  switch (role) {
    case 'user':
      return 'You';
    case 'assistant':
      return 'Cipher';
    case 'system':
      return '[System]';
    default:
      return role;
  }
}

function buildExportDocument(
  userId: string,
  userName: string,
  companionId: string,
  messages: Array<{ role: string; content: string; timestamp: Date }>,
): string {
  const exportedAt = formatTimestamp(new Date());
  const header = [
    '═══════════════════════════════════════════════════════════',
    '  KIN Chat Export',
    '═══════════════════════════════════════════════════════════',
    `  User:       ${userName} (ID: ${userId})`,
    `  Companion:  ${companionId}`,
    `  Messages:   ${messages.length}`,
    `  Exported:   ${exportedAt}`,
    '═══════════════════════════════════════════════════════════',
    '',
  ].join('\n');

  if (messages.length === 0) {
    return header + 'No messages found in this conversation.\n';
  }

  const body = messages
    .map((msg) => {
      // Skip internal system messages that are just bookkeeping markers
      if (msg.role === 'system' && msg.content.startsWith('[')) {
        return null;
      }

      const timestamp = formatTimestamp(msg.timestamp);
      const speaker = roleLabel(msg.role);
      const separator = '─'.repeat(59);

      return [
        separator,
        `[${timestamp}]  ${speaker}`,
        separator,
        msg.content.trim(),
        '',
      ].join('\n');
    })
    .filter(Boolean)
    .join('\n');

  const footer = [
    '',
    '═══════════════════════════════════════════════════════════',
    '  End of export — meetyourkin.com',
    '═══════════════════════════════════════════════════════════',
    '',
  ].join('\n');

  return header + body + footer;
}

/** Split a string into Telegram-safe chunks (max 4096 chars each). */
function chunkText(text: string, maxLen = 4000): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + maxLen));
    start += maxLen;
  }
  return chunks;
}

// ============================================================================
// Handler
// ============================================================================

/**
 * Exports the user's full conversation history as a downloadable text file.
 * If file creation fails, falls back to sending the content as chunked messages.
 */
export async function handleExport(
  ctx: BotContext,
  store: typeof conversationStore,
): Promise<void> {
  const userId = ctx.from?.id.toString();
  const userName = ctx.from?.first_name ?? 'Friend';

  if (!userId) {
    await ctx.reply("I couldn't identify you. Try /start first?");
    return;
  }

  ctx.session.userId = userId;
  ctx.session.lastActivity = new Date();

  // Notify the user we're working on it
  await ctx.reply('📦 Preparing your export... give me a moment! 🐙');

  const companionId = ctx.session?.companionId ?? 'cipher';

  let messages: Array<{ role: string; content: string; timestamp: Date }>;

  try {
    messages = await store.getHistory(userId, 500, companionId);
  } catch (err) {
    console.error('[export] Failed to fetch history:', err);
    await ctx.reply(
      "Hmm, I ran into trouble fetching your chat history. Try again in a moment? 🐙",
    );
    return;
  }

  if (messages.length === 0) {
    await ctx.reply(
      "You don't have any messages to export yet! Chat with me first and then come back. 🌊",
    );
    return;
  }

  const documentText = buildExportDocument(userId, userName, companionId, messages);
  const fileName = `kin-chat-${companionId}-${userId}-${Date.now()}.txt`;

  // ── Attempt to send as a file ─────────────────────────────────────────────
  try {
    const buffer = Buffer.from(documentText, 'utf-8');
    const inputFile = new InputFile(buffer, fileName);

    await ctx.replyWithDocument(inputFile, {
      caption:
        `📄 *Your KIN Chat Export*\n\n` +
        `Companion: ${companionId}\n` +
        `Messages: ${messages.length}\n\n` +
        `_All your messages in one tidy file. Keep it safe!_ 🐙`,
      parse_mode: 'Markdown',
    });
    return;
  } catch (fileErr) {
    console.error('[export] Failed to send as document, falling back to text:', fileErr);
  }

  // ── Fallback: send as chunked text messages ────────────────────────────────
  try {
    const chunks = chunkText(documentText);
    await ctx.reply(
      `📄 *Your Chat Export* (${messages.length} messages)\n\nHere it is as text — I couldn't attach a file this time:`,
      { parse_mode: 'Markdown' },
    );

    for (const chunk of chunks) {
      await ctx.reply('```\n' + chunk + '\n```', { parse_mode: 'Markdown' });
    }
  } catch (textErr) {
    console.error('[export] Fallback text send also failed:', textErr);
    await ctx.reply(
      "Something went wrong trying to export your chat. Please try again later — I'm sorry! 🐙",
    );
  }
}

export default handleExport;
