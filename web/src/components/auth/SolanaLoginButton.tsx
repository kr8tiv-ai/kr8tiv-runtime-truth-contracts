'use client';

// ============================================================================
// Solana Wallet Sign-In — Connect Phantom wallet, sign nonce, authenticate.
// ============================================================================

import { useState, useCallback } from 'react';
import type { User } from '@/lib/types';
import { kinApi } from '@/lib/api';

interface SolanaLoginButtonProps {
  onAuth: (token: string, user: User) => void;
}

interface PhantomProvider {
  isPhantom: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string; toBytes: () => Uint8Array } }>;
  signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
  disconnect: () => Promise<void>;
}

function getPhantomProvider(): PhantomProvider | null {
  if (typeof window === 'undefined') return null;
  const provider = (window as any)?.phantom?.solana;
  if (provider?.isPhantom) return provider;
  return null;
}

export function SolanaLoginButton({ onAuth }: SolanaLoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSolanaLogin = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const phantom = getPhantomProvider();
      if (!phantom) {
        window.open('https://phantom.app/', '_blank');
        setError('Phantom wallet not found. Please install it and try again.');
        setLoading(false);
        return;
      }

      // Step 1: Connect wallet
      const { publicKey } = await phantom.connect();
      const walletAddress = publicKey.toString();

      // Step 2: Request nonce from server
      const { nonce, message } = await kinApi.post<{ nonce: string; message: string }>(
        '/auth/solana/nonce',
        { walletAddress },
      );

      // Step 3: Sign the message with Phantom
      const encodedMessage = new TextEncoder().encode(message);
      const { signature } = await phantom.signMessage(encodedMessage, 'utf8');

      // Step 4: Send signature to server for verification
      const signatureBase64 = btoa(String.fromCharCode(...signature));
      const result = await kinApi.post<{ token: string; user: User }>(
        '/auth/solana',
        { walletAddress, nonce, signature: signatureBase64 },
      );

      onAuth(result.token, result.user);
    } catch (err) {
      if (err instanceof Error && err.message.includes('User rejected')) {
        setError('Sign-in cancelled');
      } else {
        setError(err instanceof Error ? err.message : 'Wallet sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  }, [onAuth]);

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <button
        type="button"
        onClick={handleSolanaLogin}
        disabled={loading}
        className="group flex w-full items-center justify-center gap-2.5 rounded-full border px-8 py-3.5 font-display text-sm font-medium uppercase tracking-wide transition-all duration-400 disabled:opacity-40"
        style={{
          borderColor: 'rgba(171, 109, 254, 0.5)',
          color: '#AB6DFE',
          boxShadow: '0 0 20px rgba(171,109,254,0.1)',
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.background = '#AB6DFE';
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.boxShadow = '0 0 40px rgba(171,109,254,0.4)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#AB6DFE';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(171,109,254,0.1)';
        }}
      >
        {/* Phantom/Solana icon */}
        <svg width="18" height="18" viewBox="0 0 128 128" fill="currentColor">
          <path d="M64 0C28.7 0 0 28.7 0 64s28.7 64 64 64 64-28.7 64-64S99.3 0 64 0zm-5.9 91.7c-3.4 0-6.2-2.8-6.2-6.2s2.8-6.2 6.2-6.2 6.2 2.8 6.2 6.2-2.8 6.2-6.2 6.2zm16.9 0c-3.4 0-6.2-2.8-6.2-6.2s2.8-6.2 6.2-6.2 6.2 2.8 6.2 6.2-2.8 6.2-6.2 6.2zm28.7-36.4c0 19.5-12.4 36.3-30.6 42.2.3-1.2.5-2.4.5-3.7 0-7.6-6.2-13.8-13.8-13.8s-13.8 6.2-13.8 13.8c0 1.3.2 2.5.5 3.7C28.2 91.6 15.8 74.8 15.8 55.3c0-26.4 21.4-47.8 47.8-47.8h.8c26.4 0 47.8 21.4 47.8 47.8h-8.5z"/>
        </svg>
        {loading ? 'Connecting...' : 'Sign in with Solana'}
      </button>
      {error && (
        <p className="text-sm text-magenta text-center" role="alert">{error}</p>
      )}
    </div>
  );
}
