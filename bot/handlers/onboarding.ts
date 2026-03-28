/**
 * Onboarding Handler - Multi-step onboarding flow for new users
 *
 * Guides new users through:
 * 1. Getting their name (text reply handled in main bot file)
 * 2. Choosing their primary goal (chat buddy / website builder / task helper)
 * 3. Selecting their tech comfort level (beginner / intermediate / advanced)
 */

import { Context, SessionFlavor, InlineKeyboard } from 'grammy';
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

export type OnboardingStep = 'name' | 'goal' | 'experience' | 'complete';

export interface OnboardingState {
  step: OnboardingStep;
  name?: string;
  goal?: 'chat' | 'build' | 'tasks';
  experience?: 'beginner' | 'intermediate' | 'advanced';
}

// ============================================================================
// Keyboards
// ============================================================================

const GOAL_KEYBOARD = new InlineKeyboard()
  .text('💬 Chat Buddy', 'onboard:goal:chat')
  .row()
  .text('🎨 Website Builder', 'onboard:goal:build')
  .row()
  .text('✅ Task Helper', 'onboard:goal:tasks');

const EXPERIENCE_KEYBOARD = new InlineKeyboard()
  .text('🌱 Beginner', 'onboard:exp:beginner')
  .row()
  .text('⚡ Intermediate', 'onboard:exp:intermediate')
  .row()
  .text('🔥 Advanced', 'onboard:exp:advanced');

// ============================================================================
// Goal & Experience Copy
// ============================================================================

const GOAL_DESCRIPTIONS: Record<string, { emoji: string; label: string; description: string }> = {
  chat: {
    emoji: '💬',
    label: 'Chat Buddy',
    description:
      "You want a companion to talk to, bounce ideas off, and explore the world with. I'm great at that — I'm curious about *everything*.",
  },
  build: {
    emoji: '🎨',
    label: 'Website Builder',
    description:
      "You want to build something on the web. Whether it's a portfolio, landing page, or full product — I'll design and build it alongside you.",
  },
  tasks: {
    emoji: '✅',
    label: 'Task Helper',
    description:
      "You want to get things done. Reminders, to-dos, research, planning — I'll help you stay on top of it all.",
  },
};

const EXPERIENCE_DESCRIPTIONS: Record<
  string,
  { emoji: string; label: string; teachingMode: boolean }
> = {
  beginner: {
    emoji: '🌱',
    label: 'Beginner',
    teachingMode: true,
  },
  intermediate: {
    emoji: '⚡',
    label: 'Intermediate',
    teachingMode: true,
  },
  advanced: {
    emoji: '🔥',
    label: 'Advanced',
    teachingMode: false,
  },
};

// In-memory onboarding state (keyed by userId).
// In a production app with multiple instances you'd persist this to Redis/DB.
const onboardingStates = new Map<string, OnboardingState>();

// ============================================================================
// Exports
// ============================================================================

/**
 * Kick off onboarding for a new user.
 * Asks "What should I call you?" — the next text message from this user
 * is captured as their name in the main bot file, which should then call
 * advanceOnboardingToGoal().
 */
export async function handleOnboarding(
  ctx: BotContext,
  store: typeof conversationStore,
): Promise<void> {
  const userId = ctx.from?.id.toString();
  if (!userId) {
    await ctx.reply("Hey! I couldn't get your info. Try /start again?");
    return;
  }

  // Initialize onboarding state
  onboardingStates.set(userId, { step: 'name' });

  // Update session
  ctx.session.userId = userId;
  ctx.session.lastActivity = new Date();

  await store.addMessage(userId, 'system', '[Onboarding started]');

  await ctx.reply(
    `🐙 *Hey! Welcome to KIN!*\n\nI'm *Cipher*, your Code Kraken companion. I'm super excited you're here!\n\nBefore we dive in — *what should I call you?* Just type your name and I'll remember it. 🌊`,
    { parse_mode: 'Markdown' },
  );
}

/**
 * Called from the main bot file after the user replies with their name.
 * Stores the name and advances to the "What are you looking for?" step.
 */
export async function advanceOnboardingToGoal(
  ctx: BotContext,
  userName: string,
  store: typeof conversationStore,
): Promise<void> {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const state = onboardingStates.get(userId);
  if (!state || state.step !== 'name') return;

  // Save name in state
  state.name = userName.trim().slice(0, 50); // cap at 50 chars
  state.step = 'goal';
  onboardingStates.set(userId, state);

  await store.addMessage(userId, 'system', `[Onboarding: name set to "${state.name}"]`);

  await ctx.reply(
    `Nice to meet you, *${state.name}*! 🎉\n\nNow, what are you mainly looking for? Pick whatever fits best — we can always change it later.`,
    { parse_mode: 'Markdown', reply_markup: GOAL_KEYBOARD },
  );
}

/**
 * Returns the current onboarding state for a user, or undefined if not onboarding.
 */
