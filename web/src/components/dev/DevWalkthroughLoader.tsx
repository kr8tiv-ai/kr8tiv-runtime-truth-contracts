'use client';

// ============================================================================
// DevWalkthroughLoader — TEMPORARY. Lazy-loads the walkthrough only in dev.
// Delete this file when done testing.
// ============================================================================

import dynamic from 'next/dynamic';

const DevWalkthrough = dynamic(
  () => import('./DevWalkthrough').then(mod => ({ default: mod.DevWalkthrough })),
  { ssr: false },
);

export function DevWalkthroughLoader() {
  if (process.env.NODE_ENV !== 'development') return null;
  return <DevWalkthrough />;
}
