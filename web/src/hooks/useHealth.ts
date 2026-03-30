'use client';

// ============================================================================
// useHealth — Hook for health dashboard data with auto-refresh.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { kinApi } from '@/lib/api';
import type { HealthDashboardData } from '@/lib/types';

interface UseHealthResult {
  /** Health dashboard data */
  health: HealthDashboardData | null;
  /** Loading state (only true on first load) */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Manual refresh */
  refresh: () => Promise<void>;
}

const AUTO_REFRESH_MS = 10_000; // 10 seconds

export function useHealth(): UseHealthResult {
  const [health, setHealth] = useState<HealthDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHealth = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      setError(null);
      const data = await kinApi.get<HealthDashboardData>('/heartbeat/status');
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health data');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth(true);

    intervalRef.current = setInterval(() => {
      fetchHealth(false);
    }, AUTO_REFRESH_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchHealth]);

  return {
    health,
    loading,
    error,
    refresh: () => fetchHealth(true),
  };
}
