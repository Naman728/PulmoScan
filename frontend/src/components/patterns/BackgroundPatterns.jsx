import React from 'react';

const OPACITY = 0.04;

/**
 * Subtle background patterns: medical grid, neural dots, lung outline.
 * Use as a fixed full-screen layer behind content. Opacity ~3-5%.
 */
export default function BackgroundPatterns() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden
    >
      {/* Medical grid */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: OPACITY }}>
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" className="text-sky-400" />
      </svg>

      {/* Neural / node pattern */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: OPACITY * 0.8 }}>
        <defs>
          <pattern id="neurons" width="80" height="80" patternUnits="userSpaceOnUse">
            {[0, 1, 2, 3, 4].flatMap((i) =>
              [0, 1, 2, 3, 4].map((j) => (
                <circle
                  key={`${i}-${j}`}
                  cx={16 + i * 20}
                  cy={16 + j * 20}
                  r="1.5"
                  fill="currentColor"
                  className="text-teal-400"
                />
              ))
            )}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#neurons)" />
      </svg>

      {/* Lung outline watermark - centered, very faint */}
      <svg
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(80vw,600px)] h-[min(60vh,400px)]"
        style={{ opacity: OPACITY }}
        viewBox="0 0 200 120"
        fill="none"
      >
        <path
          d="M50 60c0-12 8-22 20-22s20 10 20 22v30c0 8-6 14-14 14H64c-8 0-14-6-14-14V60z"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-teal-400"
        />
        <path
          d="M130 60c0-12 8-22 20-22s20 10 20 22v30c0 8-6 14-14 14h-12c-8 0-14-6-14-14V60z"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-teal-400"
        />
      </svg>
    </div>
  );
}
