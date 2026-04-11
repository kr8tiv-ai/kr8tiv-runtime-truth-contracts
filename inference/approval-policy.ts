/**
 * Approval Policy — declarative gate for external mutations.
 *
 * Pure function that determines whether a skill+intent combination requires
 * user confirmation before execution. Currently gates email send/draft
 * operations; all other skills pass through ungated.
 *
 * @module inference/approval-policy
 */

// ---------------------------------------------------------------------------
// Policy Map
// ---------------------------------------------------------------------------

/**
 * Map of skill names → set of intents that require approval.
 * If a skill is listed here, only the specified intents are gated.
 * Intents not in the set pass through without approval.
 */
const APPROVAL_REQUIRED: Record<string, Set<string>> = {
  email: new Set(['send', 'draft']),
  terminal: new Set(['execute']),
  'file-manager': new Set(['write', 'create', 'delete']),
  'app-launcher': new Set(['open', 'close']),
  clipboard: new Set(['write']),
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether a skill+intent combination requires user approval.
 *
 * @param skillName - The skill being invoked (e.g. 'email', 'weather')
 * @param intent    - Optional intent within the skill (e.g. 'send', 'draft')
 * @returns true if execution should be held for user confirmation
 */
export function requiresApproval(skillName: string, intent?: string): boolean {
  const gatedIntents = APPROVAL_REQUIRED[skillName];
  if (!gatedIntents) return false;
  if (!intent) return false;
  return gatedIntents.has(intent);
}

/**
 * Extract the intent for a skill from a natural-language message.
 *
 * Used by the pipeline/scheduler execution paths where the skill context
 * contains a free-text message rather than a pre-parsed intent. For the
 * email skill, looks for 'send' / 'draft' keywords. For all other skills,
 * returns undefined (no intent extraction rules defined yet).
 *
 * @param message   - The natural-language message from the skill context
 * @param skillName - The skill being invoked
 * @returns The extracted intent string, or undefined if no intent detected
 */
export function extractSkillIntent(message: string, skillName: string): string | undefined {
  const lower = message.toLowerCase();

  switch (skillName) {
    case 'email':
      if (/\bsend\b/.test(lower)) return 'send';
      if (/\bdraft\b/.test(lower)) return 'draft';
      return undefined;

    case 'terminal':
      // Terminal commands always map to 'execute' intent (always gated)
      return 'execute';

    case 'file-manager':
      if (/\bdelete\b|\bremove\b/.test(lower)) return 'delete';
      if (/\bwrite\b|\bupdate\b|\bsave\b|\bmodify\b/.test(lower)) return 'write';
      if (/\bcreate\b|\bnew\b/.test(lower)) return 'create';
      if (/\bread\b|\bshow\b|\bcat\b|\bview\b|\blist\b/.test(lower)) return 'read';
      return undefined;

    case 'app-launcher':
      if (/\bclose\b|\bquit\b|\bexit\b|\bkill\b/.test(lower)) return 'close';
      if (/\bopen\b|\blaunch\b|\bstart\b/.test(lower)) return 'open';
      return undefined;

    case 'screenshot':
      // Screenshot has no approval-gated intents at trust level 1+
      return undefined;

    case 'clipboard':
      if (/\bcopy\b|\bwrite\b|\bset\b|\bput\b/.test(lower)) return 'write';
      if (/\bpaste\b|\bread\b|\bclipboard\b|\bwhat.*cop/.test(lower)) return 'read';
      return undefined;

    default:
      return undefined;
  }
}
