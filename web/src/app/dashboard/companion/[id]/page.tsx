'use client';

// ============================================================================
// Companion Detail Page — Individual KIN companion showcase.
// Route: /dashboard/companion/[id] (e.g. /dashboard/companion/cipher)
// ============================================================================

import { use } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { getCompanion } from '@/lib/companions';
import { useCompanions } from '@/hooks/useCompanions';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CompanionShowcase } from '@/components/3d/CompanionShowcase';

// ---------------------------------------------------------------------------
// Trait definitions per companion archetype
// ---------------------------------------------------------------------------

const COMPANION_TRAITS: Record<string, { label: string; value: number }[]> = {
  cipher: [
    { label: 'Creativity', value: 95 },
    { label: 'Precision', value: 88 },
    { label: 'Curiosity', value: 92 },
    { label: 'Patience', value: 75 },
  ],
  mischief: [
    { label: 'Playfulness', value: 98 },
    { label: 'Empathy', value: 90 },
    { label: 'Energy', value: 95 },
    { label: 'Organization', value: 70 },
  ],
  vortex: [
    { label: 'Strategy', value: 96 },
    { label: 'Analysis', value: 94 },
    { label: 'Communication', value: 88 },
    { label: 'Vision', value: 92 },
  ],
  forge: [
    { label: 'Logic', value: 98 },
    { label: 'Thoroughness', value: 95 },
    { label: 'Architecture', value: 92 },
    { label: 'Speed', value: 85 },
  ],
  aether: [
    { label: 'Imagination', value: 97 },
    { label: 'Narrative', value: 95 },
    { label: 'Emotion', value: 90 },
    { label: 'Vocabulary', value: 93 },
  ],
  catalyst: [
    { label: 'Discipline', value: 94 },
    { label: 'Planning', value: 96 },
    { label: 'Motivation', value: 90 },
    { label: 'Insight', value: 88 },
  ],
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function CompanionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const companion = getCompanion(id);
  const { companions, claimCompanion, claiming } = useCompanions();

  if (!companion) {
    notFound();
  }

  // Check if user owns this companion
  const ownedEntry = companions.find((c) => c.companion.id === id);
  const isOwned = !!ownedEntry;
  const isActive = ownedEntry?.isActive ?? false;
  const traits = COMPANION_TRAITS[id] ?? COMPANION_TRAITS['cipher']!;

  // Gate: if user doesn't own this companion, show Mint to Unlock
  if (!isOwned) {
    return (
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link
          href="/dashboard/collection"
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          {'\u2190'} Back to Collection
        </Link>

        <GlassCard className="p-8 sm:p-12 text-center" hover={false}>
          <div className="relative mx-auto h-48 w-48 rounded-2xl overflow-hidden mb-6">
            <Image
              src={companion.images[0]}
              alt={companion.name}
              fill
              className="object-cover blur-sm opacity-60"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
              <span className="text-5xl mb-3">{'\uD83D\uDD12'}</span>
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold text-white mb-2">
            {companion.name}
          </h1>
          <p className="text-white/40 font-mono text-sm mb-2">{companion.species}</p>
          <p className="text-white/50 text-sm max-w-md mx-auto mb-8">
            {companion.description}
          </p>
          <Button
            variant="primary"
            onClick={() => claimCompanion(id)}
            disabled={claiming}
          >
            {claiming ? 'Minting...' : `Mint ${companion.name} to Unlock`}
          </Button>
          <p className="mt-4 text-xs text-white/25">
            Mint this KIN to access their full profile, chat, and abilities.
          </p>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Back link */}
      <Link
        href="/dashboard/collection"
        className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
      >
        {'\u2190'} Back to Collection
      </Link>

      {/* Hero Section */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* 3D Model / Image Showcase */}
        <CompanionShowcase
          name={companion.name}
          emoji={companion.emoji}
          images={companion.images}
          glbUrl={companion.glbUrl}
          modelReady={companion.modelReady}
          color={companion.color}
          initialRotation={companion.modelRotation}
        />

        {/* Info Panel */}
        <div className="space-y-6">
          {/* Name & Species */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{companion.emoji}</span>
              <div>
                <h1 className="font-display text-3xl font-bold text-white">
                  {companion.name}
                </h1>
                <p className="text-sm font-mono" style={{ color: `var(--color-${companion.color})` }}>
                  {companion.species}
                </p>
              </div>
            </div>
            <p className="text-white/60 text-sm leading-relaxed mt-3">
              {companion.description}
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex flex-wrap items-center gap-3">
            {isOwned ? (
              <>
                <Badge color="cyan">Owned</Badge>
                {isActive && <Badge color="gold">Active Companion</Badge>}
              </>
            ) : (
              <Badge color="muted">Not Owned</Badge>
            )}
            {/* NFT on-chain link */}
            {ownedEntry?.nftMintAddress && !ownedEntry.nftMintAddress.startsWith('kin-') && (
              <a
                href={`https://explorer.solana.com/address/${ownedEntry.nftMintAddress}${process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta' ? '' : '?cluster=devnet'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#AB6DFE]/30 bg-[#AB6DFE]/10 px-3 py-1 text-[11px] font-mono text-[#AB6DFE] hover:bg-[#AB6DFE]/20 transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 13v10h-21v-19h12v2h-10v15h17v-8h2zm3-12h-10.988l4.035 4-6.977 7.07 2.828 2.828 6.977-7.07 4.125 4.172v-11z"/>
                </svg>
                View NFT on Solana
              </a>
            )}
          </div>

          {/* Frontier Model Info */}
          <GlassCard className="p-5" hover={false}>
            <h3 className="font-display text-sm font-semibold text-white/70 mb-3 uppercase tracking-wider">
              AI Brain
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/40">Provider</span>
                <p className="text-white font-medium">{companion.frontierModel.provider}</p>
              </div>
              <div>
                <span className="text-white/40">Model</span>
                <p className="text-white font-medium">{companion.frontierModel.modelName}</p>
              </div>
              <div className="col-span-2">
                <span className="text-white/40">Context Window</span>
                <p className="text-white font-medium">
                  {(companion.frontierModel.contextWindow / 1000).toLocaleString()}K tokens
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Specialties */}
          <GlassCard className="p-5" hover={false}>
            <h3 className="font-display text-sm font-semibold text-white/70 mb-3 uppercase tracking-wider">
              Specialties
            </h3>
            <p className="text-white/60 text-sm">{companion.tagline}</p>
          </GlassCard>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {isOwned ? (
              <>
                <Button href={`/dashboard/chat`} variant="primary">
                  Chat with {companion.name}
                </Button>
                <Button href="/dashboard/soul" variant="outline">
                  Edit Soul
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                onClick={() => claimCompanion(id)}
                disabled={claiming}
              >
                {claiming ? 'Minting...' : `Mint ${companion.name}`}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Personality Traits */}
      <GlassCard className="p-6" hover={false}>
        <h2 className="font-display text-lg font-semibold text-white mb-5">
          Personality Traits
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {traits.map((trait) => (
            <div key={trait.label}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-white/60">{trait.label}</span>
                <span className="font-mono text-white/40">{trait.value}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className={`h-full rounded-full ${
                    trait.value > 90 ? 'bg-cyan' : trait.value > 80 ? 'bg-gold' : 'bg-magenta'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${trait.value}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Abilities / What This KIN Can Do */}
      <GlassCard className="p-6" hover={false}>
        <h2 className="font-display text-lg font-semibold text-white mb-4">
          What {companion.name} Can Do For You
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {getAbilities(id).map((ability, i) => (
            <motion.div
              key={ability}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3"
            >
              <span className="text-cyan">{'\u2713'}</span>
              <span className="text-sm text-white/70">{ability}</span>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Abilities per companion
// ---------------------------------------------------------------------------

function getAbilities(id: string): string[] {
  const abilities: Record<string, string[]> = {
    cipher: [
      'Design stunning websites',
      'Build UI components',
      'Debug CSS & layout issues',
      'Create landing pages',
      'Prototype app ideas',
      'Teach coding basics',
    ],
    mischief: [
      'Social media strategy',
      'Family activity planning',
      'Personal branding',
      'Content creation',
      'Audience growth tips',
      'Fun conversation partner',
    ],
    vortex: [
      'Content strategy',
      'Brand voice development',
      'Analytics interpretation',
      'Marketing funnels',
      'SEO guidance',
      'Campaign planning',
    ],
    forge: [
      'Code review',
      'Bug hunting',
      'System architecture',
      'Database design',
      'API development',
      'Performance optimization',
    ],
    aether: [
      'Creative writing',
      'Story development',
      'Prose editing',
      'Poetry & lyrics',
      'World building',
      'Character creation',
    ],
    catalyst: [
      'Budget planning',
      'Habit tracking',
      'Goal setting',
      'Life optimization',
      'Financial literacy',
      'Productivity systems',
    ],
  };

  return abilities[id] ?? abilities['cipher']!;
}
