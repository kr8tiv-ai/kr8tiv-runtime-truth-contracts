'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { kinApi } from '@/lib/api';

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type View = 'menu' | 'chat' | 'faq';

// ---------------------------------------------------------------------------
// Quick-access menu items
// ---------------------------------------------------------------------------

const MENU_OPTIONS = [
  {
    label: 'Chat with AI Support',
    description: 'Get instant answers from our AI assistant',
    action: 'chat' as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" className="shrink-0">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: 'Browse FAQ',
    description: 'Common questions answered',
    action: 'faq' as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" className="shrink-0">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    label: 'Email Support',
    description: 'support@meetyourkin.com',
    action: 'email' as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" className="shrink-0">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('menu');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [faqItems, setFaqItems] = useState<Array<{ question: string; answer: string }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  let msgCounter = useRef(0);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load FAQ when entering FAQ view
  useEffect(() => {
    if (view === 'faq' && faqItems.length === 0) {
      kinApi.get<Array<{ question: string; answer: string }>>('/support/faq')
        .then(setFaqItems)
        .catch(() => {});
    }
  }, [view, faqItems.length]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');

    const userMsg: ChatMessage = {
      id: `sm-${Date.now()}-${++msgCounter.current}`,
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const result = await kinApi.post<{ response: string; chatId: string }>(
        '/support/chat',
        { message: text, chatId },
      );
      setChatId(result.chatId);
      const aiMsg: ChatMessage = {
        id: `sm-${Date.now()}-${++msgCounter.current}`,
        role: 'assistant',
        content: result.response,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: ChatMessage = {
        id: `sm-${Date.now()}-${++msgCounter.current}`,
        role: 'assistant',
        content: "Sorry, I couldn't connect. Please try again or email support@meetyourkin.com.",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  }, [input, sending, chatId]);

  const escalate = useCallback(async () => {
    if (!chatId) return;
    try {
      const result = await kinApi.post<{ ticketId: string; message: string }>(
        '/support/chat/escalate',
        { chatId, reason: 'User requested human support' },
      );
      const sysMsg: ChatMessage = {
        id: `sm-${Date.now()}-${++msgCounter.current}`,
        role: 'assistant',
        content: `${result.message} Your ticket ID is: ${result.ticketId}`,
      };
      setMessages((prev) => [...prev, sysMsg]);
    } catch {
      // Silent fail
    }
  }, [chatId]);

  const handleMenuAction = (action: string) => {
    if (action === 'chat') {
      setView('chat');
      if (messages.length === 0) {
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: "Hi! I'm KIN Support. How can I help you today? Ask me anything about companions, billing, skills, or technical setup.",
          },
        ]);
      }
    } else if (action === 'faq') {
      setView('faq');
    } else if (action === 'email') {
      window.open('mailto:support@meetyourkin.com', '_blank');
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset to menu after animation
    setTimeout(() => setView('menu'), 200);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex w-80 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-surface/95 backdrop-blur-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            style={{ maxHeight: '500px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
              <div className="flex items-center gap-2">
                {view !== 'menu' && (
                  <button
                    type="button"
                    onClick={() => setView('menu')}
                    className="mr-1 text-white/40 transition-colors hover:text-white/70"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M15 18l-6-6 6-6" /></svg>
                  </button>
                )}
                <h3 className="font-display text-sm font-semibold text-white">
                  {view === 'menu' ? 'Need Help?' : view === 'chat' ? 'AI Support' : 'FAQ'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
                aria-label="Close support"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Menu View */}
            {view === 'menu' && (
              <div className="space-y-1.5 p-4">
                {MENU_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => handleMenuAction(option.action)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left',
                      'border border-white/[0.06] bg-white/[0.03]',
                      'transition-all duration-200',
                      'hover:border-cyan/20 hover:bg-cyan/[0.05]',
                    )}
                  >
                    <span className="text-cyan">{option.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-white/80">{option.label}</p>
                      <p className="text-xs text-white/40">{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Chat View */}
            {view === 'chat' && (
              <>
                <div
                  ref={scrollRef}
                  className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
                  style={{ maxHeight: '320px' }}
                >
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
                        msg.role === 'user'
                          ? 'ml-auto bg-cyan/10 text-white/80'
                          : 'bg-white/[0.03] text-white/60',
                      )}
                    >
                      {msg.content}
                    </div>
                  ))}
                  {sending && (
                    <div className="max-w-[85%] rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-sm text-white/30">
                      Thinking...
                    </div>
                  )}
                </div>

                {/* Escalation + Input */}
                <div className="border-t border-white/[0.06] p-3">
                  {chatId && messages.length > 2 && (
                    <button
                      type="button"
                      onClick={escalate}
                      className="mb-2 w-full rounded-lg border border-magenta/20 bg-magenta/5 px-3 py-1.5 text-xs font-medium text-magenta/70 transition-colors hover:bg-magenta/10 hover:text-magenta"
                    >
                      Escalate to human support
                    </button>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type your question..."
                      className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-cyan/30"
                      disabled={sending}
                    />
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={!input.trim() || sending}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan/10 text-cyan transition-colors hover:bg-cyan/20 disabled:opacity-30"
                    >
                      <SendIcon />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* FAQ View */}
            {view === 'faq' && (
              <div className="space-y-2 overflow-y-auto p-4" style={{ maxHeight: '400px' }}>
                {faqItems.length === 0 && (
                  <p className="py-4 text-center text-sm text-white/30">Loading FAQ...</p>
                )}
                {faqItems.map((item, i) => (
                  <details
                    key={i}
                    className="group rounded-xl border border-white/[0.06] bg-white/[0.02]"
                  >
                    <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:text-white">
                      {item.question}
                    </summary>
                    <p className="border-t border-white/[0.04] px-4 py-3 text-sm leading-relaxed text-white/50">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'relative flex h-14 w-14 items-center justify-center rounded-full',
          'bg-cyan text-black shadow-[0_4px_20px_rgba(0,240,255,0.4)]',
          'transition-all duration-200 hover:shadow-[0_4px_30px_rgba(0,240,255,0.6)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
        )}
        aria-label={open ? 'Close support' : 'Open support'}
        whileTap={{ scale: 0.95 }}
      >
        {!open && (
          <span className="absolute inset-0 animate-ping rounded-full bg-cyan/30" />
        )}
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <CloseIcon className="h-5 w-5" />
            </motion.span>
          ) : (
            <motion.span
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChatBubbleIcon className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
