/**
 * Privacy Pipeline Integration Tests
 *
 * Tests the privacy mode enforcement in the supervisor and training data gating.
 * Validates that:
 * - forceLocal prevents escalation (regression)
 * - privacyMode='private' defaults to forceLocal behavior
 * - undefined privacyMode defaults to 'private' (safe default)
 * - training data is only collected for shared + supervisor route
 * - training data is NOT collected for local routes even when shared
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { shouldEscalate } from '../inference/supervisor.js';
import { getCompanionConfig } from '../companions/config.js';
import { TrainingDataCollector } from '../inference/training-data.js';

// ============================================================================
// shouldEscalate tests — privacy via forceLocal
// ============================================================================

describe('Privacy Pipeline', () => {
  const cipherConfig = getCompanionConfig('cipher');

  describe('shouldEscalate with forceLocal', () => {
    it('returns false when forceLocal is true regardless of message complexity', () => {
      // Even with a complex message that would normally escalate
      const complexMessage = 'Please analyze this step by step, compare the pros and cons, and help me decide on the best approach for this complex strategy';
      const result = shouldEscalate(complexMessage, 30, cipherConfig, { forceLocal: true });
      expect(result).toBe(false);
    });

    it('returns false when forceLocal is true even with high conversation depth', () => {
      const result = shouldEscalate('hello', 100, cipherConfig, { forceLocal: true });
      expect(result).toBe(false);
    });

    it('returns true for complex messages when forceLocal is not set', () => {
      const complexMessage = 'Please analyze this step by step and help me decide';
      const result = shouldEscalate(complexMessage, 1, cipherConfig);
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // Privacy mode → forceLocal enforcement
  // ============================================================================

  describe('privacyMode enforcement', () => {
    // We can't easily call supervisedChat (too many dependencies to mock),
    // so we test the privacy logic by verifying shouldEscalate behavior
    // with the forceLocal flag that privacy enforcement sets.

    it('forceLocal=true prevents escalation (matches private privacy mode behavior)', () => {
      // This is the mechanism privacy enforcement uses
      const result = shouldEscalate('analyze this complex problem step by step', 20, cipherConfig, {
        forceLocal: true,
      });
      expect(result).toBe(false);
    });

    it('without forceLocal, escalation follows normal rules', () => {
      const result = shouldEscalate('analyze this complex problem step by step', 20, cipherConfig, {});
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // Training data gating
  // ============================================================================

  describe('training data collection gating', () => {
    let tmpDir: string;
    let collector: TrainingDataCollector;

    const makeParams = (overrides: Partial<Parameters<TrainingDataCollector['collect']>[0]> = {}) => ({
      userId: 'user-1',
      companionId: 'cipher',
      privacyMode: 'shared',
      systemPrompt: 'You are Cipher.',
      userMessage: 'Hello',
      assistantResponse: 'Hi there!',
      route: 'supervisor',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      latencyMs: 500,
      ...overrides,
    });

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'privacy-pipeline-test-'));
      collector = new TrainingDataCollector(tmpDir);
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('collects training data when privacyMode=shared AND route=supervisor', async () => {
      const result = await collector.collect(makeParams({
        privacyMode: 'shared',
        route: 'supervisor',
      }));
      expect(result.written).toBe(true);
      expect(result.filePath).toBeDefined();
    });

    it('does NOT collect when privacyMode=shared but route=local', async () => {
      const result = await collector.collect(makeParams({
        privacyMode: 'shared',
        route: 'local',
      }));
      expect(result.written).toBe(false);
    });

    it('does NOT collect when privacyMode=private even with supervisor route', async () => {
      const result = await collector.collect(makeParams({
        privacyMode: 'private',
        route: 'supervisor',
      }));
      expect(result.written).toBe(false);
    });

    it('treats undefined privacyMode as non-shared (safe default)', async () => {
      // The supervisor treats undefined as 'private' and sets forceLocal,
      // so the collector would never see a supervisor route.
      // But even if it did, the collector gates on privacyMode !== 'shared'.
      const result = await collector.collect(makeParams({
        privacyMode: undefined as any,
        route: 'supervisor',
      }));
      expect(result.written).toBe(false);
    });

    it('system prompt is included in training data when provided', async () => {
      const result = await collector.collect(makeParams({
        systemPrompt: 'You are Cipher, a helpful octopus.',
      }));
      expect(result.written).toBe(true);
      const content = fs.readFileSync(result.filePath!, 'utf-8').trim();
      const parsed = JSON.parse(content);
      expect(parsed.messages[0].role).toBe('system');
      expect(parsed.messages[0].content).toBe('You are Cipher, a helpful octopus.');
    });
  });
});
