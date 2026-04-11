'use client';

// ============================================================================
// ApprovalDialog — Modal for approving high-risk device actions.
//
// Shows clear consequence explanation, risk level, and the exact action
// that will be performed. Designed for non-technical users.
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { kinApi } from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

interface PendingApproval {
  id: string;
  skill: string;
  action: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
  params?: Record<string, unknown>;
  expiresAt: string;
  createdAt: string;
}

interface ApprovalDialogProps {
  /** Poll interval in ms (default: 3000) */
  pollInterval?: number;
  className?: string;
}

const RISK_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string; label: string }> = {
  low: {
    color: 'text-green-400',
    bg: 'bg-green-400/5',
    border: 'border-green-400/20',
    icon: '✅',
    label: 'Low Risk',
  },
  medium: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/5',
    border: 'border-yellow-400/20',
    icon: '⚠️',
    label: 'Medium Risk',
  },
  high: {
    color: 'text-magenta',
    bg: 'bg-magenta/5',
    border: 'border-magenta/20',
    icon: '🛑',
    label: 'High Risk',
  },
};

// ============================================================================
// Component
// ============================================================================

export function ApprovalDialog({ pollInterval = 3000, className }: ApprovalDialogProps) {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  // Poll for pending approvals
  useEffect(() => {
    const fetchApprovals = async () => {
      try {
        const result = await kinApi.get<{ approvals: PendingApproval[] }>('/approvals/pending');
        setApprovals(result.approvals);
      } catch {
        // Silently fail
      }
    };

    fetchApprovals();
    const interval = setInterval(fetchApprovals, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval]);

  // Approve action
  const handleApprove = useCallback(async (approvalId: string) => {
    setProcessing(approvalId);
    try {
      await kinApi.post(`/approvals/${approvalId}/approve`, {});
      setApprovals((prev) => prev.filter((a) => a.id !== approvalId));
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setProcessing(null);
    }
  }, []);

  // Reject action
  const handleReject = useCallback(async (approvalId: string) => {
    setProcessing(approvalId);
    try {
      await kinApi.post(`/approvals/${approvalId}/reject`, {});
      setApprovals((prev) => prev.filter((a) => a.id !== approvalId));
    } catch (err) {
      console.error('Rejection failed:', err);
    } finally {
      setProcessing(null);
    }
  }, []);

  if (approvals.length === 0) return null;

  return (
    <AnimatePresence>
      {approvals.map((approval) => {
        const risk = RISK_CONFIG[approval.risk] ?? RISK_CONFIG.medium!;
        const isProcessing = processing === approval.id;

        return (
          <motion.div
            key={approval.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] ${className ?? ''}`}
          >
            <div className={`rounded-2xl border ${risk.border} ${risk.bg} backdrop-blur-2xl p-5 shadow-2xl shadow-black/50`}>
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">{risk.icon}</span>
                <div className="flex-1">
                  <h4 className="font-display text-sm font-semibold text-white">
                    Action Approval Required
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-mono uppercase tracking-wider ${risk.color}`}>
                      {risk.label}
                    </span>
                    <span className="text-[10px] text-white/20">•</span>
                    <span className="text-[10px] text-white/20 font-mono">
                      {approval.skill}.{approval.action}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="rounded-xl bg-black/30 p-3 mb-4">
                <p className="text-sm text-white/70 leading-relaxed">
                  {approval.description}
                </p>
                {approval.params && Object.keys(approval.params).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5">
                    {Object.entries(approval.params).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2 text-[11px]">
                        <span className="text-white/20 font-mono shrink-0">{key}:</span>
                        <span className="text-white/40 font-mono break-all">
                          {typeof value === 'string' ? value : JSON.stringify(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Consequence warning for high risk */}
              {approval.risk === 'high' && (
                <p className="text-[10px] text-magenta/70 mb-3 leading-relaxed">
                  This action may cause permanent changes that cannot be undone.
                  Make sure you understand what will happen before approving.
                </p>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleApprove(approval.id)}
                  disabled={isProcessing}
                  className={`flex-1 rounded-xl py-2.5 font-display text-sm font-semibold uppercase tracking-wide transition-all duration-300 ${
                    approval.risk === 'high'
                      ? 'bg-magenta/20 text-magenta hover:bg-magenta/30 border border-magenta/30'
                      : 'bg-cyan/20 text-cyan hover:bg-cyan/30 border border-cyan/30'
                  } disabled:opacity-40`}
                >
                  {isProcessing ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleReject(approval.id)}
                  disabled={isProcessing}
                  className="flex-1 rounded-xl py-2.5 font-display text-sm font-semibold uppercase tracking-wide bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60 border border-white/10 transition-all duration-300 disabled:opacity-40"
                >
                  Deny
                </button>
              </div>

              {/* Expiry timer */}
              <p className="text-[9px] text-white/10 text-center mt-2">
                Expires {new Date(approval.expiresAt).toLocaleTimeString()}
              </p>
            </div>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
