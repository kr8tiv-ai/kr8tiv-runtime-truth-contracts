'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { resolveArweaveUrl } from '@/lib/solana/constants';

const CompanionScene = dynamic(
  () => import('./CompanionScene').then((mod) => ({ default: mod.CompanionScene })),
  { ssr: false },
);

interface CompanionViewerProps {
  glbUrl?: string | null;
  fallbackImage: string;
  alt: string;
  className?: string;
  interactive?: boolean;
  /** Set false to show 2D even if glbUrl is provided */
  modelReady?: boolean;
  /** Initial rotation [x, y, z] in radians to correct GLB orientation */
  initialRotation?: [number, number, number];
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

export function CompanionViewer({
  glbUrl,
  fallbackImage,
  alt,
  className = '',
  interactive = false,
  modelReady = false,
  initialRotation,
}: CompanionViewerProps) {
  const [hovered, setHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const webgl = useMemo(() => isWebGLAvailable(), []);

  // Resolve Arweave URLs through Irys gateway for better reliability
  const resolvedGlbUrl = useMemo(() => {
    if (!glbUrl) return null;
    // Local paths stay as-is, Arweave URLs get resolved
    if (glbUrl.startsWith('/')) return glbUrl;
    return resolveArweaveUrl(glbUrl) ?? glbUrl;
  }, [glbUrl]);

  const show3D = webgl && resolvedGlbUrl && modelReady;

  if (show3D) {
    return (
      <div
        className={`relative overflow-hidden ${className}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <CompanionScene
          glbUrl={resolvedGlbUrl!}
          autoRotate={!hovered}
          interactive={interactive || hovered}
          initialRotation={initialRotation}
          className="h-full w-full"
        />
      </div>
    );
  }

  // 2D fallback with beautiful styling
  return (
    <div className={`relative overflow-hidden group ${className}`}>
      {!imageError ? (
        <>
          <Image
            src={fallbackImage}
            alt={alt}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 400px"
            onError={() => setImageError(true)}
          />
          {/* Subtle animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan/5 to-magenta/5">
          <span className="text-6xl animate-pulse" aria-hidden="true">
            {'\uD83E\uDD5A'}
          </span>
        </div>
      )}
    </div>
  );
}

export default CompanionViewer;
