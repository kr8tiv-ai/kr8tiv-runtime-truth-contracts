'use client';

// ============================================================================
// Dashboard Chat Page — Talk to your KIN companion in real-time.
// ============================================================================

import { useState } from 'react';
import { ChatWindow } from '@/components/dashboard/ChatWindow';
import { useCompanions } from '@/hooks/useCompanions';
import { COMPANION_LIST } from '@/lib/companions';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const { companions } = useCompanions();
  const activeCompanion = companions.find((c) => c.isActive);
  const [selectedId, setSelectedId] = useState(
    activeCompanion?.companion.id ?? 'cipher',
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-6rem)]">
      {/* Companion selector — only show if user owns more than one */}
      {companions.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {companions.map(({ companion: comp }) => {
            const data = COMPANION_LIST.find((c) => c.id === comp.id);
            if (!data) return null;
            return (
              <button
                key={data.id}
                type="button"
                onClick={() => setSelectedId(data.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200',
                  selectedId === data.id
                    ? 'border-cyan/40 bg-cyan/10 text-cyan'
                    : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70',
                )}
              >
                {data.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 min-h-0 rounded-xl border border-white/10 bg-surface overflow-hidden">
        <ChatWindow companionId={selectedId} />
      </div>
    </div>
  );
}
