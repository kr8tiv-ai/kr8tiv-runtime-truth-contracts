/**
 * Training Data Curation Pipeline — Merge, deduplicate, filter, and balance
 * training data from all generators into a single companion-specific JSONL.
 *
 * Usage:
 *   npx tsx training/curate-data.ts --companion-id cipher
 *   npx tsx training/curate-data.ts --companion-id cipher --dry-run
 *   npx tsx training/curate-data.ts --companion-id all
 *
 * Pipeline stages:
 *   1. Import all generators for the companion
 *   2. Run each generator to produce SFTLine arrays
 *   3. Merge all samples into a single pool
 *   4. Deduplicate (by message content hash)
 *   5. Quality filter (min message length, valid structure)
 *   6. Balance categories (persona/domain/tool-use/safety/alignment/voice)
 *   7. Shuffle and write to training.jsonl
 *
 * Target per companion: ~3000 samples
 *   - 500 persona conversations
 *   - 500 domain-specific
 *   - 800 tool-use examples
 *   - 500 safety training
 *   - 500 alignment pairs
 *   - 200 voice-optimized
 *
 * @module training/curate-data
 */

import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

interface SFTMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

interface SFTLine {
  messages: SFTMessage[];
  metadata?: {
    category?: string;
    companionId?: string;
    timestamp?: string;
    [key: string]: unknown;
  };
}

interface CurationStats {
  companionId: string;
  rawTotal: number;
  afterDedup: number;
  afterFilter: number;
  afterBalance: number;
  byCategory: Record<string, number>;
  outputPath: string;
}

// ============================================================================
// Constants
// ============================================================================

const VALID_COMPANIONS = ['cipher', 'mischief', 'vortex', 'forge', 'aether', 'catalyst'];

const TARGET_COUNTS: Record<string, number> = {
  persona: 500,
  domain: 500,
  'tool-use': 800,
  safety: 500,
  alignment: 500,
  voice: 200,
};

const TOTAL_TARGET = Object.values(TARGET_COUNTS).reduce((a, b) => a + b, 0);

const MIN_MESSAGE_LENGTH = 10; // minimum chars for user or assistant message
const MIN_MESSAGES = 2;         // at least system + user + assistant (or user + assistant)
const MAX_MESSAGE_LENGTH = 8000; // truncate extremely long messages

// ============================================================================
// Generator Categories
// ============================================================================

const GENERATOR_CATEGORIES = [
  'persona',
  'domain',      // or 'web-dev' for Cipher
  'tool-use',
  'safety',
  'alignment',
  'voice',
] as const;

type Category = typeof GENERATOR_CATEGORIES[number];

// ============================================================================
// Pipeline Stages
// ============================================================================

/**
 * Stage 1: Import and run generators for a companion
 */
async function runGenerators(companionId: string): Promise<Map<Category, SFTLine[]>> {
  const results = new Map<Category, SFTLine[]>();
  const generatorsDir = path.join(process.cwd(), 'training', 'data-generators');

  for (const category of GENERATOR_CATEGORIES) {
    // Try companion-specific file names
    const possibleNames = [
      `${companionId}-${category}.ts`,
      `${companionId}-${category}.js`,
      // Cipher uses 'web-dev' instead of 'domain'
      category === 'domain' ? `${companionId}-web-dev.ts` : null,
      category === 'domain' ? `${companionId}-web-dev.js` : null,
    ].filter(Boolean) as string[];

    let loaded = false;
    for (const fileName of possibleNames) {
      const filePath = path.join(generatorsDir, fileName);
      if (fs.existsSync(filePath)) {
        try {
          const mod = await import(filePath);
          const generate = mod.generate ?? mod.default?.generate;
          if (typeof generate === 'function') {
            log(`Running ${fileName}...`);
            const samples: SFTLine[] = await generate();
            // Tag each sample with its category
            for (const sample of samples) {
              if (!sample.metadata) sample.metadata = {};
              sample.metadata.category = category;
              sample.metadata.companionId = companionId;
            }
            results.set(category, samples);
            log(`  → ${samples.length} samples`);
            loaded = true;
            break;
          }
        } catch (err) {
          warn(`Failed to load ${fileName}: ${err instanceof Error ? err.message : err}`);
        }
      }
    }

    if (!loaded) {
      warn(`No generator found for ${companionId}/${category}`);
      results.set(category, []);
    }
  }

  return results;
}

/**
 * Stage 2: Merge all category samples into one pool
 */
function mergeSamples(categories: Map<Category, SFTLine[]>): SFTLine[] {
  const all: SFTLine[] = [];
  for (const samples of categories.values()) {
    all.push(...samples);
  }
  return all;
}

/**
 * Stage 3: Deduplicate by hashing user+assistant content
 */
function deduplicateSamples(samples: SFTLine[]): SFTLine[] {
  const seen = new Set<string>();
  const deduped: SFTLine[] = [];

  for (const sample of samples) {
    const key = hashSample(sample);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(sample);
    }
  }

  return deduped;
}

