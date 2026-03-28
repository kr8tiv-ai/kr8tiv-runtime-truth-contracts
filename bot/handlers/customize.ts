/**
 * Customize Handler - Companion customization settings
 *
 * Lets users personalize their current companion with a nickname, tone
 * preference, and freeform personality notes. All customizations are
 * stored as session-level preferences so they persist for the session
 * (and can be extended to a database layer later).
 */

import { Context, SessionFlavor, InlineKeyboard } from 'grammy';
import { getCompanionConfig } from '../../companions/config.js';

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
    /** User-set nickname for the current companion */
    companionNickname?: string;
    /** Conversation tone preference */
    tone?: 'friendly' | 'professional' | 'casual' | 'technical';
    /** Freeform personality notes */
    personalityNotes?: string;
    /** Which field we're currently waiting for user input on */
    pendingInput?: 'nickname' | 'notes';
  };
}

type BotContext = Context & SessionFlavor<SessionData>;

// ============================================================================
// Constants
// ============================================================================

const TONE_LABELS: Record<string, string> = {
  friendly: '😊 Friendly',
  professional: '💼 Professional',
  casual: '🎉 Casual',
  technical: '🔧 Technical',
};

// ============================================================================
// Helpers
// ============================================================================

function buildCustomizeKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('✏️ Set Nickname', 'custom:nickname')
    .text('🎭 Change Tone', 'custom:tone')
    .row()
    .text('📝 Add Personality Notes', 'custom:notes');
}

function buildToneKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('😊 Friendly', 'custom:tone:friendly')
    .text('💼 Professional', 'custom:tone:professional')
    .row()
    .text('🎉 Casual', 'custom:tone:casual')
    .text('🔧 Technical', 'custom:tone:technical')
    .row()
    .text('« Back to Customization', 'custom:back');
}

// ============================================================================
// Exported Handlers
// ============================================================================

/**
 * /customize — Shows the current companion's customizable settings
 * with an InlineKeyboard for navigation.
 */
export async function handleCustomize(ctx: BotContext): Promise<void> {
  const userId = ctx.from?.id.toString();
  if (!userId) {
    await ctx.reply("I couldn't identify you. Try /start first?");
    return;
  }

  const companionId = ctx.session?.companionId ?? 'cipher';
  const companion = getCompanionConfig(companionId);
  const prefs = ctx.session?.preferences;

  const nickname = prefs?.companionNickname
    ? `"${prefs.companionNickname}"`
    : '_not set_';
  const tone = prefs?.tone
    ? TONE_LABELS[prefs.tone] ?? prefs.tone
    : '_default_';
  const notes = prefs?.personalityNotes
    ? `"${prefs.personalityNotes}"`
    : '_none_';

  const message = [
    `${companion.emoji} *Customize ${companion.name}*`,
    '',
    `Personalize how *${companion.name}* feels to you. Your settings apply to this conversation.`,
    '',
    `*Nickname:* ${nickname}`,
    `*Tone:* ${tone}`,
    `*Personality notes:* ${notes}`,
    '',
    '_Tap a button to change a setting:_',
  ].join('\n');

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: buildCustomizeKeyboard(),
  });
}

/**
 * Handles all `custom:*` callback_query data values.
 *
 * @param ctx  The bot context (must have session + callback_query).
 * @param data The full callback data string (e.g. 'custom:tone:friendly').
 */
