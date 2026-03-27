import React from 'react';

interface UsageMeterProps {
  /** Label for the meter */
  label: string;
  /** Current usage value */
  current: number;
  /** Maximum limit (-1 for unlimited) */
  limit: number;
  /** Unit suffix (e.g., "MB", "min") */
  unit?: string;
  /** Format style */
  format?: 'number' | 'decimal';
  /** Additional CSS classes */
  className?: string;
}

/**
 * UsageMeter - Progress bar visualization for usage metrics
 *
 * Features:
 * - Color-coded progress bar based on usage level (cyan/gold/magenta)
 * - Glow effect on bar fill matching accent color
 * - Current/limit display
 * - Unlimited support (limit = -1)
 * - Animated transitions
 */
export function UsageMeter({
  label,
  current,
  limit,
  unit = '',
  format = 'decimal',
  className = '',
}: UsageMeterProps) {
  // Calculate percentage (handle unlimited)
  const isUnlimited = limit === -1 || limit === undefined;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);

  // Get bar color and glow based on usage level
  const getBarStyle = (): React.CSSProperties => {
    let color: string;
    let glow: string;

    if (isUnlimited || percentage < 50) {
      color = 'var(--cyan)';
      glow = 'rgba(0, 240, 255, 0.3)';
    } else if (percentage < 75) {
      color = 'var(--gold)';
      glow = 'rgba(255, 215, 0, 0.3)';
    } else if (percentage < 90) {
      // Gold to magenta blend zone
      color = 'var(--gold)';
      glow = 'rgba(255, 215, 0, 0.3)';
    } else {
      color = 'var(--magenta)';
      glow = 'rgba(255, 0, 170, 0.3)';
    }

    return {
      height: '100%',
      width: isUnlimited ? '5%' : `${percentage}%`,
      background: color,
      boxShadow: `0 0 8px ${glow}, 0 0 4px ${glow}`,
      borderRadius: '3px',
      transition: 'all 0.3s ease-out',
    };
  };

  // Get value text color based on usage level
  const getValueColor = (): string => {
    if (isUnlimited || percentage < 90) {
      return 'var(--text-muted)';
    }
    return 'var(--magenta)';
  };

  // Get percentage warning color
  const getWarningColor = (): string => {
    if (percentage < 90) return 'var(--gold)';
    return 'var(--magenta)';
  };

  // Format numbers
  const formatValue = (val: number): string => {
    if (format === 'number') {
      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
      return val.toString();
    }
    return val.toFixed(val % 1 === 0 ? 0 : 1);
  };

  // Format display text
  const formatDisplay = (): string => {
    const currentStr = formatValue(current);
    if (isUnlimited) {
      return `${currentStr}${unit} / Unlimited`;
    }
    const limitStr = formatValue(limit);
    return `${currentStr}${unit} / ${limitStr}${unit}`;
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    fontWeight: 500,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
  };

  const valueStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    fontWeight: 500,
    color: getValueColor(),
  };

  const trackStyle: React.CSSProperties = {
    width: '100%',
    height: '6px',
    background: 'var(--surface)',
    borderRadius: '3px',
    overflow: 'hidden',
  };

  const headerRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.25rem',
  };

  const warningRowStyle: React.CSSProperties = {
    marginTop: '0.25rem',
    display: 'flex',
    justifyContent: 'flex-end',
  };

  const warningTextStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    fontWeight: 500,
    color: getWarningColor(),
  };

  return (
    <div className={className}>
      {/* Label and values */}
      <div style={headerRowStyle}>
        <span style={labelStyle}>{label}</span>
        <span style={valueStyle}>{formatDisplay()}</span>
      </div>

      {/* Progress bar */}
      <div style={trackStyle}>
        <div style={getBarStyle()} />
      </div>

      {/* Percentage indicator for high usage */}
      {!isUnlimited && percentage >= 75 && (
        <div style={warningRowStyle}>
          <span style={warningTextStyle}>
            {percentage.toFixed(0)}% used
          </span>
        </div>
      )}
    </div>
  );
}

export default UsageMeter;