function hashSample(sample: SFTLine): string {
  const content = sample.messages
    .filter((m) => m.role !== 'system')
    .map((m) => m.content.trim().toLowerCase())
    .join('|||');
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Stage 4: Quality filter
 */
function filterQuality(samples: SFTLine[]): SFTLine[] {
  return samples.filter((sample) => {
    const msgs = sample.messages;

    // Must have at least user + assistant
    if (msgs.length < MIN_MESSAGES) return false;

    // Must have at least one user and one assistant message
    const hasUser = msgs.some((m) => m.role === 'user');
    const hasAssistant = msgs.some((m) => m.role === 'assistant');
    if (!hasUser || !hasAssistant) return false;

    // Check minimum content length
    for (const msg of msgs) {
      if (msg.role === 'system') continue;
      if (msg.content.trim().length < MIN_MESSAGE_LENGTH) return false;
    }

    // Truncate overly long messages (don't reject, just trim)
    for (const msg of msgs) {
      if (msg.content.length > MAX_MESSAGE_LENGTH) {
        msg.content = msg.content.slice(0, MAX_MESSAGE_LENGTH) + '...';
      }
    }

    return true;
  });
}

/**
 * Stage 5: Balance categories to target counts
 */
function balanceCategories(samples: SFTLine[]): SFTLine[] {
  const byCat = new Map<string, SFTLine[]>();

  for (const sample of samples) {
    const cat = sample.metadata?.category ?? 'unknown';
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat)!.push(sample);
  }

  const balanced: SFTLine[] = [];

  for (const [cat, catSamples] of byCat) {
    const target = TARGET_COUNTS[cat] ?? 500;
    const shuffled = shuffle(catSamples);

    if (shuffled.length <= target) {
      balanced.push(...shuffled);
    } else {
      balanced.push(...shuffled.slice(0, target));
    }
  }

  return shuffle(balanced);
}

/**
 * Stage 6: Write output JSONL
 */
function writeOutput(samples: SFTLine[], outputPath: string): void {
  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });

  const lines = samples.map((s) => JSON.stringify(s)).join('\n');
  fs.writeFileSync(outputPath, lines + '\n', 'utf-8');
}

// ============================================================================
// Helpers
// ============================================================================

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function log(msg: string): void {
  console.log(`[curate-data] ${msg}`);
}

function warn(msg: string): void {
  console.warn(`[curate-data] WARNING: ${msg}`);
}

function fatal(msg: string): never {
  console.error(`[curate-data] ERROR: ${msg}`);
  process.exit(1);
}

// ============================================================================
// Main
// ============================================================================

async function curateCompanion(companionId: string, dryRun: boolean): Promise<CurationStats> {
  log(`\n${'='.repeat(60)}`);
  log(`Curating training data for: ${companionId}`);
  log(`${'='.repeat(60)}\n`);

  // Stage 1: Run generators
  const categories = await runGenerators(companionId);

  // Stage 2: Merge
  const merged = mergeSamples(categories);
  log(`\nMerged: ${merged.length} total samples`);

  // Stage 3: Deduplicate
  const deduped = deduplicateSamples(merged);
  log(`After dedup: ${deduped.length} (removed ${merged.length - deduped.length} duplicates)`);

  // Stage 4: Quality filter
  const filtered = filterQuality(deduped);
  log(`After quality filter: ${filtered.length} (removed ${deduped.length - filtered.length} low-quality)`);

  // Stage 5: Balance categories
  const balanced = balanceCategories(filtered);
  log(`After balancing: ${balanced.length} (target: ${TOTAL_TARGET})`);

  // Category breakdown
  const byCategory: Record<string, number> = {};
  for (const sample of balanced) {
    const cat = sample.metadata?.category ?? 'unknown';
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
  }

  log('\nCategory breakdown:');
  for (const [cat, count] of Object.entries(byCategory).sort()) {
    const target = TARGET_COUNTS[cat] ?? '?';
    log(`  ${cat}: ${count}/${target}`);
  }

  // Stage 6: Write output
  const outputPath = path.join('data', 'training', companionId, 'training.jsonl');

  if (dryRun) {
    log(`\n[DRY RUN] Would write ${balanced.length} samples to ${outputPath}`);
  } else {
    writeOutput(balanced, outputPath);
    log(`\nWrote ${balanced.length} samples to ${outputPath}`);
  }

  return {
    companionId,
    rawTotal: merged.length,
    afterDedup: deduped.length,
    afterFilter: filtered.length,
    afterBalance: balanced.length,
    byCategory,
    outputPath,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let companionId: string | null = null;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--companion-id':
        companionId = args[++i]!;
        break;
      case '--dry-run':
        dryRun = true;
        break;
    }
  }

  if (!companionId) {
    fatal('--companion-id is required (use "all" for all companions)');
  }

  const companions = companionId === 'all' ? VALID_COMPANIONS : [companionId];

  for (const id of companions) {
    if (!VALID_COMPANIONS.includes(id)) {
      fatal(`Unknown companion "${id}". Valid: ${VALID_COMPANIONS.join(', ')}`);
    }
  }

  const results: CurationStats[] = [];

  for (const id of companions) {
    const stats = await curateCompanion(id, dryRun);
    results.push(stats);
  }

  // Summary
  log('\n' + '='.repeat(60));
  log('CURATION SUMMARY');
  log('='.repeat(60));
  for (const r of results) {
    log(`${r.companionId}: ${r.afterBalance} samples → ${r.outputPath}`);
  }
}

main().catch((err) => {
  fatal(err instanceof Error ? err.message : String(err));
});
