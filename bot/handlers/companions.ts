/**
 * Companions Handler - Lists all available KIN companions
 */

import { Context, SessionFlavor } from 'grammy';
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
    const active = id === current ? ' \u2705' : '';
    return `${c.emoji} *${c.name}* \u2014 ${c.species}${active}\n   ${c.tagline}`;
  });

  const msg = [
    '\uD83D\uDC19 *The Genesis Six*',
    '',
    ...lines,
    '',
    `_Currently talking to:_ *${COMPANION_CONFIGS[current]?.name ?? 'Cipher'}*`,
    '_Switch:_ `/switch [name]`',
  ].join('\n');

  await ctx.reply(msg, { parse_mode: 'Markdown' });
}

export default handleCompanions;
