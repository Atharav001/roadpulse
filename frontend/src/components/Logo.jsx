import React from 'react';

/** RoadPulse mark: municipal navy + road-safety orange lane dashes */
export default function Logo({ size = 28, withWordmark = true, className = '' }) {
  return (
    <span className={`logo-mark ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="4" y="4" width="56" height="56" rx="14" fill="#1E4A7A" />
        <path
          d="M18 40h8l4-16h4l4 16h8"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20 22h24"
          stroke="#C45C26"
          strokeWidth="2.6"
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
