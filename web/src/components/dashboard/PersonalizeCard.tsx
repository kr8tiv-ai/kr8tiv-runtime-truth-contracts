'use client';

// ============================================================================
// PersonalizeCard — "Personalize My KIN" glass card with training progress.
// Triggers fine-tuning from user's chat history → custom GGUF → Ollama.
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { kinApi } from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

interface PersonalizeStatus {
  state: 'idle' | 'exporting' | 'training' | 'quantizing' | 'installing' | 'complete' | 'error';
  progress: number; // 0-100
  stage?: string;
  eta?: string;
  error?: string;
  modelName?: string;
  lastTrainedAt?: string;
  sampleCount?: number;
}

interface PersonalizeCardProps {
  companionId: string;
  className?: string;
}

const STAGE_LABELS: Record<string, { label: string; icon: string }> = {
  idle: { label: 'Ready to personalize', icon: '✨' },
  exporting: { label: 'Exporting chat history...', icon: '📦' },
  training: { label: 'Fine-tuning your model...', icon: '🧠' },
  quantizing: { label: 'Optimizing for your device...', icon: '⚡' },
  installing: { label: 'Installing to Ollama...', icon: '🚀' },
  complete: { label: 'Personalization complete!', icon: '🎉' },
  error: { label: 'Something went wrong', icon: '⚠️' },
};

// ============================================================================
// Component
// ============================================================================

export function PersonalizeCard({ companionId, className }: PersonalizeCardProps) {
  const [status, setStatus] = useState<PersonalizeStatus>({ state: 'idle', progress: 0 });
  const [loading, setLoading] = useState(false);

  // Poll for training status when active
  useEffect(() => {
    if (!['training', 'exporting', 'quantizing', 'installing'].includes(status.state)) return;

    const interval = setInterval(async () => {
      try {
        const result = await kinApi.get<PersonalizeStatus>(
          `/personalize/status/${companionId}`,
        );
        setStatus(result);
      } catch {
        // Keep current state on error
      }
    }, 3_000);

    return () => clearInterval(interval);
  }, [status.state, companionId]);

  // Start personalization
  const handleStart = useCallback(async () => {
    setLoading(true);
    try {
      const result = await kinApi.post<PersonalizeStatus>(
        '/personalize/start',
        { companionId },
      );
      setStatus(result);
    } catch (err) {
      setStatus({
        state: 'error',
        progress: 0,
        error: err instanceof Error ? err.message : 'Failed to start personalization',
      });
    } finally {
      setLoading(false);
    }
  }, [companionId]);

  // Install completed model
  const handleInstall = useCallback(async () => {
    setLoading(true);
    try {
      const result = await kinApi.post<PersonalizeStatus>(
        '/personalize/install',
        { companionId },
      );
      setStatus(result);
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        state: 'error',
        error: err instanceof Error ? err.message : 'Installation failed',
      }));
    } finally {
      setLoading(false);
    }
  }, [companionId]);

  const stage = STAGE_LABELS[status.state] ?? STAGE_LABELS.idle!;
  const isActive = ['exporting', 'training', 'quantizing', 'installing'].includes(status.state);

  return (
    <GlassCard
      className={`relative p-6 overflow-hidden ${className ?? ''}`}
      glow={status.state === 'complete' ? 'magenta' : isActive ? 'cyan' : 'none'}
    >
      {/* Animated gradient background when training */}
      {isActive && (
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0 bg-gradient-to-r from-cyan via-magenta to-gold"
            style={{
              animation: 'gradient-shift 3s ease infinite',
              backgroundSize: '200% 200%',
            }}
          />
        </div>
      )}

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{stage.icon}</span>
            <div>
              <h3 className="font-display text-lg font-semibold text-white">
                Personalize My KIN
              </h3>
              <p className="text-xs text-white/30">
                Fine-tune your companion to match your style
              </p>
            </div>
          </div>
          {status.lastTrainedAt && (
            <Badge color="muted">
              Last: {new Date(status.lastTrainedAt).toLocaleDateString()}
            </Badge>
          )}
        </div>

        {/* Status */}
        <p className="text-sm text-white/50 mb-3">{stage.label}</p>

        {/* Progress bar */}
        {isActive && (
          <div className="mb-4">
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan to-magenta transition-all duration-1000 ease-out"
                style={{ width: `${status.progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-white/20 font-mono">
                {status.stage ?? stage.label}
              </span>
              <span className="text-[10px] text-white/20 font-mono">
                {status.progress}%{status.eta ? ` • ~${status.eta} remaining` : ''}
              </span>
            </div>
          </div>
        )}

        {/* Sample count info */}
        {status.sampleCount && status.sampleCount > 0 && (
          <p className="text-[10px] text-white/15 mb-3">
            Training on {status.sampleCount.toLocaleString()} conversation samples
          </p>
        )}

        {/* Error */}
        {status.state === 'error' && status.error && (
          <div className="mb-4 rounded-xl border border-magenta/20 bg-magenta/5 p-3">
            <p className="text-xs text-magenta">{status.error}</p>
          </div>
        )}

        {/* Action button */}
        {status.state === 'idle' || status.state === 'error' ? (
          <Button
            onClick={handleStart}
            loading={loading}
            className="w-full"
          >
            Start Personalization
          </Button>
        ) : status.state === 'complete' ? (
          <div className="space-y-2">
            <Button
              onClick={handleInstall}
              loading={loading}
              className="w-full"
            >
              Install Personalized Model
            </Button>
            <p className="text-[10px] text-white/20 text-center">
              {status.modelName ? `Model: ${status.modelName}` : 'Ready to install to Ollama'}
            </p>
          </div>
        ) : null}

        {/* How it works */}
        {status.state === 'idle' && (
          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <p className="text-[10px] text-white/15 leading-relaxed">
              Uses your conversation history to create a custom model that knows your preferences,
              coding style, and communication patterns. Takes 15-30 minutes on GPU.
            </p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
