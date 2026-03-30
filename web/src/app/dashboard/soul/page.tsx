'use client';

// ============================================================================
// Soul Dashboard — Full soul editor with drift gauge and export.
// ============================================================================

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { SoulEditor } from '@/components/soul/SoulEditor';
import { SoulPreview } from '@/components/soul/SoulPreview';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useSoul } from '@/hooks/useSoul';
import { useAuth } from '@/providers/AuthProvider';
import { DEFAULT_SOUL_CONFIG } from '@/lib/types';
import type { SoulConfig } from '@/lib/types';

// ---------------------------------------------------------------------------
// Drift Gauge — circular progress indicator
// ---------------------------------------------------------------------------

function DriftGauge({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * score;
  const color = score > 0.8 ? '#00f0ff' : score > 0.5 ? '#ffd700' : '#ff00aa';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-24 w-24">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40" cy="40" r={radius}
            fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6"
          />
          <motion.circle
            cx="40" cy="40" r={radius}
            fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - filled }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold font-mono" style={{ color }}>
            {Math.round(score * 100)}%
          </span>
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-widest text-white/30">
        Soul Alignment
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SoulPage() {
  const { user } = useAuth();
  // TODO: get active companion from user context
  const [activeCompanionId] = useState('cipher');
  const { soul, loading, saving, error, save, calibrate, exportMarkdown } = useSoul(activeCompanionId);

  const [localConfig, setLocalConfig] = useState<SoulConfig>(
    soul?.config ?? { ...DEFAULT_SOUL_CONFIG },
  );
  const [calibrating, setCalibrating] = useState(false);

  // Sync local config when soul loads
  const currentConfig = soul?.config ?? localConfig;

  const handleChange = useCallback((partial: Partial<SoulConfig>) => {
    setLocalConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleSave = useCallback(async () => {
    await save(localConfig);
  }, [save, localConfig]);

  const handleCalibrate = useCallback(async () => {
    setCalibrating(true);
    await calibrate();
    setCalibrating(false);
  }, [calibrate]);

  const handleExport = useCallback(async () => {
    const md = await exportMarkdown();
    if (md) {
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `soul-${activeCompanionId}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [exportMarkdown, activeCompanionId]);

  const handleReset = useCallback(() => {
    setLocalConfig({ ...DEFAULT_SOUL_CONFIG });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Soul Editor
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Shape your companion&apos;s personality and behavior.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExport}>
            Export soul.md
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Soul'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-magenta/30 bg-magenta/10 px-4 py-3 text-sm text-magenta">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Editor — takes 2 columns */}
        <div className="lg:col-span-2">
          <SoulEditor
            mode="full"
            companionColor="#00f0ff"
            companionName="Cipher"
            companionEmoji="🐙"
            config={localConfig}
            onChange={handleChange}
          />
        </div>

        {/* Sidebar — preview + drift */}
        <div className="space-y-6">
          <SoulPreview
            companionName="Cipher"
            companionEmoji="🐙"
            companionColor="#00f0ff"
            traits={localConfig.traits}
          />

          {/* Drift Gauge */}
          <GlassCard className="flex flex-col items-center gap-4 p-6" hover={false}>
            <DriftGauge score={soul?.driftScore ?? 1.0} />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCalibrate}
              disabled={calibrating}
            >
              {calibrating ? 'Calibrating...' : 'Calibrate'}
            </Button>
            <p className="text-center text-[10px] text-white/20">
              Measures how closely your companion follows its soul config based on recent conversations.
            </p>
          </GlassCard>

          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            className="w-full text-center text-[11px] text-white/20 underline underline-offset-2 transition-colors hover:text-white/40"
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </div>
  );
}
