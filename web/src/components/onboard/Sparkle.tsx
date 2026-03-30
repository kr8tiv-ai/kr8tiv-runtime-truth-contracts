'use client';

// ============================================================================
// Sparkle — Micro-celebration burst animation triggered on step completion.
// Spawns 10 small star particles from the trigger point, then fades out.
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  angle: number;
  distance: number;
  delay: number;
}

interface SparkleProps {
  /** When this increments, a new burst is triggered. */
  trigger: number;
  /** Accent color for the particles (hex). */
  color?: string;
}

function createParticles(): Particle[] {
  return Array.from({ length: 10 }, (_, i) => ({
    id: i,
    x: 0,
    y: 0,
    size: 4 + Math.random() * 6,
    angle: (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.4,
    distance: 30 + Math.random() * 50,
    delay: Math.random() * 0.08,
  }));
}

export function Sparkle({ trigger, color = '#00f0ff' }: SparkleProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    if (trigger > 0) {
      setParticles(createParticles());
      setBurstKey((k) => k + 1);
    }
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <AnimatePresence>
      <div
        key={burstKey}
        className="pointer-events-none fixed inset-0 z-50"
        style={{ perspective: 600 }}
      >
        {particles.map((p) => {
          const tx = Math.cos(p.angle) * p.distance;
          const ty = Math.sin(p.angle) * p.distance;

          return (
            <motion.div
              key={`${burstKey}-${p.id}`}
              className="absolute left-1/2 bottom-24"
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: tx,
                y: ty - 20,
                opacity: 0,
                scale: 0.2,
              }}
              transition={{
                duration: 0.45,
                delay: p.delay,
                ease: 'easeOut',
              }}
            >
              <svg
                width={p.size}
                height={p.size}
                viewBox="0 0 10 10"
                fill={color}
              >
                <path d="M5 0L6.1 3.9L10 5L6.1 6.1L5 10L3.9 6.1L0 5L3.9 3.9Z" />
              </svg>
            </motion.div>
          );
        })}
      </div>
    </AnimatePresence>
  );
}
