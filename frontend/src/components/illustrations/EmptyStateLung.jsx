import React from 'react';

/** Medical lung illustration for empty scan state. Professional, clean. */
export default function EmptyStateLung({ className = 'w-48 h-48' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="lung-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <path
        d="M40 52c0-8 5-14 12-14s12 6 12 14v22c0 6-4 10-10 10H50c-6 0-10-4-10-10V52z"
        stroke="url(#lung-grad)"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M108 52c0-8 5-14 12-14s12 6 12 14v22c0 6-4 10-10 10h-12c-6 0-10-4-10-10V52z"
        stroke="url(#lung-grad)"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="80" cy="38" r="6" stroke="url(#lung-grad)" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
