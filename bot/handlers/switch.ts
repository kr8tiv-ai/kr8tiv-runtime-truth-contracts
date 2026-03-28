/**
 * Switch Handler - Handles /switch command
 *
 * Companion switching requires a paid plan. Free users only get Cipher.
 * This handler shows the upgrade prompt instead of allowing free switches.
 */

import { Context, SessionFlavor, InlineKeyboard } from 'grammy';
import { getCompanionConfig, getCompanionIds, COMPANION_CONFIGS } from '../../companions/config.js';
import type { conversationStore } from '../memory/conversation-store.js';

interface SessionData {
  userId: string;
  companionId: string;
  conversationStarted: boolean;
  lastActivity: Date;
  preferences: { voiceEnabled: boolean; teachingMode: boolean };
}

type BotContext = Context & SessionFlavor<SessionData>;

export async function handleSwitch(
  ctx: BotContext,
  _store: typeof conversationStore,
) {
  const current = ctx.session?.companionId ?? 'cipher';
  const currentConfig = COMPANION_CONFIGS[current];

  const lines = getCompanionIds().map((id) => {
    const c = COMPANION_CONFIGS[id]!;
    if (id === current) {
      return `${c.emoji} *${c.name}* — ${c.species} ✅`;
    }
    return `🔒 *${c.name}* — ${c.species}`;
  });

  const upgradeKeyboard = new InlineKeyboard()
    .text('⬆️ Unlock More Companions', 'upgrade:show');

  const msg = [
    `You're currently chatting with ${currentConfig?.emoji ?? '🐙'} *${currentConfig?.name ?? 'Cipher'}*`,
    '',
    ...lines,
    '',
    '_Each companion is a specialized AI model._',
    '_Upgrade your plan to unlock new companions!_',
  ].join('\n');

  await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: upgradeKeyboard });
}

export default handleSwitch;
