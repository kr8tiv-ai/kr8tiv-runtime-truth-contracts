'use client';

// ============================================================================
// useSkills — Hook for skills marketplace data and actions.
// ============================================================================

import { useCallback, useEffect, useState } from 'react';
import { kinApi } from '@/lib/api';
import type { Skill, SkillRequest } from '@/lib/types';

interface UseSkillsResult {
  /** All approved skills (catalog) */
  skills: Skill[];
  /** User's installed skills */
  mySkills: Skill[];
  /** User's skill requests */
  requests: SkillRequest[];
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh all data */
  refresh: () => Promise<void>;
  /** Toggle a skill on/off */
  toggleSkill: (skillId: string, active: boolean, companionId?: string) => Promise<void>;
  /** Submit a GitHub repo for skill review */
  submitRequest: (githubRepoUrl: string) => Promise<{ id: string; status: string }>;
  /** Start Stripe checkout for a skill request */
  checkoutRequest: (requestId: string) => Promise<void>;
}

export function useSkills(): UseSkillsResult {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [mySkills, setMySkills] = useState<Skill[]>([]);
  const [requests, setRequests] = useState<SkillRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [catalogData, myData, requestData] = await Promise.all([
        kinApi.get<Skill[]>('/skills'),
        kinApi.get<Skill[]>('/skills/mine'),
        kinApi.get<SkillRequest[]>('/skills/request/mine'),
      ]);
      setSkills(catalogData);
      setMySkills(myData);
      setRequests(requestData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const toggleSkill = useCallback(
    async (skillId: string, active: boolean, companionId?: string) => {
      await kinApi.post(`/skills/${skillId}/toggle`, { active, companionId });
      // Optimistically update local state
      setSkills((prev) =>
        prev.map((s) =>
          s.id === skillId ? { ...s, isInstalled: true, isActive: active } : s,
        ),
      );
      setMySkills((prev) => {
        const existing = prev.find((s) => s.id === skillId);
        if (existing) {
          return prev.map((s) =>
            s.id === skillId ? { ...s, isActive: active } : s,
          );
        }
        const fromCatalog = skills.find((s) => s.id === skillId);
        if (fromCatalog) {
          return [...prev, { ...fromCatalog, isInstalled: true, isActive: active }];
        }
        return prev;
      });
    },
    [skills],
  );

  const submitRequest = useCallback(
    async (githubRepoUrl: string) => {
      const result = await kinApi.post<{ id: string; status: string }>(
        '/skills/request',
        { githubRepoUrl },
      );
      // Refresh requests list
      const updated = await kinApi.get<SkillRequest[]>('/skills/request/mine');
      setRequests(updated);
      return result;
    },
    [],
  );

  const checkoutRequest = useCallback(async (requestId: string) => {
    const result = await kinApi.post<{ url: string | null; message?: string }>(
      `/skills/request/${requestId}/checkout`,
    );
    if (result.url) {
      window.location.href = result.url;
    }
  }, []);

  return {
    skills,
    mySkills,
    requests,
    loading,
    error,
    refresh: fetchAll,
    toggleSkill,
    submitRequest,
    checkoutRequest,
  };
}
