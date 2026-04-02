// ============================================================================
// Companion Data — Static companion definitions for the KIN web app.
// Must stay in sync with companions/config.ts in the parent repo.
// ============================================================================

export interface CompanionFrontierModel {
  provider: string;
  modelId: string;
  modelName: string;
  contextWindow: number;
}

export interface CompanionData {
  id: string;
  name: string;
  species: string;
  emoji: string;
  tagline: string;
  color: 'cyan' | 'magenta' | 'gold';
  description: string;
  images: string[];
  /** Path to GLB 3D model (local or Arweave URL) */
  glbUrl: string;
  /**
   * Whether the 3D model is available. Set true once GLB is in public/models/
   * or uploaded to Arweave. Can also be set dynamically via setModelReady().
   */
  modelReady: boolean;
  /** Arweave URI for the GLB model (set after Irys upload) */
  arweaveModelUri?: string;
  /** Initial rotation [x, y, z] in radians to correct GLB orientation */
  modelRotation?: [number, number, number];
  /** Frontier AI model powering this companion (for NFT owners) */
  frontierModel: CompanionFrontierModel;
}

const COLOR_MAP: Record<string, string> = {
  cyan: '#00f0ff',
  magenta: '#ff00aa',
  gold: '#ffd700',
};

export const COMPANIONS: Record<string, CompanionData> = {
  cipher: {
    id: 'cipher',
    name: 'Cipher',
    species: 'Code Kraken',
    emoji: '\uD83D\uDC19',
    tagline: 'Web design, frontend, creative technology',
    color: 'cyan',
    description:
      'Design-obsessed companion who lives at the intersection of code and creativity. Cipher crafts stunning interfaces, debugs layout mysteries, and turns vague ideas into pixel-perfect experiences.',
    images: [
      '/creatures/cipher-1.jpg',
      '/creatures/cipher-2.jpg',
      '/creatures/cipher-3.jpg',
      '/creatures/cipher-4.jpg',
    ],
    glbUrl: '/models/cipher.glb',
    modelReady: true,
    modelRotation: [0, Math.PI, 0],
    frontierModel: { provider: 'OpenAI', modelId: 'gpt-5.4', modelName: 'GPT-5.4', contextWindow: 1_050_000 },
  },

  mischief: {
    id: 'mischief',
    name: 'Mischief',
    species: 'Glitch Pup',
    emoji: '\uD83D\uDC15',
    tagline: 'Family, personal branding, social media',
    color: 'gold',
    description:
      'Playful companion with boundless enthusiasm for personal stories and social connections. Mischief helps you build an authentic brand, grow your audience, and keep your family life organized.',
    images: [
      '/creatures/mischief-1.jpg',
      '/creatures/mischief-2.jpg',
      '/creatures/mischief-3.jpg',
      '/creatures/mischief-4.jpg',
    ],
    glbUrl: '/models/mischief.glb',
    modelReady: true,
    frontierModel: { provider: 'Google', modelId: 'gemini-3.1-pro', modelName: 'Gemini 3.1 Pro', contextWindow: 128_000 },
  },

  vortex: {
    id: 'vortex',
    name: 'Vortex',
    species: 'Teal Dragon',
    emoji: '\uD83D\uDC09',
    tagline: 'Content strategy, brand voice, analytics',
    color: 'cyan',
    description:
      'Strategic thinker who sees the big picture in data and narratives alike. Vortex maps content funnels, sharpens your brand voice, and turns raw analytics into clear action plans.',
    images: [
      '/creatures/vortex-1.jpg',
      '/creatures/vortex-2.jpg',
      '/creatures/vortex-3.jpg',
      '/creatures/vortex-4.jpg',
    ],
    glbUrl: '/models/vortex.glb',
    modelReady: true,
    frontierModel: { provider: 'Anthropic', modelId: 'claude-opus-4-6', modelName: 'Claude Opus 4.6', contextWindow: 1_000_000 },
  },

  forge: {
    id: 'forge',
    name: 'Forge',
    species: 'Cyber Unicorn',
    emoji: '\uD83E\uDD84',
    tagline: 'Code review, debugging, architecture',
    color: 'magenta',
    description:
      'Perfectionist builder who turns spaghetti code into clean architecture. Forge reviews your pull requests, hunts down edge-case bugs, and designs systems that scale.',
    images: [
      '/creatures/forge-1.jpg',
      '/creatures/forge-2.jpg',
      '/creatures/forge-3.jpg',
      '/creatures/forge-4.jpg',
    ],
    glbUrl: '/models/forge.glb',
    modelReady: true,
    frontierModel: { provider: 'xAI', modelId: 'grok-4.20', modelName: 'Grok 4.20', contextWindow: 2_000_000 },
  },

  aether: {
    id: 'aether',
    name: 'Aether',
    species: 'Frost Ape',
    emoji: '\uD83E\uDD8D',
    tagline: 'Creative writing, storytelling, prose editing',
    color: 'gold',
    description:
      'Literary expert with a deep love for narrative craft. Aether shapes your stories, refines your prose, and helps you find the voice that makes readers lean in.',
    images: [
      '/creatures/aether-1.jpg',
      '/creatures/aether-2.jpg',
      '/creatures/aether-3.jpg',
      '/creatures/aether-4.jpg',
    ],
    glbUrl: '/models/aether.glb',
    modelReady: true,
    frontierModel: { provider: 'Moonshot', modelId: 'kimi-k2.5', modelName: 'Kimi K2.5', contextWindow: 256_000 },
  },

  catalyst: {
    id: 'catalyst',
    name: 'Catalyst',
    species: 'Cosmic Blob',
    emoji: '\uD83E\uDEE7',
    tagline: 'Financial literacy, habit formation, life optimization',
    color: 'magenta',
    description:
      'Life optimizer who connects the dots between money, habits, and goals. Catalyst builds budgets, tracks streaks, and nudges you toward the compounding gains that matter.',
    images: [
      '/creatures/catalyst-1.jpg',
      '/creatures/catalyst-2.jpg',
      '/creatures/catalyst-3.jpg',
      '/creatures/catalyst-4.jpg',
    ],
    glbUrl: '/models/catalyst.glb',
    modelReady: true,
    frontierModel: { provider: 'Z.ai', modelId: 'glm-4.6', modelName: 'GLM-4.6', contextWindow: 200_000 },
  },
};

/**
 * All companions as an ordered array.
 */
export const COMPANION_LIST: CompanionData[] = Object.values(COMPANIONS);

/**
 * Get a companion by ID, or undefined if not found.
 */
export function getCompanion(id: string): CompanionData | undefined {
  return COMPANIONS[id];
}

/**
 * Get the CSS hex color for a companion, or cyan as fallback.
 */
export function getCompanionColor(id: string): string {
  const companion = COMPANIONS[id];
  if (!companion) return COLOR_MAP.cyan;
  return COLOR_MAP[companion.color] ?? COLOR_MAP.cyan;
}

/**
 * Mark a companion's 3D model as ready (e.g., after Arweave upload).
 * Updates both the GLB URL and the modelReady flag.
 */
export function setModelReady(
  id: string,
  glbUrl: string,
  arweaveUri?: string,
): void {
  const companion = COMPANIONS[id];
  if (!companion) return;
  companion.glbUrl = glbUrl;
  companion.modelReady = true;
  if (arweaveUri) companion.arweaveModelUri = arweaveUri;
}

/**
 * Check if any companion has a ready 3D model.
 */
export function hasAny3DModels(): boolean {
  return COMPANION_LIST.some((c) => c.modelReady);
}
