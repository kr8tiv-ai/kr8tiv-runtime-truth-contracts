'use client';

// ============================================================================
// Google Sign-In Button — Uses Google Identity Services (GIS) to get ID token.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import type { User } from '@/lib/types';
import { kinApi } from '@/lib/api';

interface GoogleLoginButtonProps {
  onAuth: (token: string, user: User) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: string;
              size?: string;
              shape?: string;
              width?: number;
              text?: string;
            },
          ) => void;
        };
      };
    };
  }
}

export function GoogleLoginButton({ onAuth }: GoogleLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

  // Load Google Identity Services script
  useEffect(() => {
    if (!clientId) return;
    if (document.getElementById('google-gis-script')) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, [clientId]);

  // Initialize Google Sign-In once script is loaded
  useEffect(() => {
    if (!scriptLoaded || !clientId || !containerRef.current || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        setLoading(true);
        setError(null);
        try {
          const result = await kinApi.post<{ token: string; user: User }>(
            '/auth/google',
            { idToken: response.credential },
          );
          onAuth(result.token, result.user);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Google sign-in failed');
        } finally {
          setLoading(false);
        }
      },
    });

    window.google.accounts.id.renderButton(containerRef.current, {
      theme: 'filled_black',
      size: 'large',
      shape: 'pill',
      width: 320,
      text: 'signin_with',
    });
  }, [scriptLoaded, clientId, onAuth]);

  if (!clientId) {
    return null; // Don't render if Google OAuth not configured
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={containerRef} className="min-h-[44px]" />
      {loading && (
        <p className="text-sm text-white/50 animate-pulse">Signing in with Google...</p>
      )}
      {error && (
        <p className="text-sm text-magenta" role="alert">{error}</p>
      )}
    </div>
  );
}