export function getOnboardingState(userId: string): OnboardingState | undefined {
  return onboardingStates.get(userId);
}

/**
 * Returns true if the user is currently in the 'name' collection step.
 */
export function isAwaitingName(userId: string): boolean {
  const state = onboardingStates.get(userId);
  return state?.step === 'name';
}

/**
 * Clears the onboarding state for a user (call after onboarding completes).
 */
export function clearOnboardingState(userId: string): void {
  onboardingStates.delete(userId);
}

/**
 * Handles inline button presses during onboarding.
 *
 * Supported data values:
 *   onboard:goal:chat | onboard:goal:build | onboard:goal:tasks
 *   onboard:exp:beginner | onboard:exp:intermediate | onboard:exp:advanced
 */
export async function handleOnboardingCallback(
  ctx: BotContext,
  data: string,
  store: typeof conversationStore,
): Promise<void> {
  const userId = ctx.from?.id.toString();
  if (!userId) {
    await ctx.answerCallbackQuery({ text: 'Session error — try /start again.' });
    return;
  }

  // ── Goal selection ──────────────────────────────────────────────────────────
  if (data.startsWith('onboard:goal:')) {
    const goalKey = data.slice('onboard:goal:'.length) as 'chat' | 'build' | 'tasks';
    const goalInfo = GOAL_DESCRIPTIONS[goalKey];

    if (!goalInfo) {
      await ctx.answerCallbackQuery({ text: 'Unknown option — try again.' });
      return;
    }

    const state = onboardingStates.get(userId) ?? { step: 'goal' as OnboardingStep };
    state.goal = goalKey;
    state.step = 'experience';
    onboardingStates.set(userId, state);

    await ctx.answerCallbackQuery({ text: `${goalInfo.emoji} ${goalInfo.label} — great choice!` });

    await store.addMessage(userId, 'system', `[Onboarding: goal set to "${goalKey}"]`);

    const name = state.name ?? ctx.from?.first_name ?? 'friend';

    await ctx.reply(
      `${goalInfo.emoji} *${goalInfo.label}* — perfect!\n\n${goalInfo.description}\n\nOne more thing, *${name}* — how comfortable are you with tech? This helps me pitch things at the right level.`,
      { parse_mode: 'Markdown', reply_markup: EXPERIENCE_KEYBOARD },
    );
    return;
  }

  // ── Experience selection ───────────────────────────────────────────────────
  if (data.startsWith('onboard:exp:')) {
    const expKey = data.slice('onboard:exp:'.length) as
      | 'beginner'
      | 'intermediate'
      | 'advanced';
    const expInfo = EXPERIENCE_DESCRIPTIONS[expKey];

    if (!expInfo) {
      await ctx.answerCallbackQuery({ text: 'Unknown option — try again.' });
      return;
    }

    const state = onboardingStates.get(userId) ?? { step: 'experience' as OnboardingStep };
    state.experience = expKey;
    state.step = 'complete';
    onboardingStates.set(userId, state);

    // Apply to session preferences
    ctx.session.preferences = {
      voiceEnabled: ctx.session.preferences?.voiceEnabled ?? true,
      teachingMode: expInfo.teachingMode,
    };
    ctx.session.conversationStarted = true;
    ctx.session.lastActivity = new Date();

    await ctx.answerCallbackQuery({
      text: `${expInfo.emoji} Got it — ${expInfo.label} mode activated!`,
    });

    await store.addMessage(userId, 'system', `[Onboarding: experience set to "${expKey}"]`);

    const name = state.name ?? ctx.from?.first_name ?? 'friend';
    const goalInfo = state.goal ? GOAL_DESCRIPTIONS[state.goal] : null;

    // Craft a personalised completion message
    const goalLine = goalInfo
      ? `You want a *${goalInfo.label}* and you're at the *${expInfo.label}* level.`
      : `You're at the *${expInfo.label}* level.`;

    const beginnerTip =
      expKey === 'beginner'
        ? '\n\n_Tip: I\'ll explain things step-by-step and never assume you know the jargon. Just ask if anything\'s confusing!_'
        : expKey === 'intermediate'
        ? '\n\n_Tip: I\'ll give you the "why" behind things — not just the "how"._'
        : '\n\n_Tip: I\'ll keep explanations tight and get straight to the good stuff._';

    await store.addMessage(userId, 'system', `[Onboarding complete for "${name}"]`);

    await ctx.reply(
      `${expInfo.emoji} *Awesome, ${name}!* Setup complete.\n\n${goalLine}${beginnerTip}\n\n🐙 I'm *Cipher* and I'm ready to roll. What would you like to work on first?`,
      { parse_mode: 'Markdown' },
    );

    // Clean up state
    onboardingStates.delete(userId);
    return;
  }

  // Unknown onboarding action
  await ctx.answerCallbackQuery({ text: 'Unknown action — try /start again.' });
}

export default handleOnboarding;
