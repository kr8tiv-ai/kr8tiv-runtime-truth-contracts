'use client';

// ============================================================================
// System Health — Real-time monitoring of local KIN services.
// ============================================================================

import { motion } from 'framer-motion';
import { useHealth } from '@/hooks/useHealth';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

// ---------------------------------------------------------------------------
// Helpers
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

function statusDot(status: string): string {
  switch (status) {
    case 'ok':
      return 'bg-cyan';
    case 'warn':
      return 'bg-gold';
    case 'error':
      return 'bg-magenta';
    default:
      return 'bg-white/20';
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
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
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
          Retry
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
            System Health
          </h1>
          <p className="mt-1 text-white/50">
            Real-time monitoring of your local KIN services.
          </p>
        </div>
        <Badge color={statusColor(overallStatus)} className="text-sm">
          {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
        </Badge>
      </div>

      {/* Connection Card */}
      <GlassCard className="p-6" hover={false}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Pulsing indicator */}
            <div className="relative flex h-4 w-4 items-center justify-center">
              <span
                className={`absolute h-4 w-4 rounded-full ${
                  overallStatus === 'healthy'
                    ? 'bg-cyan animate-ping opacity-30'
                    : overallStatus === 'degraded'
                      ? 'bg-gold animate-ping opacity-30'
                      : 'bg-magenta/30'
                }`}
              />
              <span
                className={`relative h-3 w-3 rounded-full ${
                  overallStatus === 'healthy'
                    ? 'bg-cyan'
                    : overallStatus === 'degraded'
                      ? 'bg-gold'
                      : 'bg-magenta'
                }`}
              />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                Connection
              </h2>
              <p className="text-sm text-white/50">
                Last heartbeat: {relativeTime(health?.lastHeartbeat ?? null)}
              </p>
            </div>
          </div>
          <div className="flex gap-6 text-sm text-white/50">
            <div>
              <span className="text-white/30">Latency</span>
              <p className="font-mono text-white/70">
                {health?.latencyMs ? `${Math.round(health.latencyMs / 1000)}s` : '--'}
              </p>
            </div>
            <div>
              <span className="text-white/30">Version</span>
              <p className="font-mono text-white/70">
                {health?.kinVersion ?? '--'}
              </p>
            </div>
            <div>
              <span className="text-white/30">Uptime</span>
              <p className="font-mono text-white/70">
                {sys.uptimeSeconds ? formatUptime(sys.uptimeSeconds) : '--'}
              </p>
            </div>
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
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDot(svc.status)}`}
                  />
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

      {services.length === 0 && overallStatus === 'offline' && (
        <GlassCard className="p-8 text-center" hover={false}>
          <p className="text-lg text-white/40">
            No heartbeat received yet.
          </p>
          <p className="mt-2 text-sm text-white/30">
            Start the heartbeat client on your local machine to see service status here.
          </p>
          <pre className="mx-auto mt-4 max-w-md rounded-lg border border-white/5 bg-white/[0.02] p-3 text-left text-xs text-white/50">
            npx tsx runtime/heartbeat-client.ts
          </pre>
        </GlassCard>
      )}

      {/* System Resources */}
      {overallStatus !== 'offline' && (
        <GlassCard className="p-6" hover={false}>
          <h2 className="font-display text-lg font-semibold text-white">
            System Resources
          </h2>
          <div className="mt-4 space-y-5">
            <ResourceBar
              label="CPU"
              percent={sys.cpuUsagePercent}
              detail={`${sys.cpuUsagePercent}%`}
            />
            <ResourceBar
              label="Memory"
              percent={usagePercent(sys.memUsedMB, sys.memTotalMB)}
              detail={`${sys.memUsedMB} / ${sys.memTotalMB} MB`}
            />
            {sys.diskFreeMB > 0 && (
              <ResourceBar
                label="Disk Free"
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
            Recent Events
          </h2>
          <div className="mt-4 space-y-2">
            {health.recentEvents.map((evt, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.01] px-4 py-2.5 text-sm"
              >
                <Badge color={statusColor(evt.to)} className="text-[10px]">
                  {evt.to}
                </Badge>
                <span className="text-white/50">
                  {evt.service}: {evt.from} → {evt.to}
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
