// ============================================================================
// KIN App Constants — Pricing aligned with meetyourkin.com (source of truth)
// ============================================================================

// --- Genesis Mint Tiers (one-time SOL purchase, 60 total) --------------------

export interface GenesisTier {
  id: string;
  name: string;
  emoji: string;
  priceSol: number;
  freeMonths: number;
  planLevel: string;
  lifetimeDiscount: number;
  solanaRewardPercent: number;
  features: string[];
}

export const GENESIS_TIERS: GenesisTier[] = [
  {
    id: 'egg',
    name: 'Egg',
    emoji: '\uD83E\uDD5A',
    priceSol: 2.5,
    freeMonths: 1,
    planLevel: 'Hatchling',
    lifetimeDiscount: 25,
    solanaRewardPercent: 1,
    features: [
      'Genesis avatar (1 of 60)',
      '1 month Hatchling plan included',
      'Supermemory Pro included',
      '25% lifetime discount on all plans',
      '1% lifetime Solana rewards',
    ],
  },
  {
    id: 'hatchling',
    name: 'Hatchling',
    emoji: '\uD83D\uDC23',
    priceSol: 5.3,
    freeMonths: 3,
    planLevel: 'Hatchling',
    lifetimeDiscount: 25,
    solanaRewardPercent: 2,
    features: [
      'Genesis avatar (1 of 60)',
      '3 months Hatchling plan included',
      'Supermemory Pro included',
      '25% lifetime discount on all plans',
      '2% lifetime Solana rewards',
    ],
  },
  {
    id: 'elder',
    name: 'Elder',
    emoji: '\uD83D\uDC32',
    priceSol: 8.3,
    freeMonths: 3,
    planLevel: 'Elder',
    lifetimeDiscount: 25,
    solanaRewardPercent: 3,
    features: [
      'Genesis avatar (1 of 60)',
      '3 months Elder plan included',
      'Supermemory Pro included',
      '25% lifetime discount on all plans',
      '3% lifetime Solana rewards',
    ],
  },
];

// --- Monthly Hosting Plans ---------------------------------------------------

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  priceCents: number;
  priceLabel?: string;
  features: string[];
  companionLimit: number;
  messagesPerDay: number | null;
  highlighted?: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free Trial',
    price: 0,
    priceCents: 0,
    companionLimit: 1,
    messagesPerDay: 50,
    features: [
      '1 companion (Qwen 3 32B)',
      '50 messages per day',
      'Try before you mint',
      'Community support',
    ],
  },
  {
    id: 'hatchling-monthly',
    name: 'Hatchling',
    price: 114,
    priceCents: 11400,
    priceLabel: '/month',
    companionLimit: 1,
    messagesPerDay: null,
    highlighted: true,
    features: [
      'Frontier AI model (unique to your KIN)',
      'Unlimited messages',
      'Supermemory Pro',
      'Telegram + WhatsApp + Voice',
      'Computer control & automation',
      'Standard support',
    ],
  },
  {
    id: 'elder-monthly',
    name: 'Elder',
    price: 194,
    priceCents: 19400,
    priceLabel: '/month',
    companionLimit: 3,
    messagesPerDay: null,
    features: [
      'Everything in Hatchling',
      'Up to 3 companions',
      'Priority support',
      'Advanced workflow automation',
      'Hands-on configuration help',
    ],
  },
  {
    id: 'hero-monthly',
    name: 'Hero',
    price: 324,
    priceCents: 32400,
    priceLabel: '/month',
    companionLimit: 6,
    messagesPerDay: null,
    features: [
      'Everything in Elder',
      'All 6 companions',
      'Dedicated account manager',
      'Deep customization',
      'Multi-agent integrations',
      'API access',
    ],
  },
];

// --- Badge Definitions -------------------------------------------------------

export interface BadgeDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  requirement: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-message',
    name: 'First Words',
    emoji: '\uD83D\uDCAC',
    description: 'Sent your first message to a companion',
    requirement: 'Send 1 message',
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    emoji: '\uD83D\uDD25',
    description: 'Maintained a 7-day conversation streak',
    requirement: '7-day streak',
  },
  {
    id: 'streak-30',
    name: 'Monthly Master',
    emoji: '\u26A1',
    description: 'Maintained a 30-day conversation streak',
    requirement: '30-day streak',
  },
  {
    id: 'messages-100',
    name: 'Chatterbox',
    emoji: '\uD83D\uDDE3\uFE0F',
    description: 'Sent 100 messages across all companions',
    requirement: '100 total messages',
  },
  {
    id: 'messages-1000',
    name: 'Conversation King',
    emoji: '\uD83D\uDC51',
    description: 'Sent 1,000 messages across all companions',
    requirement: '1,000 total messages',
  },
  {
    id: 'companions-3',
    name: 'Collector',
    emoji: '\uD83C\uDFAD',
    description: 'Claimed 3 different companions',
    requirement: 'Claim 3 companions',
  },
  {
    id: 'companions-all',
    name: 'Full Squad',
    emoji: '\uD83C\uDF1F',
    description: 'Claimed all 6 companions',
    requirement: 'Claim all 6 companions',
  },
  {
    id: 'project-first',
    name: 'Builder',
    emoji: '\uD83D\uDD28',
    description: 'Created your first project',
    requirement: 'Create 1 project',
  },
  {
    id: 'project-deployed',
    name: 'Deployer',
    emoji: '\uD83D\uDE80',
    description: 'Deployed a project to production',
    requirement: 'Deploy 1 project',
  },
  {
    id: 'referral-first',
    name: 'Ambassador',
    emoji: '\uD83E\uDD1D',
    description: 'Successfully referred your first friend',
    requirement: '1 successful referral',
  },
];

// --- Level Titles ------------------------------------------------------------

export interface LevelRange {
  min: number;
  max: number;
  title: string;
}

export const LEVEL_TITLES: LevelRange[] = [
  { min: 1, max: 4, title: 'Baby Kraken' },
  { min: 5, max: 9, title: 'Curious Cephalopod' },
  { min: 10, max: 19, title: 'Kraken Commander' },
  { min: 20, max: Infinity, title: 'Leviathan' },
];

/**
 * Get the title for a given level.
 */
export function getLevelTitle(level: number): string {
  const range = LEVEL_TITLES.find((r) => level >= r.min && level <= r.max);
  return range?.title ?? 'Baby Kraken';
}

// --- XP System ---------------------------------------------------------------

export const XP_PER_MESSAGE = 10;

/**
 * Calculate the total XP required to reach a given level.
 * Uses an exponential curve: 100 * (1.2 ^ (level - 1)).
 */
export function XP_FOR_LEVEL(level: number): number {
  return Math.floor(100 * Math.pow(1.2, level - 1));
}

// --- NFT Transfer / Rebinding -----------------------------------------------

/** One-time fee for NFT transfer and new owner onboarding (source: meetyourkin.com) */
export const NFT_REBINDING_FEE_USD = 149;

/** Genesis holders' lifetime discount on all KR8TIV services */
export const GENESIS_LIFETIME_DISCOUNT_PERCENT = 25;

// --- Bags.fm Integration ---------------------------------------------------

export const BAGS_APP_URL = 'https://bags.fm';
export const BAGS_HACKATHON_URL = 'https://bags.fm/hackathon';
export const BAGS_TOKEN_ADDRESS = '7r9RJw6gWbj6s1N9pGKrdzzd5H7oK1sauuwkUDVKBAGS';
