/**
 * Projects Routes - Website project management
 *
 * CRUD for user website projects (stored in the `projects` table) plus a
 * lightweight deploy trigger endpoint. Files are stored as a JSON blob in the
 * `files` column and returned/accepted as plain objects.
 */

import { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectParams {
  projectId: string;
}

interface ListQuery {
  limit?: number;
  offset?: number;
}

interface CreateBody {
  name: string;
  description?: string;
  projectType?: 'website' | 'landing_page' | 'portfolio' | 'blog' | 'other';
  companionId?: string;
}

interface UpdateBody {
  name?: string;
  description?: string;
  status?: 'draft' | 'in_progress' | 'preview' | 'deployed' | 'archived';
  files?: Record<string, unknown>;
  previewUrl?: string;
  deployUrl?: string;
}

interface DeployBody {
  provider: 'vercel' | 'netlify' | 'cloudflare';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_COMPANION = 'cipher'; // Cipher is the web-design companion

function parseFilesJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatProject(p: any) {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    projectType: p.project_type,
    status: p.status,
    companionId: p.companion_id,
    previewUrl: p.preview_url ?? null,
    deployUrl: p.deploy_url ?? null,
    deployProvider: p.deploy_provider ?? null,
    files: parseFilesJson(p.files),
    createdAt: new Date(p.created_at).toISOString(),
    updatedAt: new Date(p.updated_at).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const projectRoutes: FastifyPluginAsync = async (fastify) => {

  // -------------------------------------------------------------------------
  // GET /projects  — list with pagination
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: ListQuery }>('/projects', async (request) => {
    const userId = (request.user as { userId: string }).userId;
    const rawLimit = Number(request.query.limit ?? 20);
    const rawOffset = Number(request.query.offset ?? 0);
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const offset = Math.max(rawOffset, 0);

    const total = (fastify.context.db.prepare(`
      SELECT COUNT(*) as count FROM projects WHERE user_id = ?
    `).get(userId) as any).count as number;

    const rows = fastify.context.db.prepare(`
      SELECT
        id, name, description, project_type, status, companion_id,
        preview_url, deploy_url, deploy_provider,
        created_at, updated_at
      FROM projects
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset) as any[];

    return {
      projects: rows.map(formatProject),
      pagination: { total, limit, offset },
    };
  });

  // -------------------------------------------------------------------------
  // GET /projects/:projectId — single project with files
  // -------------------------------------------------------------------------
  fastify.get<{ Params: ProjectParams }>('/projects/:projectId', async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;
    const { projectId } = request.params;

    const project = fastify.context.db.prepare(`
      SELECT * FROM projects WHERE id = ? AND user_id = ?
    `).get(projectId, userId) as any;

    if (!project) {
      reply.status(404);
      return { error: 'Project not found' };
    }

    return { project: formatProject(project) };
  });

  // -------------------------------------------------------------------------
  // POST /projects — create
  // -------------------------------------------------------------------------
  fastify.post<{ Body: CreateBody }>('/projects', async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;
    const {
      name,
      description,
      projectType = 'website',
      companionId = DEFAULT_COMPANION,
    } = request.body ?? {};

    if (!name?.trim()) {
      reply.status(400);
      return { error: 'name is required' };
    }

    const validTypes = ['website', 'landing_page', 'portfolio', 'blog', 'other'];
    if (!validTypes.includes(projectType)) {
      reply.status(400);
      return { error: `projectType must be one of: ${validTypes.join(', ')}` };
    }

    // Validate companion exists
    const companion = fastify.context.db.prepare(`
      SELECT id FROM companions WHERE id = ?
    `).get(companionId) as any;

    if (!companion) {
      reply.status(400);
      return { error: 'Invalid companionId' };
    }

    const id = `proj-${crypto.randomUUID()}`;

    fastify.context.db.prepare(`
      INSERT INTO projects (id, user_id, companion_id, name, description, project_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, companionId, name.trim(), description ?? null, projectType);

    const project = fastify.context.db.prepare(`
      SELECT * FROM projects WHERE id = ?
    `).get(id) as any;

    reply.status(201);
    return { success: true, project: formatProject(project) };
  });

  // -------------------------------------------------------------------------
  // PUT /projects/:projectId — update
  // -------------------------------------------------------------------------
  fastify.put<{ Params: ProjectParams; Body: UpdateBody }>(
    '/projects/:projectId',
    async (request, reply) => {
      const userId = (request.user as { userId: string }).userId;
      const { projectId } = request.params;
      const { name, description, status, files, previewUrl, deployUrl } = request.body ?? {};

      // Verify ownership
      const existing = fastify.context.db.prepare(`
        SELECT id FROM projects WHERE id = ? AND user_id = ?
      `).get(projectId, userId) as any;

      if (!existing) {
        reply.status(404);
        return { error: 'Project not found' };
      }

      const validStatuses = ['draft', 'in_progress', 'preview', 'deployed', 'archived'];
      if (status !== undefined && !validStatuses.includes(status)) {
        reply.status(400);
        return { error: `status must be one of: ${validStatuses.join(', ')}` };
      }

      // Build SET clause dynamically for only the provided fields
      const updates: string[] = [];
      const values: (string | number | null)[] = [];

      if (name !== undefined) {
        if (!name.trim()) {
          reply.status(400);
          return { error: 'name cannot be empty' };
        }
        updates.push('name = ?');
        values.push(name.trim());
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }
      if (files !== undefined) {
        updates.push('files = ?');
        values.push(JSON.stringify(files));
      }
      if (previewUrl !== undefined) {
        updates.push('preview_url = ?');
        values.push(previewUrl);
      }
      if (deployUrl !== undefined) {
        updates.push('deploy_url = ?');
        values.push(deployUrl);
      }

      if (updates.length === 0) {
        reply.status(400);
        return { error: 'No fields provided to update' };
      }

      updates.push("updated_at = strftime('%s', 'now') * 1000");
      values.push(projectId, userId);

      fastify.context.db.prepare(`
        UPDATE projects SET ${updates.join(', ')} WHERE id = ? AND user_id = ?
      `).run(...values);

      const updated = fastify.context.db.prepare(`
        SELECT * FROM projects WHERE id = ?
      `).get(projectId) as any;

      return { success: true, project: formatProject(updated) };
    },
  );

  // -------------------------------------------------------------------------
  // DELETE /projects/:projectId — delete (verify ownership)
  // -------------------------------------------------------------------------
  fastify.delete<{ Params: ProjectParams }>('/projects/:projectId', async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;
    const { projectId } = request.params;

    const result = fastify.context.db.prepare(`
      DELETE FROM projects WHERE id = ? AND user_id = ?
    `).run(projectId, userId);

    if (result.changes === 0) {
      reply.status(404);
      return { error: 'Project not found' };
    }

    return { success: true };
  });

  // -------------------------------------------------------------------------
  // POST /projects/:projectId/deploy — trigger deployment
  // -------------------------------------------------------------------------
  fastify.post<{ Params: ProjectParams; Body: DeployBody }>(
    '/projects/:projectId/deploy',
    async (request, reply) => {
      const userId = (request.user as { userId: string }).userId;
      const { projectId } = request.params;
      const { provider } = request.body ?? {};

      const validProviders = ['vercel', 'netlify', 'cloudflare'];
      if (!provider || !validProviders.includes(provider)) {
        reply.status(400);
        return { error: `provider must be one of: ${validProviders.join(', ')}` };
      }

      const project = fastify.context.db.prepare(`
        SELECT id, status, files FROM projects WHERE id = ? AND user_id = ?
      `).get(projectId, userId) as any;

      if (!project) {
        reply.status(404);
        return { error: 'Project not found' };
      }

      if (!project.files) {
        reply.status(400);
        return { error: 'Project has no files to deploy' };
      }

      // Mark as in_progress and record chosen provider
      fastify.context.db.prepare(`
        UPDATE projects
        SET status          = 'in_progress',
            deploy_provider = ?,
            updated_at      = strftime('%s', 'now') * 1000
        WHERE id = ? AND user_id = ?
      `).run(provider, projectId, userId);

      // Future integration point: enqueue a background job here
      // (e.g. via Vercel Queues, BullMQ, or a simple DB jobs table)
      const deployId = `deploy-${crypto.randomUUID()}`;

      return {
        status: 'queued',
        message: 'Deployment starting...',
        deployId,
        provider,
        projectId,
      };
    },
  );
};

export default projectRoutes;
