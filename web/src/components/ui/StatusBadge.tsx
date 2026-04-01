'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

type SystemStatus = 'operational' | 'degraded';

const STATUS_CONFIG: Record<SystemStatus, { label: string; dotClass: string; textClass: string }> = {
  operational: {
    label: 'All Systems Operational',
    dotClass: 'bg-cyan',
    textClass: 'text-cyan/70',
  },
  degraded: {
    label: 'Degraded Performance',
    dotClass: 'bg-gold',
    textClass: 'text-gold/70',
  },
};

const POLL_INTERVAL = 60_000; // 60 seconds

export function StatusBadge() {
  const [status, setStatus] = useState<SystemStatus>('operational');

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      setStatus(response.ok ? 'operational' : 'degraded');
    } catch {
      setStatus('degraded');
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const config = STATUS_CONFIG[status];

  return (
    <div className="inline-flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-50',
            config.dotClass,
          )}
        />
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            config.dotClass,
          )}
        />
      </span>
      <span className={cn('text-xs font-medium', config.textClass)}>
        {config.label}
      </span>
    </div>
  );
}
