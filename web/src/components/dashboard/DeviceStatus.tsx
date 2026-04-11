'use client';

// ============================================================================
// DeviceStatus — Shows connected desktop device status, pairing, trust level.
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { kinApi } from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

interface DeviceInfo {
  deviceId: string;
  name: string;
  platform: 'windows' | 'macos' | 'linux';
  trustLevel: 0 | 1 | 2 | 3;
  online: boolean;
  lastSeen: number;
}

interface DeviceStatusProps {
  className?: string;
}

const TRUST_LABELS: Record<number, { label: string; color: 'cyan' | 'magenta' | 'gold' | 'muted'; desc: string }> = {
  0: { label: 'Observer', color: 'muted', desc: 'Can only observe and explain' },
  1: { label: 'Assisted', color: 'cyan', desc: 'Per-action approval required' },
  2: { label: 'Routine', color: 'magenta', desc: 'Low-risk actions auto-approved' },
  3: { label: 'Copilot', color: 'gold', desc: 'Full trusted access' },
};

const PLATFORM_ICONS: Record<string, string> = {
  windows: '🪟',
  macos: '🍎',
  linux: '🐧',
};

// ============================================================================
// Component
// ============================================================================

export function DeviceStatus({ className }: DeviceStatusProps) {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch device status
  const fetchDevices = useCallback(async () => {
    try {
      const result = await kinApi.get<{ devices: DeviceInfo[] }>('/device/status');
      setDevices(result.devices);
    } catch {
      // Silently fail — devices may not be configured yet
    }
  }, []);

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 10_000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchDevices]);

  // Generate pairing code
  const handlePair = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await kinApi.post<{ code: string }>('/device/pair', {});
      setPairingCode(result.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate pairing code');
    } finally {
      setLoading(false);
    }
  }, []);

  // Update trust level
  const handleTrustChange = useCallback(async (deviceId: string, level: number) => {
    try {
      await kinApi.post('/device/trust-level', { deviceId, trustLevel: level });
      fetchDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update trust level');
    }
  }, [fetchDevices]);

  // Unpair device
  const handleUnpair = useCallback(async (deviceId: string) => {
    try {
      await kinApi.post('/device/unpair', { deviceId });
      fetchDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unpair device');
    }
  }, [fetchDevices]);

  return (
    <GlassCard className={`p-6 ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-white">
          Connected Devices
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePair}
          loading={loading}
        >
          + Pair Device
        </Button>
      </div>

      {/* Pairing Code Display */}
      {pairingCode && (
        <div className="mb-4 rounded-2xl border border-cyan/20 bg-cyan/5 p-4 text-center">
          <p className="text-xs text-white/50 uppercase tracking-wider mb-2">
            Enter this code in your KIN Desktop App
          </p>
          <p className="font-mono text-3xl font-bold tracking-[0.3em] text-cyan">
            {pairingCode}
          </p>
          <p className="text-xs text-white/30 mt-2">
            Expires in 5 minutes
          </p>
          <button
            onClick={() => setPairingCode(null)}
            className="mt-2 text-xs text-white/20 hover:text-white/40 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-magenta text-center mb-3 animate-pulse">{error}</p>
      )}

      {/* Device List */}
      {devices.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-3 opacity-30">🖥️</div>
          <p className="text-sm text-white/30">
            No devices connected
          </p>
          <p className="text-xs text-white/15 mt-1">
            Download the KIN Desktop App and pair your computer
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => {
            const trust = TRUST_LABELS[device.trustLevel] ?? TRUST_LABELS[0]!;
            const icon = PLATFORM_ICONS[device.platform] ?? '💻';
            const timeSince = Date.now() - device.lastSeen;
            const lastSeenText = timeSince < 60_000
              ? 'Just now'
              : timeSince < 3600_000
                ? `${Math.floor(timeSince / 60_000)}m ago`
                : `${Math.floor(timeSince / 3600_000)}h ago`;

            return (
              <div
                key={device.deviceId}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-300 hover:border-white/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <span className="font-display text-sm font-medium text-white">
                      {device.name}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        device.online ? 'bg-green-400 animate-pulse' : 'bg-white/20'
                      }`}
                    />
                  </div>
                  <Badge color={trust.color}>{trust.label}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/20">
                    {device.online ? 'Connected' : `Last seen ${lastSeenText}`}
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Trust level selector */}
                    <select
                      value={device.trustLevel}
                      onChange={(e) => handleTrustChange(device.deviceId, Number(e.target.value))}
                      className="text-[10px] bg-transparent border border-white/10 rounded-lg px-2 py-1 text-white/40 outline-none focus:border-white/20"
                    >
                      <option value={0}>L0: Observer</option>
                      <option value={1}>L1: Assisted</option>
                      <option value={2}>L2: Routine</option>
                      <option value={3}>L3: Copilot</option>
                    </select>

                    <button
                      onClick={() => handleUnpair(device.deviceId)}
                      className="text-[10px] text-white/15 hover:text-magenta transition-colors"
                      title="Unpair device"
                    >
                      Unpair
                    </button>
                  </div>
                </div>

                <p className="text-[9px] text-white/15 mt-1">{trust.desc}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Download CTA */}
      <div className="mt-4 pt-4 border-t border-white/[0.06] text-center">
        <a
          href="https://github.com/kr8tiv-ai/kin-desktop/releases/latest"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/25 hover:text-cyan transition-colors duration-300"
        >
          Download KIN Desktop App →
        </a>
      </div>
    </GlassCard>
  );
}
