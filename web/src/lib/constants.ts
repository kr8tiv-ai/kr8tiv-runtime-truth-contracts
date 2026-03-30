// ============================================================================
// KIN App Constants
// ============================================================================

// --- Pricing Tiers -----------------------------------------------------------

export interface PricingTier {
  id: string;
  name: string;
  price: number; // price in dollars (one-time or monthly)
  priceCents: number;
  priceLabel?: string; // e.g. "one-time per companion", "/month"
  features: string[];
  companionLimit: number;
  messagesPerDay: number | null; // null = unlimited
  highlighted?: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceCents: 0,
    companionLimit: 1,
    messagesPerDay: 50,
    features: [
      '1 companion (Qwen 3 32B)',
      '50 messages per day',
      'Basic web builder',
      'Community support',
    ],
  },
  {
    id: 'genesis',
    name: 'Genesis Mint',
    price: 9.99,
    priceCents: 999,
    priceLabel: 'one-time per companion',
    companionLimit: 1,
    messagesPerDay: null,
    highlighted: true,
    features: [
      'Frontier AI brain (unique per companion)',
      'Unlimited messages',
      'Supermemory intelligent context',
      'Yours forever (NFT)',
      'Voice chat',
      'Priority support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19.99,
    priceCents: 1999,
    priceLabel: '/month',
    companionLimit: 3,
    messagesPerDay: null,
    features: [
      '3 companions with frontier brains',
      'Unlimited messages',
      'Supermemory for each companion',
      'Full web builder',
      'Priority support',
      'Project export',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 49.99,
    priceCents: 4999,
    priceLabel: '/month',
    companionLimit: 6,
    messagesPerDay: null,
    features: [
      'All 6 companions with frontier brains',
      'Unlimited everything',
      'API access',
      'Team collaboration',
      'Dedicated support',
      'Advanced analytics',
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

// --- Bags.fm Integration ---------------------------------------------------

export const BAGS_APP_URL = 'https://bags.fm';
export const BAGS_HACKATHON_URL = 'https://bags.fm/hackathon';
export const BAGS_TOKEN_ADDRESS = '7r9RJw6gWbj6s1N9pGKrdzzd5H7oK1sauuwkUDVKBAGS';
