/**
 * Personalize Routes — One-click companion model personalization.
 *
 * Exports user's chat history as SFT JSONL, launches fine-tuning,
 * and installs the resulting GGUF model into Ollama.
 *
 * Flow:
 *   POST /personalize/start    → export history + start training job
 *   GET  /personalize/status   → check training progress
 *   POST /personalize/install  → install GGUF into Ollama
 *
 * @module api/routes/personalize
 */

import type { FastifyPluginAsync } from 'fastify';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

interface PersonalizeJob {
  id: string;
  userId: string;
  companionId: string;
  state: 'exporting' | 'training' | 'quantizing' | 'installing' | 'complete' | 'error';
  progress: number;
  stage?: string;
  eta?: string;
  error?: string;
  modelName?: string;
  sampleCount?: number;
  startedAt: number;
  completedAt?: number;
  outputDir?: string;
}

// In-memory job tracking (simple for now; could move to DB)
const activeJobs = new Map<string, PersonalizeJob>();

// ============================================================================
// Route Plugin
// ============================================================================

const personalizeRoutes: FastifyPluginAsync = async (fastify) => {

  // --------------------------------------------------------------------------
  // POST /personalize/start — Export chat history and start training
  // --------------------------------------------------------------------------
  fastify.post<{ Body: { companionId: string } }>('/personalize/start', async (request) => {
    const userId = (request.user as { userId: string }).userId;
    const { companionId } = request.body;

    if (!companionId) {
      return { state: 'error', progress: 0, error: 'companionId is required' };
    }

    // Check for existing active job
    const existingKey = `${userId}-${companionId}`;
    const existing = activeJobs.get(existingKey);
    if (existing && !['complete', 'error'].includes(existing.state)) {
      return existing;
    }

    const jobId = crypto.randomUUID();
    const job: PersonalizeJob = {
      id: jobId,
      userId,
      companionId,
      state: 'exporting',
      progress: 0,
      stage: 'Exporting conversation history...',
      sampleCount: 0,
      startedAt: Date.now(),
    };

    activeJobs.set(existingKey, job);

    // Start async pipeline (non-blocking)
    runPersonalizationPipeline(job, fastify.context.db).catch((err) => {
      job.state = 'error';
      job.error = err instanceof Error ? err.message : 'Training pipeline failed';
    });

    return job;
  });

  // --------------------------------------------------------------------------
  // GET /personalize/status/:companionId — Check training progress
  // --------------------------------------------------------------------------
  fastify.get<{ Params: { companionId: string } }>('/personalize/status/:companionId', async (request) => {
    const userId = (request.user as { userId: string }).userId;
    const { companionId } = request.params;

    const key = `${userId}-${companionId}`;
    const job = activeJobs.get(key);

    if (!job) {
      return { state: 'idle', progress: 0 };
    }

    return job;
  });

  // --------------------------------------------------------------------------
  // POST /personalize/install — Install trained model to Ollama
  // --------------------------------------------------------------------------
  fastify.post<{ Body: { companionId: string } }>('/personalize/install', async (request) => {
    const userId = (request.user as { userId: string }).userId;
    const { companionId } = request.body;

    const key = `${userId}-${companionId}`;
    const job = activeJobs.get(key);

    if (!job || job.state !== 'complete') {
      return { state: 'error', progress: 0, error: 'No completed training job found' };
    }

    job.state = 'installing';
    job.stage = 'Installing model to Ollama...';
    job.progress = 90;

    try {
      const modelName = `kin-${companionId}-${userId.slice(0, 8)}`;
      const modelfilePath = path.join(job.outputDir ?? '', 'Modelfile');

      if (!fs.existsSync(modelfilePath)) {
        throw new Error('Modelfile not found. Training may have failed.');
      }

      // Run ollama create
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('ollama', ['create', modelName, '-f', modelfilePath], {
          stdio: 'pipe',
        });
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`ollama create exited with code ${code}`));
        });
        proc.on('error', reject);
      });

      job.state = 'complete';
      job.progress = 100;
      job.modelName = modelName;
      job.stage = 'Model installed successfully!';
      job.completedAt = Date.now();

      return job;
    } catch (err) {
      job.state = 'error';
      job.error = err instanceof Error ? err.message : 'Installation failed';
      return job;
    }
  });
};

