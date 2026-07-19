import React from 'react';

/** RoadPulse mark: road path + amber center dashes = pulse of civic signal */
export default function Logo({ size = 28, withWordmark = true, className = '' }) {
  return (
    <span className={`logo-mark ${className}`} style={{ '--logo-size': `${size}px` }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="rpLogoGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2DD4BF" />
            <stop offset="1" stopColor="#0F766E" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#rpLogoGrad)" />
        <path
          d="M18 40h8l4-16h4l4 16h8"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20 22h24"
          stroke="#FBBF24"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="3 5"
        />
      </svg>
      {withWordmark && (
        <span className="logo-word">
          Road<span>Pulse</span>
        </span>
      )}
    </span>
  );
}
