'use client';

import { GlassCard } from '@/components/ui/GlassCard';

interface SoulPreviewProps {
  companionName: string;
  companionEmoji: string;
  companionColor: string;
  traits: {
    warmth: number;
    formality: number;
    humor: number;
    directness: number;
    creativity: number;
    depth: number;
  };
  className?: string;
}

function generatePreview(traits: SoulPreviewProps['traits']): string {
  const { warmth, formality, humor, directness, creativity, depth } = traits;

  // Base message
  let base: string;

  if (warmth > 70 && humor > 70) {
    base = "Hey there! 👋 So glad you're here. Let's make something awesome together!";
  } else if (warmth > 70 && humor < 40) {
    base = "Hello! It's wonderful to have you here. I'm ready to help with whatever you need.";
  } else if (warmth < 30 && formality > 60) {
    base = "Good afternoon. How may I assist you with your project today?";
  } else if (warmth < 30 && formality < 40) {
    base = "Hey. What do you need?";
  } else {
    base = "Hi there! I'm here to help. What are you working on?";
  }

  // Append depth, directness, creativity modifiers
  if (depth > 70) {
    base += " I love getting into the details, so don't hesitate to go deep.";
  }
  if (directness > 70) {
    base += " I'll give you my honest take — no sugarcoating.";
  }
  if (creativity > 70) {
    base += " I always look for unconventional angles. 🎨";
  }

  return base;
}

const TRAIT_KEYS: (keyof SoulPreviewProps['traits'])[] = [
  'warmth',
  'formality',
  'humor',
  'directness',
  'creativity',
  'depth',
];

const TRAIT_LABELS: Record<keyof SoulPreviewProps['traits'], string> = {
  warmth: 'W',
  formality: 'F',
  humor: 'H',
  directness: 'D',
  creativity: 'C',
  depth: 'Dp',
};

export function SoulPreview({
  companionName,
  companionEmoji,
  companionColor,
  traits,
  className,
}: SoulPreviewProps) {
  const previewMessage = generatePreview(traits);

  return (
    <GlassCard className={`p-4 ${className ?? ''}`} hover={false}>
      {/* Header */}
      <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">
        Preview
      </p>

      {/* Mock chat bubble */}
      <div className="flex items-start gap-2">
        {/* Avatar */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base"
          style={{
            backgroundColor: `${companionColor}22`,
            border: `1px solid ${companionColor}44`,
          }}
        >
          {companionEmoji}
        </div>

        {/* Bubble */}
        <div className="flex flex-col gap-1 min-w-0">
          <span
            className="text-[10px] font-medium"
            style={{ color: companionColor }}
          >
            {companionName}
          </span>
          <div
            className="rounded-xl rounded-tl-none px-3 py-2 text-xs text-white/80 leading-relaxed border"
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            {previewMessage}
          </div>
        </div>
      </div>

      {/* Trait dots */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        {TRAIT_KEYS.map((key) => {
          const val = traits[key];
          const isExtreme = val > 70 || val < 30;
          const dotColor = isExtreme ? companionColor : 'rgba(255,255,255,0.2)';

          return (
            <div key={key} className="flex flex-col items-center gap-0.5">
              <div
                className="w-2 h-2 rounded-full transition-colors duration-300"
                style={{
                  backgroundColor: dotColor,
                  boxShadow: isExtreme ? `0 0 6px ${companionColor}88` : 'none',
                }}
                title={`${key}: ${val}`}
              />
              <span className="text-[8px] text-white/20">{TRAIT_LABELS[key]}</span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
