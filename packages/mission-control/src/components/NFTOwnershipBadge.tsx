import { useState, useEffect } from 'react';

interface NFTOwnershipBadgeProps {
  /** Kin ID to check ownership for */
  kinId: string;
  /** Owner wallet address */
  ownerWallet?: string;
  /** Show verification button */
  showVerifyButton?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Callback when verification completes */
  onVerified?: (verified: boolean) => void;
}

interface VerificationStatus {
  verified: boolean;
  kin_id: string;
  owner_wallet: string;
  verified_at: string | null;
}

/**
 * NFTOwnershipBadge - Shows NFT ownership verification status
 *
 * Features:
 * - Shows verification status (verified/unverified/pending)
 * - Displays wallet address
 * - Links to Solana explorer
 * - Allows re-verification
 */
export function NFTOwnershipBadge({
  kinId,
  ownerWallet,
  showVerifyButton = true,
  className = '',
  onVerified,
}: NFTOwnershipBadgeProps): JSX.Element {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchVerificationStatus();
  }, [kinId]);

  const fetchVerificationStatus = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (ownerWallet) {
        params.append('wallet', ownerWallet);
      }

      const response = await fetch(`/api/nft/${kinId}/verify?${params}`);
      const data = await response.json();

      setStatus(data);
      onVerified?.(data.verified);
    } catch (error) {
      console.error('Failed to fetch verification status:', error);
      setStatus({
        verified: false,
        kin_id: kinId,
        owner_wallet: '',
        verified_at: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await fetchVerificationStatus();
    } finally {
      setVerifying(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  };

  // Loading state
  if (loading) {
    return (
      <div className={className} style={containerStyle}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: 'var(--cyan)',
          borderRightColor: 'var(--cyan)',
          animation: 'nft-spin 0.8s linear infinite',
        }} />
        <span style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          Checking...
        </span>
        <style>{`
          @keyframes nft-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // No status
  if (!status) {
    return (
      <div className={className} style={containerStyle}>
        <span style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          No NFT
        </span>
      </div>
    );
  }

  // Verified badge
  if (status.verified) {
    return (
      <div className={className} style={containerStyle}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 10px',
          borderRadius: 'var(--radius-pill)',
          fontSize: '12px',
          fontWeight: 500,
          fontFamily: 'var(--font-mono)',
          background: 'rgba(0,240,255,0.15)',
          color: 'var(--cyan)',
          border: '1px solid rgba(0,240,255,0.2)',
        }}>
          <span style={{ marginRight: '4px' }}>&#x2713;</span>
          NFT Verified
        </span>
        {ownerWallet && (
          <span style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            {ownerWallet.slice(0, 8)}...{ownerWallet.slice(-4)}
          </span>
        )}
        <a
          href={`https://explorer.solana.com/address/${kinId}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '12px',
            color: 'var(--cyan)',
            fontFamily: 'var(--font-mono)',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.textDecoration = 'underline'; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.textDecoration = 'none'; }}
        >
          View
        </a>
      </div>
    );
  }

  // Unverified badge
  return (
    <div className={className} style={containerStyle}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: 'var(--radius-pill)',
        fontSize: '12px',
        fontWeight: 500,
        fontFamily: 'var(--font-mono)',
        background: 'rgba(255,215,0,0.15)',
        color: 'var(--gold)',
        border: '1px solid rgba(255,215,0,0.2)',
      }}>
        <span style={{ marginRight: '4px' }}>&#x26A0;</span>
        Unverified
      </span>
      {showVerifyButton && (
        <button
          onClick={handleVerify}
          disabled={verifying}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--cyan)',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            cursor: verifying ? 'default' : 'pointer',
            opacity: verifying ? 0.5 : 1,
            padding: 0,
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => { if (!verifying) (e.target as HTMLElement).style.textDecoration = 'underline'; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.textDecoration = 'none'; }}
        >
          {verifying ? 'Verifying...' : 'Verify'}
        </button>
      )}
    </div>
  );
}

export default NFTOwnershipBadge;