// ============================================================================
// Pipeline (runs async in background)
// ============================================================================

async function runPersonalizationPipeline(job: PersonalizeJob, db: any): Promise<void> {
  const dataDir = path.join('data', 'training', job.companionId, 'personalized', job.userId);
  const outputDir = path.join('training', 'output', `${job.companionId}-${job.userId.slice(0, 8)}`);
  job.outputDir = outputDir;

  // Stage 1: Export chat history as JSONL
  job.state = 'exporting';
  job.stage = 'Exporting your conversation history...';
  job.progress = 10;

  try {
    fs.mkdirSync(dataDir, { recursive: true });

    // Query conversation history from DB
    const rows = db.prepare(`
      SELECT system_prompt, user_message, assistant_response, created_at
      FROM training_data
      WHERE companion_id = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT 5000
    `).all(job.companionId, job.userId) as Array<{
      system_prompt: string;
      user_message: string;
      assistant_response: string;
      created_at: string;
    }>;

    if (rows.length < 10) {
      job.state = 'error';
      job.error = 'Not enough conversation history yet. Chat more with your KIN first! (minimum: 10 conversations)';
      return;
    }

    // Convert to SFT JSONL
    const jsonlPath = path.join(dataDir, 'training.jsonl');
    const lines = rows.map((row) => JSON.stringify({
      messages: [
        { role: 'system', content: row.system_prompt },
        { role: 'user', content: row.user_message },
        { role: 'assistant', content: row.assistant_response },
      ],
      metadata: {
        companionId: job.companionId,
        timestamp: row.created_at,
        category: 'personalized',
      },
    }));

    fs.writeFileSync(jsonlPath, lines.join('\n') + '\n', 'utf-8');
    job.sampleCount = rows.length;
    job.progress = 25;

    // Stage 2: Fine-tune
    job.state = 'training';
    job.stage = `Fine-tuning on ${rows.length} conversations...`;
    job.progress = 30;

    await new Promise<void>((resolve, reject) => {
      const args = [
        'training/fine-tune.py',
        '--companion-id', job.companionId,
        '--data-path', jsonlPath,
        '--base-model', process.env.PERSONALIZE_BASE_MODEL ?? 'unsloth/gemma-4-E4B-it-bnb-4bit',
        '--model-family', 'gemma',
        '--output-dir', outputDir,
        '--epochs', '2',
      ];

      const proc = spawn('python', args, { stdio: 'pipe' });

      proc.stdout.on('data', (data: Buffer) => {
        const line = data.toString();
        // Parse progress from fine-tune.py output
        const progressMatch = line.match(/\[fine-tune\].*?(\d+)%/);
        if (progressMatch) {
          job.progress = 30 + Math.floor(parseInt(progressMatch[1]!, 10) * 0.5);
        }
      });

      proc.stderr.on('data', (data: Buffer) => {
        // Log but don't fail — stderr includes tqdm progress
      });

      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Fine-tuning failed with exit code ${code}`));
      });

      proc.on('error', reject);
    });

    job.progress = 80;

    // Stage 3: Quantize (if not already GGUF)
    job.state = 'quantizing';
    job.stage = 'Optimizing model for your device...';
    job.progress = 85;

    // The fine-tune.py script already exports GGUF, so this stage is mostly
    // about generating the Modelfile with correct parameters
    const { generateModelfile } = await import('../../training/modelfile-generator.js');
    const ggufFiles = fs.readdirSync(outputDir).filter((f: string) => f.endsWith('.gguf'));

    if (ggufFiles.length === 0) {
      throw new Error('No GGUF file found in training output. Fine-tuning may have failed.');
    }

    generateModelfile({
      companionId: job.companionId,
      ggufPath: path.join(outputDir, ggufFiles[0]!),
      outputDir,
      modelFamily: 'gemma',
    });

    // Mark as complete (user clicks "Install" to push to Ollama)
    job.state = 'complete';
    job.progress = 95;
    job.stage = 'Model ready! Click Install to activate.';
    job.modelName = `kin-${job.companionId}-${job.userId.slice(0, 8)}`;

  } catch (err) {
    job.state = 'error';
    job.error = err instanceof Error ? err.message : 'Pipeline failed';
  }
}

export default personalizeRoutes;
