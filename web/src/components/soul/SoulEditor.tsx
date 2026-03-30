'use client';

import { useState, useRef } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { TraitSlider } from '@/components/soul/TraitSlider';
import type { SoulConfig, SoulTraits } from '@/lib/types';

interface SoulEditorProps {
  mode: 'onboard' | 'full';
  companionColor: string;
  companionName: string;
  companionEmoji: string;
  config: SoulConfig;
  onChange: (config: Partial<SoulConfig>) => void;
}

const TRAIT_SLIDERS: Array<{
  key: keyof SoulTraits;
  label: string;
  leftLabel: string;
  rightLabel: string;
}> = [
  { key: 'warmth', label: 'Warmth', leftLabel: 'Reserved', rightLabel: 'Warm' },
  { key: 'formality', label: 'Formality', leftLabel: 'Casual', rightLabel: 'Formal' },
  { key: 'humor', label: 'Humor', leftLabel: 'Serious', rightLabel: 'Playful' },
  { key: 'directness', label: 'Directness', leftLabel: 'Diplomatic', rightLabel: 'Direct' },
  { key: 'creativity', label: 'Creativity', leftLabel: 'Practical', rightLabel: 'Creative' },
  { key: 'depth', label: 'Depth', leftLabel: 'Brief', rightLabel: 'Detailed' },
];

const ALL_VALUES = [
  'Honesty', 'Growth', 'Efficiency', 'Creativity',
  'Kindness', 'Humor', 'Precision', 'Independence',
  'Curiosity', 'Patience', 'Ambition', 'Simplicity',
];

const VOCABULARY_OPTIONS: Array<{ value: SoulConfig['style']['vocabulary']; label: string }> = [
  { value: 'simple', label: 'Simple' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'advanced', label: 'Advanced' },
];

const LENGTH_OPTIONS: Array<{ value: SoulConfig['style']['responseLength']; label: string }> = [
  { value: 'concise', label: 'Concise' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'detailed', label: 'Detailed' },
];

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">
      {children}
    </p>
  );
}

interface TagInputProps {
  label: string;
  placeholder: string;
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  companionColor: string;
}

