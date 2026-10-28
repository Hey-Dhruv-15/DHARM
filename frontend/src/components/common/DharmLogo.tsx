import React from 'react';

interface DharmLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  theme?: 'dark' | 'light';
  className?: string;
}

export const DharmLogo: React.FC<DharmLogoProps> = ({
  size = 'md',
  showTagline = true,
  theme = 'light',
  className = ''
}) => {
  const config = {
    sm: { iconSize: 28, text: 'text-xl', sub: 'text-[7.5px]' },
    md: { iconSize: 34, text: 'text-2xl', sub: 'text-[8.5px]' },
    lg: { iconSize: 42, text: 'text-3xl', sub: 'text-[10px]' },
    xl: { iconSize: 52, text: 'text-4xl', sub: 'text-xs' }
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Freestanding Sleek Tech Emblem */}
      <svg
        width={config.iconSize}
        height={config.iconSize}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
      >
        <defs>
          {/* Main Gradient: Electric Cyan to Royal Indigo to Violet */}
          <linearGradient id="dharmGradPrimary" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="40%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>

          {/* Secondary Ribbon Gradient */}
          <linearGradient id="dharmGradSecondary" x1="10" y1="18" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>

        {/* Outer Continuous 'D' Handover Loop */}
        <path
          d="M10 30V8C10 5.79086 11.7909 4 14 4H18C25.732 4 32 10.268 32 18C32 25.732 25.732 32 18 32H12C10.8954 32 10 31.1046 10 30Z"
          stroke="url(#dharmGradPrimary)"
          strokeWidth="3.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inner Interlocking Custody Loop (Forms the infinite handover cycle) */}
        <path
          d="M17 12H19C22.3137 12 25 14.6863 25 18C25 21.3137 22.3137 24 19 24H10"
          stroke="url(#dharmGradSecondary)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dynamic Verification Check Core Dot */}
        <circle cx="19" cy="18" r="2.2" fill="#06B6D4" />
      </svg>

      {/* Clean Modern Wordmark */}
      <div className="flex flex-col justify-center">
        <span
          className={`font-black tracking-tight leading-none ${config.text} ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}
          style={{ letterSpacing: '-0.04em' }}
        >
          dharm
        </span>

        {showTagline && (
          <span
            className={`font-extrabold uppercase mt-1 leading-none ${config.sub} ${
              theme === 'dark' ? 'text-indigo-400' : 'text-[#4F46E5]'
            }`}
            style={{ letterSpacing: '0.18em' }}
          >
            INTELLIGENT LOGISTICS PLATFORM
          </span>
        )}
      </div>
    </div>
  );
};
