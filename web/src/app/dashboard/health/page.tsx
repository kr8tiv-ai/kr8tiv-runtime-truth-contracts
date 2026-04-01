'use client';

// ============================================================================
// System Health — Friendly monitoring of your KIN's wellbeing.
// Written for everyone, even a 10-year-old.
// ============================================================================

import { motion } from 'framer-motion';
import { useHealth } from '@/hooks/useHealth';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

// ---------------------------------------------------------------------------
// Helpers — kid-friendly labels
// ---------------------------------------------------------------------------

function statusColor(status: string): 'cyan' | 'gold' | 'magenta' | 'muted' {
  switch (status) {
    case 'ok':
    case 'healthy':
      return 'cyan';
    case 'warn':
    case 'degraded':
      return 'gold';
    case 'error':
    case 'offline':
      return 'magenta';
    default:
      return 'muted';
  }
}

function statusEmoji(status: string): string {
  switch (status) {
    case 'ok':
    case 'healthy':
      return '\uD83D\uDFE2';
    case 'warn':
    case 'degraded':
      return '\uD83D\uDFE1';
    case 'error':
    case 'offline':
      return '\uD83D\uDD34';
    default:
      return '\u26AA';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'ok':
    case 'healthy':
      return 'Awake & Healthy';
    case 'warn':
    case 'degraded':
      return 'A Little Sleepy';
    case 'error':
      return 'Needs Attention';
    case 'offline':
      return 'Sleeping';
    default:
      return 'Unknown';
  }
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 1000) return 'Just now';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return `${d} days, ${h} hours`;
}

function usagePercent(used: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((used / total) * 100);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HealthPage() {
  const { health, loading, error, refresh } = useHealth();

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Skeleton variant="card" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-white/60">{error}</p>
        <Button variant="outline" onClick={refresh}>
          Try Again
        </Button>
      </div>
    );
  }

  const overallStatus = health?.overallStatus ?? 'offline';
  const services = health?.services ?? [];
  const sys = health?.system ?? {
    cpuUsagePercent: 0,
    memUsedMB: 0,
    memTotalMB: 0,
    diskFreeMB: 0,
    uptimeSeconds: 0,
  };

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">
            How&apos;s Your KIN? {statusEmoji(overallStatus)}
          </h1>
          <p className="mt-1 text-white/50">
            Check in on your companion&apos;s health and happiness.
          </p>
        </div>
        <Badge color={statusColor(overallStatus)} className="text-sm">
          {statusLabel(overallStatus)}
        </Badge>
      </div>

      {/* Main Status Card */}
      <GlassCard className="p-8" hover={false}>
        <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-start sm:gap-6">
          {/* Big pulsing indicator */}
          <div className="relative mb-4 sm:mb-0">
            <div className="relative flex h-20 w-20 items-center justify-center">
              {overallStatus !== 'offline' && (
                <span
                  className={`absolute h-20 w-20 rounded-full ${
                    overallStatus === 'healthy'
                      ? 'bg-cyan animate-ping opacity-20'
                      : overallStatus === 'degraded'
                        ? 'bg-gold animate-ping opacity-20'
                        : 'bg-magenta/20'
                  }`}
                />
              )}
              <span className="text-5xl">
                {overallStatus === 'offline' ? '\uD83D\uDE34' :
                 overallStatus === 'healthy' ? '\uD83D\uDE0A' :
                 overallStatus === 'degraded' ? '\uD83E\uDD14' :
                 '\uD83D\uDE1F'}
              </span>
            </div>
          </div>

          <div className="flex-1">
            {overallStatus === 'offline' ? (
              <>
                <h2 className="font-display text-xl font-bold text-white mb-2">
                  Your KIN is sleeping right now
                </h2>
                <p className="text-white/50 text-sm mb-4 max-w-md">
                  Don&apos;t worry! Your KIN will wake up automatically once everything is set up.
                  All your conversations and memories are safe.
                </p>
                <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                  <Button variant="outline" size="sm" onClick={refresh}>
                    Check Again
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-display text-xl font-bold text-white mb-2">
                  {overallStatus === 'healthy'
                    ? 'Everything looks great!'
                    : 'Your KIN needs a little help'}
                </h2>
                <div className="flex flex-wrap gap-6 text-sm text-white/50">
                  <div>
                    <span className="text-white/30">Last check-in</span>
                    <p className="font-mono text-white/70">
                      {relativeTime(health?.lastHeartbeat ?? null)}
                    </p>
                  </div>
                  {health?.kinVersion && (
                    <div>
                      <span className="text-white/30">Version</span>
                      <p className="font-mono text-white/70">{health.kinVersion}</p>
                    </div>
                  )}
                  {sys.uptimeSeconds > 0 && (
                    <div>
                      <span className="text-white/30">Running for</span>
                      <p className="font-mono text-white/70">{formatUptime(sys.uptimeSeconds)}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Services Grid */}
      {services.length > 0 && (
        <div>
          <h2 className="mb-4 font-display text-lg font-semibold text-white">
            Services
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((svc) => (
              <GlassCard key={svc.name} className="p-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{statusEmoji(svc.status)}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white/80">
                      {svc.label}
                    </p>
                    <p className="text-xs text-white/40">{svc.detail}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* System Resources */}
      {overallStatus !== 'offline' && (
        <GlassCard className="p-6" hover={false}>
          <h2 className="font-display text-lg font-semibold text-white">
            How Hard Is Your KIN Working?
          </h2>
          <div className="mt-4 space-y-5">
            <ResourceBar
              label="\uD83E\uDDE0 Brain Power"
              percent={sys.cpuUsagePercent}
              detail={`${sys.cpuUsagePercent}% used`}
            />
            <ResourceBar
              label="\uD83D\uDCBE Memory"
              percent={usagePercent(sys.memUsedMB, sys.memTotalMB)}
              detail={`${sys.memUsedMB} / ${sys.memTotalMB} MB`}
            />
            {sys.diskFreeMB > 0 && (
              <ResourceBar
                label="\uD83D\uDCE6 Storage"
                percent={100}
                detail={`${(sys.diskFreeMB / 1024).toFixed(1)} GB free`}
                color="cyan"
              />
            )}
          </div>
        </GlassCard>
      )}

      {/* Recent Events */}
      {health?.recentEvents && health.recentEvents.length > 0 && (
        <GlassCard className="p-6" hover={false}>
          <h2 className="font-display text-lg font-semibold text-white">
            Recent Activity
          </h2>
          <div className="mt-4 space-y-2">
            {health.recentEvents.map((evt, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.01] px-4 py-2.5 text-sm"
              >
                <span>{statusEmoji(evt.to)}</span>
                <span className="text-white/50">
                  {evt.service}: {evt.from} {'\u2192'} {evt.to}
                </span>
                <span className="ml-auto text-xs text-white/30">
                  {relativeTime(evt.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Resource Bar sub-component
// ---------------------------------------------------------------------------

function ResourceBar({
  label,
  percent,
  detail,
  color = 'auto',
}: {
  label: string;
  percent: number;
  detail: string;
  color?: 'auto' | 'cyan' | 'gold' | 'magenta';
}) {
  const barColor =
    color === 'auto'
      ? percent > 90
        ? 'bg-magenta'
        : percent > 70
          ? 'bg-gold'
          : 'bg-cyan'
      : `bg-${color}`;

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/60">{label}</span>
        <span className="font-mono text-white/40">{detail}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}