function TagInput({ label, placeholder, tags, onAdd, onRemove, companionColor }: TagInputProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = draft.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onAdd(trimmed);
        setDraft('');
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-white/60 font-medium">{label}</label>

      {/* Existing tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border"
              style={{
                borderColor: `${companionColor}44`,
                backgroundColor: `${companionColor}15`,
                color: companionColor,
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemove(tag)}
                className="ml-0.5 text-white/40 hover:text-white/80 transition-colors leading-none"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/80 placeholder:text-white/20 outline-none transition-colors focus:border-[--companion-color]"
        style={{ '--companion-color': companionColor } as React.CSSProperties}
      />
    </div>
  );
}

interface ToggleGroupProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  selected: T;
  onSelect: (value: T) => void;
  companionColor: string;
}

function ToggleGroup<T extends string>({
  options,
  selected,
  onSelect,
  companionColor,
}: ToggleGroupProps<T>) {
  return (
    <div className="flex rounded-md overflow-hidden border border-white/10">
      {options.map((opt) => {
        const isSelected = opt.value === selected;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className="flex-1 px-2 py-1.5 text-[10px] font-medium transition-all duration-150"
            style={
              isSelected
                ? {
                    backgroundColor: `${companionColor}22`,
                    color: companionColor,
                    borderBottom: `1px solid ${companionColor}`,
                  }
                : {
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    color: 'rgba(255,255,255,0.4)',
                  }
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface EmojiToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  companionColor: string;
}

function EmojiToggle({ enabled, onToggle, companionColor }: EmojiToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      className="flex items-center gap-2"
      aria-pressed={enabled}
    >
      <div
        className="relative w-9 h-5 rounded-full transition-colors duration-200"
        style={{
          backgroundColor: enabled ? `${companionColor}55` : 'rgba(255,255,255,0.1)',
        }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
          style={{
            left: enabled ? 'calc(100% - 18px)' : '2px',
            backgroundColor: enabled ? companionColor : 'rgba(255,255,255,0.4)',
            boxShadow: enabled ? `0 0 6px ${companionColor}88` : 'none',
          }}
        />
      </div>
      <span className="text-[10px] text-white/40">Emoji</span>
    </button>
  );
}

// ── Main Editor ─────────────────────────────────────────────────────────────

export function SoulEditor({
  mode,
  companionColor,
  companionName,
  companionEmoji,
  config,
  onChange,
}: SoulEditorProps) {
  const MAX_VALUES = 5;
  const MAX_INSTRUCTIONS = 500;

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleTraitChange(key: keyof SoulTraits, val: number) {
    onChange({ traits: { ...config.traits, [key]: val } });
  }

  function handleValueToggle(value: string) {
    const current = config.values ?? [];
    if (current.includes(value)) {
      onChange({ values: current.filter((v) => v !== value) });
    } else if (current.length < MAX_VALUES) {
      onChange({ values: [...current, value] });
    }
  }

  function handleInstructionsChange(text: string) {
    if (text.length <= MAX_INSTRUCTIONS) {
      onChange({ customInstructions: text });
    }
  }

  function handleAddAntiPattern(tag: string) {
    onChange({ antiPatterns: [...(config.antiPatterns ?? []), tag] });
  }

  function handleRemoveAntiPattern(tag: string) {
    onChange({ antiPatterns: (config.antiPatterns ?? []).filter((t) => t !== tag) });
  }

  function handleAddBoundary(tag: string) {
    onChange({ boundaries: [...(config.boundaries ?? []), tag] });
  }

  function handleRemoveBoundary(tag: string) {
    onChange({ boundaries: (config.boundaries ?? []).filter((t) => t !== tag) });
  }

  function handleStyleChange<K extends keyof SoulConfig['style']>(
    key: K,
    value: SoulConfig['style'][K],
  ) {
    onChange({ style: { ...config.style, [key]: value } });
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">

      {/* ── 1. Trait Sliders ─────────────────────────────────────────────── */}
      <GlassCard hover={false} className="p-4">
        <SectionLabel>Personality Traits</SectionLabel>
        <div className="flex flex-col gap-5">
          {TRAIT_SLIDERS.map(({ key, label, leftLabel, rightLabel }) => (
            <TraitSlider
              key={key}
              label={label}
              leftLabel={leftLabel}
              rightLabel={rightLabel}
              value={config.traits[key]}
              onChange={(val) => handleTraitChange(key, val)}
              color={companionColor}
            />
          ))}
        </div>
      </GlassCard>

      {/* ── 2. Values Picker ─────────────────────────────────────────────── */}
      <GlassCard hover={false} className="p-4">
        <SectionLabel>Core Values</SectionLabel>
        <p className="text-[10px] text-white/30 mb-3">
          Pick up to {MAX_VALUES} — {config.values.length}/{MAX_VALUES} selected
        </p>
        <div className="grid grid-cols-3 gap-2">
          {ALL_VALUES.map((val) => {
            const isSelected = config.values.includes(val);
            const atMax = config.values.length >= MAX_VALUES && !isSelected;
            return (
              <button
                key={val}
                type="button"
                disabled={atMax}
                onClick={() => handleValueToggle(val)}
                className="px-2 py-1.5 rounded-full text-[10px] font-medium border transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                style={
                  isSelected
                    ? {
                        borderColor: companionColor,
                        backgroundColor: `${companionColor}15`,
                        color: companionColor,
                      }
                    : {
                        borderColor: 'rgba(255,255,255,0.10)',
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        color: 'rgba(255,255,255,0.40)',
                      }
                }
              >
                {val}
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* ── 3. Custom Instructions ───────────────────────────────────────── */}
      <GlassCard hover={false} className="p-4">
        <SectionLabel>Custom Instructions</SectionLabel>
        <div className="relative">
          <textarea
            value={config.customInstructions}
            onChange={(e) => handleInstructionsChange(e.target.value)}
            placeholder={`Tell your companion how to behave... (e.g., 'Always explain with analogies', 'Challenge my assumptions')`}
            rows={4}
            className="w-full resize-none rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/80 placeholder:text-white/20 outline-none transition-colors focus:border-[--companion-color] leading-relaxed"
            style={{ '--companion-color': companionColor } as React.CSSProperties}
          />
          <span className="absolute bottom-2 right-3 text-[9px] text-white/20 font-mono pointer-events-none">
            {config.customInstructions.length}/{MAX_INSTRUCTIONS}
          </span>
        </div>
      </GlassCard>

      {/* ── Full mode extras ─────────────────────────────────────────────── */}
      {mode === 'full' && (
        <>
          {/* ── 4. Anti-Patterns ─────────────────────────────────────────── */}
          <GlassCard hover={false} className="p-4">
            <SectionLabel>Things to Avoid</SectionLabel>
            <TagInput
              label="Anti-Patterns"
              placeholder={`Don't say "Great question!"`}
              tags={config.antiPatterns ?? []}
              onAdd={handleAddAntiPattern}
              onRemove={handleRemoveAntiPattern}
              companionColor={companionColor}
            />
          </GlassCard>

          {/* ── 5. Boundaries ────────────────────────────────────────────── */}
          <GlassCard hover={false} className="p-4">
            <SectionLabel>Boundaries</SectionLabel>
            <TagInput
              label="Boundaries"
              placeholder="Never give medical advice"
              tags={config.boundaries ?? []}
              onAdd={handleAddBoundary}
              onRemove={handleRemoveBoundary}
              companionColor={companionColor}
            />
          </GlassCard>

          {/* ── 6. Style Controls ────────────────────────────────────────── */}
          <GlassCard hover={false} className="p-4">
            <SectionLabel>Communication Style</SectionLabel>
            <div className="flex flex-col gap-4">
              {/* Vocabulary */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-white/40">Vocabulary</span>
                <ToggleGroup
                  options={VOCABULARY_OPTIONS}
                  selected={config.style.vocabulary}
                  onSelect={(v) => handleStyleChange('vocabulary', v)}
                  companionColor={companionColor}
                />
              </div>

              {/* Response Length */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-white/40">Response Length</span>
                <ToggleGroup
                  options={LENGTH_OPTIONS}
                  selected={config.style.responseLength}
                  onSelect={(v) => handleStyleChange('responseLength', v)}
                  companionColor={companionColor}
                />
              </div>

              {/* Emoji toggle */}
              <EmojiToggle
                enabled={config.style.useEmoji}
                onToggle={(v) => handleStyleChange('useEmoji', v)}
                companionColor={companionColor}
              />
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
