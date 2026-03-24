import React from 'react';
import { Lightbulb, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * AI Diagnostic Insight panel — dark theme.
 */
export default function AIInsightPanel({ text, className }) {
  const display = text || 'The model analyzed the imaging data. Review the probability distribution and confidence for clinical context.';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn(
        'rounded-2xl p-5',
        className
      )}
      style={{
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(6, 182, 212, 0.06))',
        border: '1px solid rgba(124, 58, 237, 0.15)',
      }}
    >
      <div className="flex gap-4">
        <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(124, 58, 237, 0.12)', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
          <Lightbulb className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              AI Diagnostic Insight
            </p>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed font-medium">
            {display}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
