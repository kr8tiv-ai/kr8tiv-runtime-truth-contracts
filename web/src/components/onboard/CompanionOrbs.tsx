'use client';

// ============================================================================
// CompanionOrbs — Floating blurred background orbs in the companion's accent
// color. Rendered during onboarding after a companion is selected.
// Uses the orb-float keyframes defined in globals.css.
// ============================================================================

import { useMemo } from 'react';

const COLOR_MAP: Record<string, string> = {
  cyan: '0, 240, 255',
  magenta: '255, 0, 170',
  gold: '255, 215, 0',
};

interface OrbDef {
  size: number;
  x: string;
  y: string;
  opacity: number;
  delay: string;
  duration: string;
}

interface CompanionOrbsProps {
  /** Companion color key: 'cyan' | 'magenta' | 'gold' */
  colorKey: string;
}

export function CompanionOrbs({ colorKey }: CompanionOrbsProps) {
  const rgb = COLOR_MAP[colorKey] ?? COLOR_MAP.cyan;

  const orbs = useMemo<OrbDef[]>(
    () => [
      { size: 180, x: '15%', y: '20%', opacity: 0.06, delay: '0s', duration: '18s' },
      { size: 140, x: '70%', y: '60%', opacity: 0.05, delay: '2s', duration: '22s' },
      { size: 200, x: '45%', y: '80%', opacity: 0.04, delay: '4s', duration: '20s' },
      { size: 120, x: '80%', y: '15%', opacity: 0.07, delay: '1s', duration: '16s' },
    ],
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {orbs.map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: `radial-gradient(circle, rgba(${rgb}, ${orb.opacity}) 0%, transparent 70%)`,
            filter: 'blur(40px)',
            animation: `orb-float ${orb.duration} ease-in-out infinite`,
            animationDelay: orb.delay,
            transition: 'background 1s ease',
          }}
        />
      ))}
    </div>
  );
}
