'use client';

// ============================================================================
// CommandPalette -- Cmd+K search overlay for finding conversations.
// Client-side filtering with keyboard navigation and glass-morphism design.
// ============================================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCompanion } from '@/lib/companions';
import { formatRelativeTime } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface CommandPaletteConversation {
  id: string;
  companionId: string;
  title: string;
  updatedAt: string;
  messagePreview?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: CommandPaletteConversation[];
  onSelect: (conversationId: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_VISIBLE_RESULTS = 8;

// ============================================================================
// CommandPalette
// ============================================================================

export function CommandPalette({
  isOpen,
  onClose,
  conversations,
  onSelect,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter conversations by query (title or message preview)
  const filtered = useMemo(() => {
    if (!query.trim()) {
      // Show recent conversations when no query
      return conversations.slice(0, MAX_VISIBLE_RESULTS);
    }

    const lower = query.toLowerCase();
    return conversations
      .filter(
        (c) =>
          c.title.toLowerCase().includes(lower) ||
          (c.messagePreview && c.messagePreview.toLowerCase().includes(lower)),
      )
      .slice(0, MAX_VISIBLE_RESULTS);
  }, [query, conversations]);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      // Focus input after animation starts
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Keep active index in bounds when filtered results change
  useEffect(() => {
    setActiveIndex(0);
  }, [filtered.length]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.children[activeIndex] as HTMLElement | undefined;
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < filtered.length - 1 ? prev + 1 : 0,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : filtered.length - 1,
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filtered[activeIndex]) {
            onSelect(filtered[activeIndex].id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filtered, activeIndex, onSelect, onClose],
  );

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[15vh]"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-label="Search conversations"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="mx-4 w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl shadow-2xl shadow-black/50"
            onKeyDown={handleKeyDown}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-white/10 px-4">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-white/30"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations..."
                className="flex-1 bg-transparent py-4 text-sm text-white placeholder:text-white/30 placeholder:font-mono focus:outline-none"
                aria-label="Search conversations"
                aria-activedescendant={
                  filtered[activeIndex]
                    ? `cmd-palette-item-${filtered[activeIndex].id}`
                    : undefined
                }
                role="combobox"
                aria-expanded="true"
                aria-controls="cmd-palette-results"
                aria-autocomplete="list"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/30">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div
              id="cmd-palette-results"
              ref={listRef}
              role="listbox"
              className="max-h-[360px] overflow-y-auto py-2"
            >
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  {conversations.length === 0 ? (
                    <>
                      <span className="mb-2 block text-2xl">💬</span>
                      <p className="text-sm text-white/40">
                        No conversations yet
                      </p>
                      <p className="mt-1 text-xs text-white/20">
                        Start chatting with a companion to see conversations here
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="mb-2 block text-2xl">🔍</span>
                      <p className="text-sm text-white/40">
                        No results for &quot;{query}&quot;
                      </p>
                      <p className="mt-1 text-xs text-white/20">
                        Try a different search term
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Section label */}
                  <div className="px-4 pb-1 pt-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/20">
                      {query.trim() ? 'Results' : 'Recent conversations'}
                    </span>
                  </div>

                  {filtered.map((conversation, index) => {
                    const companion = getCompanion(conversation.companionId);
                    const emoji = companion?.emoji ?? '🐙';
                    const isActive = index === activeIndex;

                    return (
                      <button
                        key={conversation.id}
                        id={`cmd-palette-item-${conversation.id}`}
                        role="option"
                        aria-selected={isActive}
                        type="button"
                        onClick={() => onSelect(conversation.id)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-75 ${
                          isActive ? 'bg-white/5' : 'bg-transparent'
                        }`}
                      >
                        {/* Companion emoji */}
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-base">
                          {emoji}
                        </div>

                        {/* Conversation info */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {conversation.title}
                          </p>
                          <div className="flex items-center gap-2">
                            {companion && (
                              <span
                                className="text-[11px] font-mono"
                                style={{
                                  color: `var(--color-${companion.color})`,
                                }}
                              >
                                {companion.name}
                              </span>
                            )}
                            <span className="text-[11px] text-white/20">
                              {formatRelativeTime(conversation.updatedAt)}
                            </span>
                          </div>
                        </div>

                        {/* Enter hint on active item */}
                        {isActive && (
                          <kbd className="hidden sm:inline-flex shrink-0 items-center rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/20">
                            ↵
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer hints */}
            <div className="border-t border-white/5 px-4 py-2.5">
              <div className="flex items-center justify-center gap-4 text-[11px] text-white/20 font-mono">
                <span>
                  <kbd className="inline-flex items-center rounded border border-white/10 bg-white/5 px-1 py-px mr-1">↑</kbd>
                  <kbd className="inline-flex items-center rounded border border-white/10 bg-white/5 px-1 py-px mr-1">↓</kbd>
                  Navigate
                </span>
                <span>
                  <kbd className="inline-flex items-center rounded border border-white/10 bg-white/5 px-1 py-px mr-1">↵</kbd>
                  Open
                </span>
                <span>
                  <kbd className="inline-flex items-center rounded border border-white/10 bg-white/5 px-1.5 py-px mr-1">Esc</kbd>
                  Close
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