export async function handleCustomizeCallback(
  ctx: BotContext,
  data: string,
): Promise<void> {
  // Always answer the query to dismiss the loading indicator.
  await ctx.answerCallbackQuery();

  const companionId = ctx.session?.companionId ?? 'cipher';
  const companion = getCompanionConfig(companionId);

  // ------------------------------------------------------------------
  // custom:nickname — prompt for a new nickname
  // ------------------------------------------------------------------
  if (data === 'custom:nickname') {
    ctx.session.preferences.pendingInput = 'nickname';

    await ctx.reply(
      [
        `✏️ *Set a nickname for ${companion.name}*`,
        '',
        'What would you like to call me?',
        '',
        '_Just type your answer and I\'ll save it._',
      ].join('\n'),
      { parse_mode: 'Markdown' },
    );
    return;
  }

  // ------------------------------------------------------------------
  // custom:tone — show the 4 tone selection buttons
  // ------------------------------------------------------------------
  if (data === 'custom:tone') {
    const currentTone = ctx.session?.preferences?.tone;
    const currentLabel = currentTone
      ? TONE_LABELS[currentTone] ?? currentTone
      : '_default_';

    await ctx.reply(
      [
        `🎭 *Choose a Tone for ${companion.name}*`,
        '',
        `Current tone: ${currentLabel}`,
        '',
        'Pick the vibe that works best for you:',
      ].join('\n'),
      {
        parse_mode: 'Markdown',
        reply_markup: buildToneKeyboard(),
      },
    );
    return;
  }

  // ------------------------------------------------------------------
  // custom:tone:<variant> — apply the selected tone
  // ------------------------------------------------------------------
  if (data.startsWith('custom:tone:')) {
    const toneValue = data.slice('custom:tone:'.length) as
      | 'friendly'
      | 'professional'
      | 'casual'
      | 'technical';

    const validTones = ['friendly', 'professional', 'casual', 'technical'];
    if (!validTones.includes(toneValue)) {
      await ctx.reply("I don't recognise that tone. Try /customize to start over.");
      return;
    }

    ctx.session.preferences.tone = toneValue;
    const label = TONE_LABELS[toneValue] ?? toneValue;

    await ctx.reply(
      [
        `${companion.emoji} *Tone updated!*`,
        '',
        `I'll be ${label} from now on. Let me know if you'd like to adjust again with /customize.`,
      ].join('\n'),
      { parse_mode: 'Markdown' },
    );
    return;
  }

  // ------------------------------------------------------------------
  // custom:notes — prompt for personality notes
  // ------------------------------------------------------------------
  if (data === 'custom:notes') {
    ctx.session.preferences.pendingInput = 'notes';

    await ctx.reply(
      [
        `📝 *Add Personality Notes for ${companion.name}*`,
        '',
        'Share anything you\'d like me to keep in mind — your communication style, topics you care about, things I should avoid, etc.',
        '',
        '_Just type your notes and I\'ll remember them for this session._',
      ].join('\n'),
      { parse_mode: 'Markdown' },
    );
    return;
  }

  // ------------------------------------------------------------------
  // custom:back — return to the main customize menu
  // ------------------------------------------------------------------
  if (data === 'custom:back') {
    // Clear any pending input state
    ctx.session.preferences.pendingInput = undefined;
    await handleCustomize(ctx);
    return;
  }

  // Unrecognised custom:* callback — acknowledge silently
}

/**
 * Handles free-text replies when a user has a pending customize input.
 * Call this from the main text message handler when
 * `ctx.session.preferences.pendingInput` is set.
 *
 * Returns `true` if the message was consumed, `false` if it should be
 * passed on to the normal chat handler.
 */
export async function handleCustomizePendingInput(
  ctx: BotContext,
  text: string,
): Promise<boolean> {
  const pending = ctx.session?.preferences?.pendingInput;
  if (!pending) return false;

  const companionId = ctx.session?.companionId ?? 'cipher';
  const companion = getCompanionConfig(companionId);
  const trimmed = text.trim();

  if (!trimmed) {
    await ctx.reply("Hmm, that was empty. Try again or use /customize to cancel.");
    return true;
  }

  // Clear pending state regardless of which field we're saving
  ctx.session.preferences.pendingInput = undefined;

  if (pending === 'nickname') {
    // Limit to a reasonable length
    const nickname = trimmed.slice(0, 40);
    ctx.session.preferences.companionNickname = nickname;

    await ctx.reply(
      [
        `${companion.emoji} *Done!*`,
        '',
        `I'll go by "${nickname}" from now on. Nice to meet you properly!`,
        '',
        '_Use /customize to adjust any other settings._',
      ].join('\n'),
      { parse_mode: 'Markdown' },
    );
    return true;
  }

  if (pending === 'notes') {
    // Limit notes to avoid session bloat
    const notes = trimmed.slice(0, 500);
    ctx.session.preferences.personalityNotes = notes;

    await ctx.reply(
      [
        `${companion.emoji} *Got it!*`,
        '',
        'I\'ve noted that. I\'ll keep it in mind as we chat.',
        '',
        '_Use /customize to review or update your settings anytime._',
      ].join('\n'),
      { parse_mode: 'Markdown' },
    );
    return true;
  }

  return false;
}

export default handleCustomize;
