'use client';

// ============================================================================
// Dashboard Template — Smooth page transition wrapper.
// template.tsx re-mounts on every route change (unlike layout.tsx).
// Includes the Cmd+K command palette for conversation search.
// ============================================================================

import { motion } from 'framer-motion';
import { CommandPaletteWrapper } from '@/components/dashboard/CommandPaletteWrapper';

export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CommandPaletteWrapper />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {children}
      </motion.div>
    </>
  );
}
