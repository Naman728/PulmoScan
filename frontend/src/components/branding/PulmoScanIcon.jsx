import React from 'react';

/** Small icon logo for sidebar: stylized lung + neural node. Teal/blue gradient. */
export default function PulmoScanIcon({ className = 'w-8 h-8' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="logo-icon-fg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <path
        d="M10 16c0-2 1.5-4 4-4s4 2 4 4v8c0 1.5-1 3-3 3h-2c-1.5 0-3-1.5-3-3V16z"
        fill="url(#logo-icon-fg)"
      />
      <path
        d="M18 16c0-2 1.5-4 4-4s4 2 4 4v8c0 1.5-1 3-3 3h-2c-1.5 0-3-1.5-3-3V16z"
        fill="url(#logo-icon-fg)"
      />
      <circle cx="16" cy="12" r="2.5" fill="white" />
    </svg>
  );
}
