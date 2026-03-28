/**
 * Upgrade Handler - Subscription / upgrade flow
 *
 * Shows the user their current plan, a formatted feature comparison
 * table, and InlineKeyboard buttons to start the upgrade process.
 *
 * Payment integration (Stripe) is not yet wired; all upgrade callbacks
 * currently reply with a "coming soon" message and log interest so the
 * team can prioritise outreach.
 */

import { Context, SessionFlavor, InlineKeyboard } from 'grammy';

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

type PlanId = 'free' | 'pro' | 'enterprise';

interface Plan {
  id: PlanId;
  label: string;
  emoji: string;
  price: string;
  features: string[];
}

// ============================================================================
// Plan definitions
// ============================================================================

const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    label: 'Free',
    emoji: '🆓',
    price: 'Free forever',
    features: [
      '50 messages / day',
      '1 companion (Cipher)',
      'Basic chat & help',
      'Website builder (limited)',
    ],
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    emoji: '⭐',
    price: '$9 / month',
    features: [
      'Unlimited messages',
      'All 6 companions',
      'Voice responses (XTTS / Piper)',
      'Priority support',
      'Full website deploy',
      'Teaching mode',
    ],
  },
  enterprise: {
    id: 'enterprise',
    label: 'Enterprise',
    emoji: '🚀',
    price: '$29 / month',
    features: [
      'Everything in Pro',
      'Tailscale private network access',
      'REST API access',
      'Custom companions (bespoke)',
      'Dedicated support channel',
      'SLA + uptime guarantee',
    ],
  },
};

// ============================================================================
// In-memory upgrade-interest log
// Replace with database writes in production.
// ============================================================================

interface UpgradeInterest {
  userId: string;
  plan: PlanId;
  timestamp: string;
}

const upgradeInterestLog: UpgradeInterest[] = [];

// ============================================================================
// Helpers
// ============================================================================

/**
 * Resolves the current plan for a user.
 * For now all users are on Free. Wire to your billing system to return
 * 'pro' or 'enterprise' when appropriate.
 */
function getCurrentPlan(_userId: string): PlanId {
  // TODO: look up subscription status from billing backend
  return 'free';
}

/**
 * Formats a single plan block as Markdown text for the comparison table.
 */
function formatPlanBlock(plan: Plan, isCurrent: boolean): string {
  const currentBadge = isCurrent ? ' _(your plan)_' : '';
  const featureLines = plan.features.map((f) => `  • ${f}`).join('\n');

  return [
    `${plan.emoji} *${plan.label}* — ${plan.price}${currentBadge}`,
    featureLines,
  ].join('\n');
}

/**
 * Builds the InlineKeyboard shown on the upgrade menu.
 * Hides the upgrade button for the plan the user already has.
 */
function buildUpgradeKeyboard(currentPlan: PlanId): InlineKeyboard {
  const kb = new InlineKeyboard();

  if (currentPlan !== 'pro') {
    kb.text('⭐ Upgrade to Pro', 'upgrade:pro');
  }
  if (currentPlan !== 'enterprise') {
    kb.text('🚀 Go Enterprise', 'upgrade:enterprise');
  }

  return kb;
}

// ============================================================================
// Exported Handlers
// ============================================================================

/**
 * /upgrade — Displays the current plan, a feature comparison table,
 * and upgrade CTA buttons.
 */
export async function handleUpgrade(ctx: BotContext): Promise<void> {
  const userId = ctx.from?.id.toString();
  if (!userId) {
    await ctx.reply("I couldn't identify you. Try /start first?");
    return;
  }

  const currentPlanId = getCurrentPlan(userId);
  const currentPlan = PLANS[currentPlanId];

  const planBlocks = (Object.values(PLANS) as Plan[]).map((plan) =>
    formatPlanBlock(plan, plan.id === currentPlanId),
  );

  const message = [
    '💳 *KIN Plans*',
    '',
    `Your current plan: ${currentPlan.emoji} *${currentPlan.label}*`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    ...planBlocks.join('\n\n━━━━━━━━━━━━━━━━━━━━━━━\n\n').split('\n'),
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    '_Tap a button below to unlock the next level:_',
  ].join('\n');

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: buildUpgradeKeyboard(currentPlanId),
  });
}

/**
 * Handles all `upgrade:*` callback_query data values.
 *
 * @param ctx  The bot context.
 * @param data The full callback data string (e.g. 'upgrade:pro').
 */
export async function handleUpgradeCallback(
  ctx: BotContext,
  data: string,
): Promise<void> {
  await ctx.answerCallbackQuery();

  const userId = ctx.from?.id.toString() ?? 'unknown';

  // ------------------------------------------------------------------
  // upgrade:pro
  // ------------------------------------------------------------------
  if (data === 'upgrade:pro') {
    // Log interest for follow-up outreach
    upgradeInterestLog.push({
      userId,
      plan: 'pro',
      timestamp: new Date().toISOString(),
    });
    console.info('[upgrade] Pro interest logged', { userId, timestamp: new Date().toISOString() });

    const plan = PLANS.pro;
    await ctx.reply(
      [
        `${plan.emoji} *${plan.label} — ${plan.price}*`,
        '',
        'Coming soon! We\'re setting up payments. We\'ll notify you when it\'s ready.',
        '',
        "We've noted your interest and will reach out as soon as Pro is live.",
        '',
        '_In the meantime, keep chatting — Cipher is always here for you!_ 🐙',
      ].join('\n'),
      { parse_mode: 'Markdown' },
    );
    return;
  }

  // ------------------------------------------------------------------
  // upgrade:enterprise
  // ------------------------------------------------------------------
  if (data === 'upgrade:enterprise') {
    upgradeInterestLog.push({
      userId,
      plan: 'enterprise',
      timestamp: new Date().toISOString(),
    });
    console.info('[upgrade] Enterprise interest logged', { userId, timestamp: new Date().toISOString() });

    const plan = PLANS.enterprise;
    await ctx.reply(
      [
        `${plan.emoji} *${plan.label} — ${plan.price}*`,
        '',
        'Coming soon! We\'re setting up payments. We\'ll notify you when it\'s ready.',
        '',
        "We've noted your Enterprise interest — our team will be in touch soon for a personalised onboarding.",
        '',
        '_Have a specific use case in mind? Let us know with /support and we\'ll prioritise you!_',
      ].join('\n'),
      { parse_mode: 'Markdown' },
    );
    return;
  }

  // Unknown upgrade:* callback — acknowledge silently
}

/**
 * Exposes the upgrade interest log so an admin endpoint or cron job can
 * read it (useful before a proper database layer is wired).
 */
export function getUpgradeInterestLog(): Readonly<UpgradeInterest[]> {
  return upgradeInterestLog;
}

export default handleUpgrade;
