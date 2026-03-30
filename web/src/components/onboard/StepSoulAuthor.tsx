'use client';

// ============================================================================
// StepSoulAuthor — Onboarding Step 4: Give your companion a soul.
// Simplified soul editor with live preview.
// ============================================================================

import { motion } from 'framer-motion';
import { getCompanion, getCompanionColor } from '@/lib/companions';
import { SoulEditor } from '@/components/soul/SoulEditor';
import { SoulPreview } from '@/components/soul/SoulPreview';
import { Button } from '@/components/ui/Button';
import type { SoulConfig } from '@/lib/types';

interface StepSoulAuthorProps {
  selectedCompanionId: string | null;
  soulConfig: SoulConfig;
  onChange: (config: Partial<SoulConfig>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepSoulAuthor({
  selectedCompanionId,
  soulConfig,
  onChange,
  onNext,
  onBack,
}: StepSoulAuthorProps) {
  const companion = selectedCompanionId ? getCompanion(selectedCompanionId) : null;
  const companionColor = selectedCompanionId
    ? getCompanionColor(selectedCompanionId)
    : '#00f0ff';

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center"
    >
      <h1 className="mb-2 text-center font-display text-2xl font-bold text-white sm:text-3xl">
        <span className="bg-gradient-to-r from-cyan via-magenta to-gold bg-clip-text text-transparent">
          Give Your Companion a Soul
        </span>
      </h1>
      <p className="mb-8 text-center text-sm text-white/40">
        Shape how {companion?.name ?? 'your companion'} thinks and communicates.
      </p>

      {/* Soul Editor — onboard mode (traits + values + instructions only) */}
      <div className="mb-6 w-full">
        <SoulEditor
          mode="onboard"
          companionColor={companionColor}
          companionName={companion?.name ?? 'Companion'}
          companionEmoji={companion?.emoji ?? '🐙'}
          config={soulConfig}
          onChange={onChange}
        />
      </div>

      {/* Live Preview */}
      <div className="mb-8 w-full">
        <SoulPreview
          companionName={companion?.name ?? 'Companion'}
          companionEmoji={companion?.emoji ?? '🐙'}
          companionColor={companionColor}
          traits={soulConfig.traits}
        />
      </div>

      {/* Navigation */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext}>Continue</Button>
        </div>
        <button
          type="button"
          onClick={onNext}
          className="text-[11px] text-white/25 underline underline-offset-2 transition-colors hover:text-white/50"
        >
          Skip for now (use defaults)
        </button>
      </div>
    </motion.div>
  );
}
