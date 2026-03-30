'use client';

import { useRef } from 'react';

interface TraitSliderProps {
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
  onChange: (value: number) => void;
  color?: string;
}

export function TraitSlider({
  label,
  leftLabel,
  rightLabel,
  value,
  onChange,
  color = '#00f0ff',
}: TraitSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Convert hex color to rgba with given opacity
  const fillColor = `${color}99`; // 60% opacity via hex 99 (~153/255)

  const thumbPercent = value; // 0-100

  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Main label */}
      <p className="text-xs text-white/60 font-medium text-center">{label}</p>

      {/* Track + thumb area */}
      <div className="relative w-full" ref={trackRef}>
        {/* Native range input (invisible but functional) */}
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          style={{ margin: 0, padding: 0 }}
        />

        {/* Visual track */}
        <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
          {/* Fill */}
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-100"
            style={{
              width: `${thumbPercent}%`,
              backgroundColor: fillColor,
            }}
          />
        </div>

        {/* Thumb */}
        <div
          className="absolute top-1/2 w-5 h-5 rounded-full -translate-y-1/2 -translate-x-1/2 pointer-events-none transition-all duration-100"
          style={{
            left: `${thumbPercent}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px 2px ${color}66, 0 0 0 2px rgba(0,0,0,0.6)`,
          }}
        />

        {/* Value display near thumb */}
        <div
          className="absolute -top-5 -translate-x-1/2 text-[9px] font-mono text-white/30 pointer-events-none transition-all duration-100"
          style={{ left: `${thumbPercent}%` }}
        >
          {value}
        </div>
      </div>

      {/* Left / right labels */}
      <div className="flex justify-between">
        <span className="text-[10px] text-white/40">{leftLabel}</span>
        <span className="text-[10px] text-white/40">{rightLabel}</span>
      </div>
    </div>
  );
}
