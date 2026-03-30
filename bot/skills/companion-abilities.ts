/**
 * Companion Abilities - Skills powered by companion-specific local models
 *
 * Each companion (cipher, mischief, vortex, forge, aether, catalyst)
 * has specialized abilities that will be driven by their trained
 * local models once activated. Until then, abilities remain inactive
 * and return placeholder messages.
 */

import type { KinSkill, SkillContext, SkillResult } from './types.js';

// ============================================================================
// Companion Ability Interface
// ============================================================================

export interface CompanionAbility extends KinSkill {
  /** Companion IDs that provide this ability */
  companionIds: string[];

  /** Whether this ability requires a locally-hosted model */
  requiresLocalModel: boolean;

  /** Whether the ability is currently active (model available) */
  isActive: boolean;
}

// ============================================================================
// Placeholder Executor
// ============================================================================

/**
 * Creates a placeholder execute function for abilities whose
 * local models are not yet available.
 */
function createPlaceholderExecute(companionName: string) {
  return async (_ctx: SkillContext): Promise<SkillResult> => ({
    content: `This ability will be powered by ${companionName}'s trained local model. Coming soon!`,
    type: 'text',
    metadata: {
      companion: companionName,
      status: 'awaiting-model',
    },
  });
}

// ============================================================================
// Companion Abilities Registry
// ============================================================================

export const codeGenAbility: CompanionAbility = {
  name: 'code-gen',
  description: 'Generate, review, and refactor code with cipher',
  triggers: ['generate code', 'write.*function', 'review.*code'],
  companionIds: ['cipher'],
  requiresLocalModel: true,
  isActive: false,
  execute: createPlaceholderExecute('cipher'),
};

export const socialContentAbility: CompanionAbility = {
  name: 'social-content',
  description: 'Create social media posts and brand content with mischief',
  triggers: ['create.*post', 'social.*media', 'brand.*content'],
  companionIds: ['mischief'],
  requiresLocalModel: true,
  isActive: false,
  execute: createPlaceholderExecute('mischief'),
};

export const dataAnalysisAbility: CompanionAbility = {
  name: 'data-analysis',
  description: 'Analyze data, run market research, and spot trends with vortex',
  triggers: ['analyze.*data', 'market.*research', 'trend'],
  companionIds: ['vortex'],
  requiresLocalModel: true,
  isActive: false,
  execute: createPlaceholderExecute('vortex'),
};

export const architectureReviewAbility: CompanionAbility = {
  name: 'architecture-review',
  description: 'Review system architecture and code design with forge',
  triggers: ['architecture', 'system.*design', 'code.*review'],
  companionIds: ['forge'],
  requiresLocalModel: true,
  isActive: false,
  execute: createPlaceholderExecute('forge'),
};

export const creativeWritingAbility: CompanionAbility = {
  name: 'creative-writing',
  description: 'Write stories, creative pieces, and worldbuilding with aether',
  triggers: ['write.*story', 'creative.*writing', 'worldbuild'],
  companionIds: ['aether'],
  requiresLocalModel: true,
  isActive: false,
  execute: createPlaceholderExecute('aether'),
};

export const habitCoachingAbility: CompanionAbility = {
  name: 'habit-coaching',
  description: 'Build habits, set goals, and track accountability with catalyst',
  triggers: ['habit', 'goal.*setting', 'routine', 'accountability'],
  companionIds: ['catalyst'],
  requiresLocalModel: true,
  isActive: false,
  execute: createPlaceholderExecute('catalyst'),
};

// ============================================================================
// All Companion Abilities
// ============================================================================

export const companionAbilities: CompanionAbility[] = [
  codeGenAbility,
  socialContentAbility,
  dataAnalysisAbility,
  architectureReviewAbility,
  creativeWritingAbility,
  habitCoachingAbility,
];

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Get companion abilities, optionally filtered by companion ID.
 *
 * - If `companionId` is provided, returns only abilities belonging to
 *   that companion and that are currently active.
 * - If omitted, returns all abilities regardless of active status.
 */
export function getCompanionAbilities(companionId?: string): CompanionAbility[] {
  if (!companionId) {
    return companionAbilities;
  }

  return companionAbilities.filter(
    (ability) => ability.companionIds.includes(companionId) && ability.isActive,
  );
}
