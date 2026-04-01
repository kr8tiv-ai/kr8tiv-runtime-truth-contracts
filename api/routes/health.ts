/**
 * Health Routes - System health and status endpoints
 */

import { FastifyPluginAsync } from 'fastify';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  checks: {
    database: { status: boolean; latencyMs?: number; error?: string };
    memory: { status: boolean; usedMB: number; totalMB: number };
    storage: { status: boolean; usedGB: number; totalGB: number };
  };
}

const VERSION = '1.0.0';
const startTime = Date.now();

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Basic health check
  fastify.get('/health', async (request, reply) => {
    const checks: HealthStatus['checks'] = {
      database: { status: false },
      memory: { status: true, usedMB: 0, totalMB: 0 },
      storage: { status: true, usedGB: 0, totalGB: 0 },
    };

    // Check database
    try {
      const dbStart = performance.now();
      fastify.context.db.prepare('SELECT 1').get();
      checks.database = {
        status: true,
        latencyMs: Math.round(performance.now() - dbStart),
      };
    } catch (error) {
      checks.database = {
        status: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Check memory
    const memUsage = process.memoryUsage();
    checks.memory = {
      status: memUsage.heapUsed < memUsage.heapTotal * 0.9,
      usedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      totalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
    };

    // Determine overall status
    const allHealthy = checks.database.status && checks.memory.status;
    const status: HealthStatus['status'] = allHealthy ? 'healthy' : 'degraded';

    const response: HealthStatus = {
      status,
      version: VERSION,
      uptime: Math.round((Date.now() - startTime) / 1000),
      checks,
    };

    reply.status(allHealthy ? 200 : 503);
    return response;
  });

  // Readiness check (for Kubernetes)
  fastify.get('/ready', async (request, reply) => {
    try {
      fastify.context.db.prepare('SELECT 1').get();
      return { ready: true };
    } catch {
      reply.status(503);
      return { ready: false };
    }
  });

  // Liveness check (for Kubernetes)
  fastify.get('/live', async () => {
    return { alive: true };
  });

  // Ollama / local model health check (for Setup page)
  fastify.get('/health/ollama', async (request, reply) => {
    try {
      // Try to import and use the local-llm module
      const { OllamaClient } = await import('../../inference/local-llm.js');
      const client = new OllamaClient({
        host: process.env.OLLAMA_HOST || '127.0.0.1',
        port: parseInt(process.env.OLLAMA_PORT || '11434', 10),
        timeout: 5000,
      });

      const available = await client.isAvailable(5000);
      if (!available) {
        return { online: false, hasModel: false, models: [] };
      }

      const models = await client.listModels();
      const modelNames = models.map((m: { name: string }) => m.name);
      // Check for the recommended free model (qwen3:32b or any qwen variant)
      const hasModel = modelNames.some(
        (name: string) => name.includes('qwen') || name.includes('llama') || name.includes('mistral'),
      );

      return {
        online: true,
        hasModel,
        models: modelNames,
        recommendedModel: 'qwen3:32b',
      };
    } catch (error) {
      return {
        online: false,
        hasModel: false,
        models: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // API info
  fastify.get('/', async () => {
    return {
      name: 'KIN API',
      version: VERSION,
      description: 'API for KIN AI Companion Platform',
      endpoints: {
        health: '/health',
        'health/ollama': '/health/ollama',
        ready: '/ready',
        live: '/live',
        docs: '/docs',
      },
    };
  });
};

export default healthRoutes;
