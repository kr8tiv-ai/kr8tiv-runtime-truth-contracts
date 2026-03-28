/**
 * Companions Handler - Shows the Genesis Six roster
 *
 * Companions beyond Cipher are premium models that must be purchased.
 * This handler showcases all companions but does NOT allow free switching.
 */

import { Context, SessionFlavor, InlineKeyboard } from 'grammy';
import { getCompanionIds, COMPANION_CONFIGS } from '../../companions/config.js';

interface SessionData {
  userId: string;
  companionId: string;
  conversationStarted: boolean;
  lastActivity: Date;
  preferences: { voiceEnabled: boolean; teachingMode: boolean };
}

type BotContext = Context & SessionFlavor<SessionData>;

export async function handleCompanions(ctx: BotContext) {
  const current = ctx.session?.companionId ?? 'cipher';

  const lines = getCompanionIds().map((id) => {
    const c = COMPANION_CONFIGS[id]!;
    if (id === current) {
      return `${c.emoji} *${c.name}* — ${c.species} ✅\n   ${c.tagline}`;
    }
    return `🔒 *${c.name}* — ${c.species}\n   ${c.tagline}`;
  });

  const upgradeKeyboard = new InlineKeyboard()
    .text('⬆️ Unlock More Companions', 'upgrade:show');

  const msg = [
    '🐙 *The Genesis Six*',
    '',
    ...lines,
    '',
    `_Currently talking to:_ *${COMPANION_CONFIGS[current]?.name ?? 'Cipher'}*`,
    '',
    '_Each companion has a unique personality and specialty._',
    '_Upgrade your plan to unlock new companions!_',
  ].join('\n');

  await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: upgradeKeyboard });
}

export default handleCompanions;
