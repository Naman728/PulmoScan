import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';

const STEPS = [
  'Scanning lung structures...',
  'Detecting abnormalities...',
  'Generating diagnosis...',
];

/**
 * AI analysis loading state with rotating step messages and pulsing animation.
 */
export default function AILoadingSteps({ className = '' }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative mb-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
          <Activity className="w-8 h-8 text-sky-400" />
        </div>
        <motion.div
          className="absolute -inset-1 rounded-3xl border-2 border-sky-500/30"
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>
      <p className="text-sm font-medium text-slate-400 mb-1">AI Neural Analysis Running</p>
      <AnimatePresence mode="wait">
        <motion.p
          key={step}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="text-xs text-sky-400/90"
        >
          {STEPS[step]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
