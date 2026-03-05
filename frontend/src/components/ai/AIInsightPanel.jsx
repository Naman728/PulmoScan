import React from 'react';
import { Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

/**
 * AI Diagnostic Insight panel – dynamic text from prediction.
 */
export default function AIInsightPanel({ text, className }) {
  const display = text || 'The model analyzed the imaging data. Review the probability distribution and confidence for clinical context.';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn(
        'rounded-xl border border-sky-500/20 bg-sky-500/5 p-4',
        className
      )}
    >
      <div className="flex gap-3">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-sky-500/20 flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-sky-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-sky-400/90 uppercase tracking-wider mb-1">
            AI Diagnostic Insight
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">{display}</p>
        </div>
      </div>
    </motion.div>
  );
}
