/**
 * Help Handler - Handles /help command
 */

import { Context, SessionFlavor } from 'grammy';

interface SessionData {
  userId: string;
  companionId: string;
  conversationStarted: boolean;
  lastActivity: Date;
  preferences: { voiceEnabled: boolean; teachingMode: boolean };
}

type BotContext = Context & SessionFlavor<SessionData>;

const HELP_MESSAGE = `
*KIN Command Reference*

*Core Commands:*
/start — Start or restart your KIN
/help — Show this help message
/status — See your current status
/reset — Start a fresh conversation
/health — Check what's running

*Companions:*
/companions — Meet the Genesis Six
/switch — Change your active companion

*What your KIN can do:*
• Build websites, debug code, teach design
• Answer questions, run calculations, set reminders
• Search the web, check the weather
• Listen to voice notes and reply with voice

🗣️ *Voice Notes*
Send a voice message — your KIN transcribes it locally and replies.

*Need human help?*
Contact support through Mission Control.
`;

const QUICK_HELP = `
*Quick help:*
/start — Start your KIN
/help — Full command list
/status — Your status
/companions — Meet the Genesis Six
/reset — Fresh conversation

Just send a message to start chatting!
`;

export async function handleHelp(ctx: BotContext) {
  const message = ctx.session?.conversationStarted ? HELP_MESSAGE : QUICK_HELP;
  await ctx.reply(message, { parse_mode: 'Markdown' });
}

export default handleHelp;
