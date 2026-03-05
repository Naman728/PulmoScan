import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { predictionService, patientService } from '../services/api';
import { ArrowLeft, Loader2, AlertCircle, User, Activity } from 'lucide-react';
import { formatConfidence } from '../utils/format';
import { cn } from '../utils/cn';
import {
  ConfidenceGauge,
  ProbabilityBars,
  RiskBadge,
  AIInsightPanel,
} from '../components/ai';
import { buildProbabilityItems, getAIInsightText } from '../utils/aiDisplay';
import { EmptyStateLung } from '../components/illustrations';
import { motion } from 'framer-motion';

export default function PredictionResult() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: prediction, isLoading, isError } = useQuery({
    queryKey: ['prediction', id],
    queryFn: () => predictionService.getOne(id),
  });

  const { data: patient } = useQuery({
    queryKey: ['patient', prediction?.patient_id],
    queryFn: () => patientService.getOne(prediction.patient_id),
    enabled: !!prediction?.patient_id,
  });

  const confidence = prediction?.confidence != null
    ? (Number(prediction.confidence) <= 1 ? Number(prediction.confidence) * 100 : Number(prediction.confidence))
    : 0;
  const diagnosis = prediction?.final_diagnosis ?? '—';
  const risk = prediction?.urgency_level ?? (confidence >= 70 ? 'High' : confidence >= 40 ? 'Medium' : 'Low');
  const probabilityItems = useMemo(
    () => (diagnosis && diagnosis !== '—' ? buildProbabilityItems(diagnosis, confidence) : []),
    [diagnosis, confidence]
  );
  const insightText = useMemo(
    () => (diagnosis && diagnosis !== '—' ? getAIInsightText(diagnosis, confidence) : null),
    [diagnosis, confidence]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
        <p className="mt-4 text-sm text-slate-400">Loading report...</p>
      </div>
    );
  }

  if (isError || !prediction) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <h2 className="mt-4 text-lg font-semibold text-white">Report not found</h2>
        <button
          type="button"
          onClick={() => navigate('/reports')}
          className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-400"
        >
          Back to reports
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl border border-slate-600 hover:bg-slate-800/60 text-slate-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Prediction detail</h1>
          <p className="text-sm text-slate-500">Report #{prediction.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Scan placeholder + Diagnosis card */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl overflow-hidden border border-slate-700/50"
          >
            <div className="aspect-video bg-slate-900/80 flex items-center justify-center border-b border-slate-700/50">
              <div className="text-center">
                <EmptyStateLung className="w-32 h-24 mx-auto text-sky-500/40" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">Scan image</p>
                <p className="text-xs text-slate-500 mt-0.5">Preview not stored</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-6 border border-sky-500/20 bg-sky-500/5"
          >
            <h2 className="text-sm font-semibold text-sky-400/90 uppercase tracking-wider mb-2">
              AI Predicted Diagnosis
            </h2>
            <p className="text-2xl font-bold text-white">{diagnosis}</p>
            <p className="mt-2 text-sm text-slate-400">
              This result is for decision support. Clinical verification is recommended.
            </p>
          </motion.div>
        </div>

        {/* Right: Full AI Analysis Panel */}
        <div className="lg:col-span-7 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card rounded-2xl border border-slate-700/50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-slate-700/50 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-semibold text-white">AI Analysis Results</span>
            </div>
            <div className="p-6 space-y-6">
              {/* Confidence + Risk row */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Confidence
                  </p>
                  <p className="text-3xl font-bold text-white tabular-nums">
                    {formatConfidence(confidence)}
                  </p>
                </div>
                <RiskBadge level={risk} label="Risk Level" />
              </div>

              <ConfidenceGauge value={confidence} label="AI Confidence" />

              {probabilityItems.length > 0 && (
                <ProbabilityBars items={probabilityItems} title="Probability Distribution" />
              )}

              <AIInsightPanel text={insightText} />

              {/* Heatmap placeholder */}
              <div className="rounded-xl border border-slate-600 border-dashed bg-slate-800/30 p-6 text-center">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  AI Attention Map
                </p>
                <p className="text-xs text-slate-500 mt-1">Coming Soon</p>
              </div>
            </div>
          </motion.div>

          {patient && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              type="button"
              onClick={() => navigate(`/patients/${patient.id}`)}
              className="w-full flex items-center gap-3 p-4 rounded-xl glass-card border border-slate-700/50 hover:border-sky-500/30 text-left transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center">
                <User className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <p className="font-medium text-white">{patient.name}</p>
                <p className="text-sm text-slate-400">View patient profile</p>
              </div>
            </motion.button>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="glass-card rounded-xl p-6 border border-slate-700/50"
          >
            <h3 className="text-sm font-semibold text-white mb-3">Doctor notes</h3>
            <textarea
              placeholder="Add notes..."
              className="w-full min-h-[100px] px-3 py-2 border border-slate-600 rounded-lg bg-slate-800/50 text-slate-200 placeholder-slate-500 text-sm resize-y focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50"
              readOnly
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
