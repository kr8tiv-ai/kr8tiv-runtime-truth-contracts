import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TrainingDataCollector } from '../inference/training-data.js';

function makeParams(overrides: Partial<Parameters<TrainingDataCollector['collect']>[0]> = {}) {
  return {
    userId: 'user-1',
    companionId: 'cipher',
    privacyMode: 'shared',
    systemPrompt: 'You are Cipher, a helpful octopus companion.',
    userMessage: 'What is the meaning of life?',
    assistantResponse: 'The meaning of life is to learn, grow, and help others!',
    route: 'supervisor',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    latencyMs: 1200,
    ...overrides,
  };
}

describe('TrainingDataCollector', () => {
  let tmpDir: string;
  let collector: TrainingDataCollector;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'training-data-test-'));
    collector = new TrainingDataCollector(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes JSONL when privacyMode=shared and route=supervisor', async () => {
    const result = await collector.collect(makeParams());

    expect(result.written).toBe(true);
    expect(result.filePath).toBeDefined();

    const content = fs.readFileSync(result.filePath!, 'utf-8').trim();
    expect(content.length).toBeGreaterThan(0);
  });

  it('does NOT write when privacyMode=private', async () => {
    const result = await collector.collect(makeParams({ privacyMode: 'private' }));

    expect(result.written).toBe(false);
    expect(result.filePath).toBeUndefined();

    // No file should exist at all
    const companionDir = path.join(tmpDir, 'cipher');
    expect(fs.existsSync(companionDir)).toBe(false);
  });

  it('does NOT write when route=local even if shared', async () => {
    const result = await collector.collect(makeParams({ route: 'local' }));

    expect(result.written).toBe(false);
    expect(result.filePath).toBeUndefined();
  });

  it('writes valid JSON in SFT chat format with system/user/assistant messages', async () => {
    const result = await collector.collect(makeParams());
    const line = fs.readFileSync(result.filePath!, 'utf-8').trim();
    const parsed = JSON.parse(line);

    expect(parsed.messages).toHaveLength(3);
    expect(parsed.messages[0].role).toBe('system');
    expect(parsed.messages[0].content).toBe('You are Cipher, a helpful octopus companion.');
    expect(parsed.messages[1].role).toBe('user');
    expect(parsed.messages[1].content).toBe('What is the meaning of life?');
    expect(parsed.messages[2].role).toBe('assistant');
    expect(parsed.messages[2].content).toBe('The meaning of life is to learn, grow, and help others!');
  });

  it('metadata includes companionId, timestamp, provider, model', async () => {
    const result = await collector.collect(makeParams());
    const line = fs.readFileSync(result.filePath!, 'utf-8').trim();
    const parsed = JSON.parse(line);

    expect(parsed.metadata.companionId).toBe('cipher');
    expect(parsed.metadata.timestamp).toBeDefined();
    expect(parsed.metadata.provider).toBe('anthropic');
    expect(parsed.metadata.model).toBe('claude-sonnet-4-20250514');
    expect(parsed.metadata.latencyMs).toBe(1200);
  });

  it('creates directory if it does not exist', async () => {
    const nestedDir = path.join(tmpDir, 'deep', 'nested');
    const nestedCollector = new TrainingDataCollector(nestedDir);

    const result = await nestedCollector.collect(makeParams({ companionId: 'vortex' }));

    expect(result.written).toBe(true);
    const filePath = path.join(nestedDir, 'vortex', 'training.jsonl');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('appends multiple lines to the same file', async () => {
    await collector.collect(makeParams({ userMessage: 'First question' }));
    await collector.collect(makeParams({ userMessage: 'Second question' }));
    await collector.collect(makeParams({ userMessage: 'Third question' }));

    const filePath = path.join(tmpDir, 'cipher', 'training.jsonl');
    const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');

    expect(lines).toHaveLength(3);

    // Each line is valid JSON
    for (const line of lines) {
      const parsed = JSON.parse(line);
      expect(parsed.messages).toHaveLength(3);
      expect(parsed.metadata).toBeDefined();
    }

    // Verify different user messages
    expect(JSON.parse(lines[0]!).messages[1].content).toBe('First question');
    expect(JSON.parse(lines[1]!).messages[1].content).toBe('Second question');
    expect(JSON.parse(lines[2]!).messages[1].content).toBe('Third question');
  });

  it('does NOT write when privacyMode is any non-shared value', async () => {
    for (const mode of ['private', 'unknown', '', 'PUBLIC']) {
      const result = await collector.collect(makeParams({ privacyMode: mode }));
      expect(result.written).toBe(false);
    }
  });

  it('never throws even if filesystem fails', async () => {
    // Force appendFile to reject to simulate a filesystem failure
    const spy = vi.spyOn(fs.promises, 'appendFile').mockRejectedValueOnce(
      new Error('EACCES: permission denied')
    );

    const result = await collector.collect(makeParams());

    // Should return gracefully, not throw
    expect(result.written).toBe(false);

    spy.mockRestore();
  });
});
