import React from 'react';
import { Lightbulb, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * AI Diagnostic Insight panel — updated for PulmoScan redesign.
 */
export default function AIInsightPanel({ text, className }) {
  const display = text || 'The model analyzed the imaging data. Review the probability distribution and confidence for clinical context.';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn(
        'rounded-2xl border border-sky-100 bg-sky-50 p-5',
        className
      )}
    >
      <div className="flex gap-4">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center border border-sky-200">
          <Lightbulb className="w-5 h-5 text-sky-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Info className="w-3.5 h-3.5 text-sky-500" />
            <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">
              AI Diagnostic Insight
            </p>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed font-medium">
            {display}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
