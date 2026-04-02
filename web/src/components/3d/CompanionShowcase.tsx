'use client';

// ============================================================================
// CompanionShowcase — Side-by-side 2D image + 3D model with mouse-following.
// The 3D model gently tracks the cursor position for a living feel.
// ============================================================================

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const InteractiveScene = dynamic(
  () => import('./InteractiveScene').then((mod) => ({ default: mod.InteractiveScene })),
  { ssr: false },
);

interface CompanionShowcaseProps {
  name: string;
  emoji: string;
  images: string[];
  glbUrl: string;
  modelReady: boolean;
  color: 'cyan' | 'magenta' | 'gold';
  initialRotation?: [number, number, number];
  className?: string;
}

function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

export function CompanionShowcase({
  name,
  emoji,
  images,
  glbUrl,
  modelReady,
  color,
  initialRotation,
  className = '',
}: CompanionShowcaseProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [showModel, setShowModel] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const webgl = useMemo(() => isWebGLAvailable(), []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Normalize to -1..1 range
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    setMousePos({ x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Gently return to center
    setMousePos({ x: 0, y: 0 });
  }, []);

  const show3D = webgl && modelReady;
  const colorVar = color === 'cyan' ? '#00f0ff' : color === 'magenta' ? '#ff00aa' : '#ffd700';

  return (
    <div className={cn('space-y-3', className)}>
      {/* Main display area */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20"
        style={{ aspectRatio: show3D ? '16/9' : '1/1' }}
      >
        {show3D ? (
          /* Split view: Image left, 3D right */
          <div className="flex h-full">
            {/* 2D Image side */}
            <div className="relative w-1/2 overflow-hidden">
              {!imageError ? (
                <>
                  <Image
                    src={images[selectedImage] ?? '/creatures/egg.png'}
                    alt={name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 300px"
                    onError={() => setImageError(true)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/40" />
                </>
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-cyan/5 to-magenta/5">
                  <span className="text-6xl animate-pulse">{emoji}</span>
                </div>
              )}
              {/* Label */}
              <div className="absolute bottom-3 left-3 rounded-full bg-black/50 backdrop-blur-md px-3 py-1 border border-white/10">
                <span className="text-[10px] text-white/50 uppercase tracking-wider font-mono">Portrait</span>
              </div>
            </div>

            {/* 3D Model side */}
            <div className="relative w-1/2">
              <InteractiveScene
                glbUrl={glbUrl}
                mouseX={mousePos.x}
                mouseY={mousePos.y}
                initialRotation={initialRotation}
                className="h-full w-full"
              />
              {/* Label */}
              <div className="absolute bottom-3 right-3 rounded-full bg-black/50 backdrop-blur-md px-3 py-1 border border-white/10">
                <span className="text-[10px] uppercase tracking-wider font-mono" style={{ color: colorVar }}>
                  3D Model
                </span>
              </div>
              {/* Glow ring */}
              <div
                className="absolute inset-0 pointer-events-none rounded-r-2xl"
                style={{
                  boxShadow: `inset 0 0 60px ${colorVar}10, inset 0 0 120px ${colorVar}05`,
                }}
              />
            </div>
          </div>
        ) : (
          /* Full image view when no 3D model */
          <div className="relative h-full group">
            {!imageError ? (
              <>
                <Image
                  src={images[selectedImage] ?? '/creatures/egg.png'}
                  alt={name}
                  fill
                  className="object-contain transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 600px"
                  onError={() => setImageError(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              </>
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-cyan/5 to-magenta/5">
                <span className="text-6xl animate-pulse">{emoji}</span>
              </div>
            )}

            {/* 3D coming soon overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 bg-gradient-to-t from-black/60 via-transparent to-transparent">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-2 border border-white/10"
              >
                <span className="text-sm">{'\u2728'}</span>
                <span className="text-xs text-white/70 font-medium">
                  3D avatar arriving soon
                </span>
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail gallery */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setSelectedImage(i);
              setImageError(false);
            }}
            className={cn(
              'relative h-14 w-14 shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200',
              selectedImage === i
                ? 'border-cyan/60 ring-1 ring-cyan/30'
                : 'border-white/10 hover:border-white/30',
            )}
          >
            <Image
              src={img}
              alt={`${name} view ${i + 1}`}
              fill
              className="object-cover"
              sizes="56px"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default CompanionShowcase;
