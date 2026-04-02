import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  generateModelfile,
  getModelName,
} from '../training/modelfile-generator.js';
import {
  COMPANION_SHORT_PROMPTS,
  getAvailableCompanions,
} from '../inference/companion-prompts.js';

// ============================================================================
// Helpers
// ============================================================================

const STOP_TOKENS = [
  '<|start_header_id|>',
  '<|end_header_id|>',
  '<|eot_id|>',
];

const FAKE_GGUF = '/models/cipher-q4_k_m.gguf';

// ============================================================================
// getModelName
// ============================================================================

describe('getModelName', () => {
  it('returns kin-{companionId} format', () => {
    expect(getModelName('cipher')).toBe('kin-cipher');
    expect(getModelName('forge')).toBe('kin-forge');
  });

  it.each(getAvailableCompanions())(
    'returns kin-%s for companion %s',
    (id) => {
      expect(getModelName(id)).toBe(`kin-${id}`);
    },
  );
});

// ============================================================================
// generateModelfile — content validation
// ============================================================================

describe('generateModelfile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'modelfile-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── Basic generation for cipher ─────────────────────────────────────────

  it('generates valid Modelfile for cipher with correct FROM, SYSTEM, and PARAMETER lines', () => {
    const result = generateModelfile({
      companionId: 'cipher',
      ggufPath: FAKE_GGUF,
      outputDir: tmpDir,
    });

    expect(result.modelfileContent).toContain(`FROM ${FAKE_GGUF}`);
    expect(result.modelfileContent).toContain('SYSTEM """');
    expect(result.modelfileContent).toContain('PARAMETER temperature 0.7');
    expect(result.modelfileContent).toContain('PARAMETER top_p 0.9');
    expect(result.modelfileContent).toContain('PARAMETER num_ctx 2048');
  });

  // ── Parameterized test for all 6 companions ─────────────────────────────

  it.each(getAvailableCompanions())(
    'generates valid Modelfile for companion: %s',
    (companionId) => {
      const gguf = `/models/${companionId}-q4_k_m.gguf`;
      const outDir = path.join(tmpDir, companionId);

      const result = generateModelfile({
        companionId,
        ggufPath: gguf,
        outputDir: outDir,
      });

      // FROM line
      expect(result.modelfileContent).toContain(`FROM ${gguf}`);

      // SYSTEM prompt matches short prompt exactly
      const expectedPrompt = COMPANION_SHORT_PROMPTS[companionId];
      expect(expectedPrompt).toBeDefined();
      expect(result.modelfileContent).toContain(`SYSTEM """${expectedPrompt}"""`);

      // Model name
      expect(result.modelName).toBe(`kin-${companionId}`);

      // File written to disk
      expect(fs.existsSync(result.modelfilePath)).toBe(true);
      const diskContent = fs.readFileSync(result.modelfilePath, 'utf-8');
      expect(diskContent).toBe(result.modelfileContent);
    },
  );

  // ── SYSTEM prompt exact match ───────────────────────────────────────────

  it('SYSTEM prompt matches COMPANION_SHORT_PROMPTS[companionId] exactly', () => {
    const result = generateModelfile({
      companionId: 'cipher',
      ggufPath: FAKE_GGUF,
      outputDir: tmpDir,
    });

    const expected = COMPANION_SHORT_PROMPTS['cipher'];
    expect(expected).toBeDefined();
    expect(result.modelfileContent).toContain(`SYSTEM """${expected}"""`);
  });

  // ── Model name convention ───────────────────────────────────────────────

  it('model name follows kin-{companionId} convention', () => {
    const result = generateModelfile({
      companionId: 'vortex',
      ggufPath: FAKE_GGUF,
      outputDir: tmpDir,
    });

    expect(result.modelName).toBe('kin-vortex');
  });

  // ── Unknown companion throws ───────────────────────────────────────────

  it('throws for unknown companionId', () => {
    expect(() =>
      generateModelfile({
        companionId: 'unknown-kin',
        ggufPath: FAKE_GGUF,
        outputDir: tmpDir,
      }),
    ).toThrow(/Unknown companionId "unknown-kin"/);
  });

  // ── Llama 3.2 stop tokens ──────────────────────────────────────────────

  it('includes all 3 Llama 3.2 stop tokens', () => {
    const result = generateModelfile({
      companionId: 'cipher',
      ggufPath: FAKE_GGUF,
      outputDir: tmpDir,
    });

    for (const token of STOP_TOKENS) {
      expect(result.modelfileContent).toContain(
        `PARAMETER stop "${token}"`,
      );
    }
  });

  // ── FROM line contains ggufPath ────────────────────────────────────────

  it('FROM line contains the provided ggufPath', () => {
    const customPath = '/custom/path/to/model.gguf';
    const result = generateModelfile({
      companionId: 'aether',
      ggufPath: customPath,
      outputDir: tmpDir,
    });

    const fromLine = result.modelfileContent
      .split('\n')
      .find((l) => l.startsWith('FROM '));
    expect(fromLine).toBe(`FROM ${customPath}`);
  });

  // ── Output directory creation ──────────────────────────────────────────

  it('creates output directory if missing', () => {
    const nestedDir = path.join(tmpDir, 'deep', 'nested', 'dir');
    expect(fs.existsSync(nestedDir)).toBe(false);

    const result = generateModelfile({
      companionId: 'catalyst',
      ggufPath: FAKE_GGUF,
      outputDir: nestedDir,
    });

    expect(fs.existsSync(nestedDir)).toBe(true);
    expect(fs.existsSync(result.modelfilePath)).toBe(true);
  });

  // ── Modelfile written to correct path ──────────────────────────────────

  it('Modelfile is written to disk at the expected path', () => {
    const result = generateModelfile({
      companionId: 'mischief',
      ggufPath: FAKE_GGUF,
      outputDir: tmpDir,
    });

    expect(result.modelfilePath).toBe(path.join(tmpDir, 'Modelfile'));
    expect(fs.existsSync(result.modelfilePath)).toBe(true);

    const content = fs.readFileSync(result.modelfilePath, 'utf-8');
    expect(content).toBe(result.modelfileContent);
  });

  // ── Default output directory ───────────────────────────────────────────

  it('uses default output directory when outputDir is omitted', () => {
    const result = generateModelfile({
      companionId: 'forge',
      ggufPath: FAKE_GGUF,
    });

    const expectedPath = path.join('training', 'output', 'forge', 'Modelfile');
    expect(result.modelfilePath).toBe(expectedPath);
    expect(fs.existsSync(result.modelfilePath)).toBe(true);

    // Clean up the created directory
    fs.rmSync(path.join('training', 'output', 'forge'), {
      recursive: true,
      force: true,
    });
  });
});
