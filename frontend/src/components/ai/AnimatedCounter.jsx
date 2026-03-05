import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * Animates a number from 0 to the target value.
 */
export default function AnimatedCounter({ value, duration = 1.2, decimals = 0, prefix = '', suffix = '' }) {
  const [display, setDisplay] = useState(0);
  const num = Number(value) || 0;

  useEffect(() => {
    let start = 0;
    const end = num;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * easeOut;
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [num, duration]);

  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display);

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="tabular-nums"
    >
      {prefix}{formatted}{suffix}
    </motion.span>
  );
}
