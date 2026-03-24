import React, { useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { predictionService, patientService, API_BASE_URL } from '../services/api';
import { ArrowLeft, Loader2, AlertCircle, User, Activity, Search, Zap, BarChart3, Brain, Eye, Target } from 'lucide-react';
import { formatConfidence } from '../utils/format';
import { cn } from '@/lib/utils';
import {
  ConfidenceGauge,
  ProbabilityBars,
  RiskBadge,
  AIInsightPanel,
} from '../components/ai';
import { buildProbabilityItems, buildProbabilityItemsFromConditions, getAIInsightText } from '../utils/aiDisplay';
import { EmptyStateLung } from '../components/illustrations';
import { motion } from 'framer-motion';

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' } }),
};

function SectionCard({ icon: Icon, title, children, color = 'sky', delay = 0 }) {
  const colors = {
    sky: { icon: 'text-cyan-400', bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.2)' },
    teal: { icon: 'text-teal-400', bg: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.2)' },
    purple: { icon: 'text-purple-400', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.2)' },
    amber: { icon: 'text-amber-400', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.2)' },
  };
  const c = colors[color] || colors.sky;
  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={delay}
      className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="px-6 py-4 border-b flex items-center gap-3"
        style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
          <Icon className={cn('w-4.5 h-4.5', c.icon)} />
        </div>
        <h3 className="text-sm font-bold text-gray-200">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </motion.div>
  );
}

export default function PredictionResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const printRequested = searchParams.get('print') === '1';
  const hasPrinted = useRef(false);

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
  const conditions = prediction?.model_outputs?.conditions ?? prediction?.conditions ?? [];

  const probabilityItems = useMemo(() => {
    if (Array.isArray(conditions) && conditions.length > 0) return buildProbabilityItemsFromConditions(conditions);
    if (diagnosis && diagnosis !== '—') return buildProbabilityItems(diagnosis, confidence);
    return [];
  }, [conditions, diagnosis, confidence]);

  const insightText = useMemo(
    () => (diagnosis && diagnosis !== '—' ? getAIInsightText(diagnosis, confidence) : null),
    [diagnosis, confidence]
  );

  const analysis = useMemo(() => {
    const a = prediction?.analysis ?? prediction?.model_outputs?.analysis ?? null;
    if (!a || typeof a !== 'object') return null;
    return {
      regions_found: a.regions_found ?? 0,
      feature_scores: a.feature_scores ?? a.features ?? {},
      feature_analysis: a.feature_analysis ?? { mean_score: a.mean_score ?? 0, features: a.features ?? {} },
      regions: Array.isArray(a.regions) ? a.regions : [],
      heatmap: a.heatmap_path ?? a.heatmap ?? '',
      gradcam: a.overlay_path ?? a.gradcam ?? '',
      deviation_map: a.deviation_map_path ?? a.deviation_map ?? '',
      normal_reference: a.normal_reference_path ?? a.normal_reference ?? '',
      regions_image: a.region_visualization_path ?? a.regions_image_path ?? a.regions_image ?? '',
      region_visualization: a.region_visualization_path ?? a.regions_image_path ?? a.regions_image ?? '',
      patient_ct: a.patient_ct_path ?? a.patient_ct ?? '',
    };
  }, [prediction]);

  const originalCtSrc = prediction?.image_path ? (() => {
    const path = prediction.image_path;
    const trimmed = path.replace(/^\//, '');
    return trimmed.startsWith('http') ? trimmed : `${API_BASE_URL}/${trimmed}`;
  })() : (prediction?.model_outputs?.image_path ? (() => {
    const path = prediction.model_outputs.image_path;
    const trimmed = path.replace(/^\//, '');
    return trimmed.startsWith('http') ? trimmed : `${API_BASE_URL}/${trimmed}`;
  })() : null);

  const featureBarItems = useMemo(() => {
    if (!analysis) return [];
    const scores = analysis.feature_scores ?? analysis.feature_analysis?.features ?? {};
    if (typeof scores !== 'object' || Object.keys(scores).length === 0) return [];
    return Object.entries(scores).map(([key, value]) => {
      const pct = Math.round(Number(value) * 100) || 0;
      const status = pct >= 60 ? 'ELEVATED' : pct >= 30 ? 'MODERATE' : 'NORMAL';
      return { label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), value: pct, status };
    });
  }, [analysis]);

  const elevatedCount = useMemo(() => featureBarItems.filter((f) => f.status === 'ELEVATED').length, [featureBarItems]);

  const imageUrl = (path, cacheBuster) => {
    if (!path || typeof path !== 'string') return null;
    const trimmed = path.replace(/^\//, '');
    const base = trimmed.startsWith('http') ? trimmed : `${API_BASE_URL}/${trimmed}`;
    return cacheBuster ? `${base}?t=${cacheBuster}` : base;
  };

  const scanId = prediction?.model_outputs?.scan_id ?? prediction?.analysis?.scan_id ?? '';

  useEffect(() => {
    if (printRequested && prediction && !hasPrinted.current) {
      hasPrinted.current = true;
      window.print();
    }
  }, [printRequested, prediction]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)', boxShadow: '0 8px 32px rgba(124,58,237,0.3)' }}>
          <Brain className="w-8 h-8 text-white animate-pulse" />
        </div>
        <p className="text-gray-400 font-semibold uppercase tracking-widest text-sm">Loading Report</p>
      </div>
    );
  }

  if (isError || !prediction) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle className="w-16 h-16 text-rose-500 mb-6" />
        <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Report not found</h2>
        <button type="button" onClick={() => navigate('/dashboard')}
          className="mt-6 ps-btn-primary">Back to Dashboard</button>
      </div>
    );
  }

  const riskBadge = {
    High: { label: 'High Risk', className: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
    Medium: { label: 'Moderate Risk', className: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    Low: { label: 'Low Risk', className: 'bg-teal-500/10 text-teal-400 border-teal-500/30' },
  }[risk] || { label: 'Low Risk', className: 'bg-teal-500/10 text-teal-400 border-teal-500/30' };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}
        className="flex items-center gap-4 no-print">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Prediction Report</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">#{prediction.id}</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── LEFT COLUMN ── */}
        <div className="lg:col-span-4 space-y-6">
          {/* CT Scan Preview */}
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}
            className="rounded-3xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-gray-500" />
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Original Scan</h3>
              </div>
            </div>
            <div className="bg-[#0A0A0F] min-h-[300px] flex items-center justify-center p-4">
              {originalCtSrc ? (
                <img src={originalCtSrc} alt="Original CT" className="w-full h-auto max-h-[380px] object-contain rounded-2xl border" style={{ borderColor: 'rgba(255,255,255,0.04)' }} />
              ) : (
                <div className="text-center py-8">
                  <EmptyStateLung className="w-20 h-14 mx-auto text-gray-700 mb-3" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Image Unavailable</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Diagnosis Card */}
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}
            className="rounded-3xl p-6 text-white relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(6, 182, 212, 0.1))',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              boxShadow: '0 8px 32px rgba(124,58,237,0.1)',
            }}>
            <div className="h-1 absolute top-0 left-0 right-0" style={{ background: 'linear-gradient(90deg, #7C3AED, #06B6D4)' }} />
            <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Brain className="w-4 h-4" /> Final Diagnosis
            </p>
            <h2 className="text-3xl font-black text-white leading-tight mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{diagnosis}</h2>
            <p className="text-gray-400 text-xs mb-6">Pending radiologist verification.</p>
            
            <div className="flex items-center justify-between">
              <span className={cn('text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full border', riskBadge.className)}>{riskBadge.label}</span>
              <div className="text-right">
                <span className="text-xl font-black tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">{formatConfidence(confidence)}</span>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Confidence</p>
              </div>
            </div>
          </motion.div>

          {/* Patient Card */}
          {patient && (
            <motion.button
              variants={cardVariants} initial="hidden" animate="visible" custom={3}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => navigate(`/patients/${patient.id}`)}
              className="w-full flex items-center gap-4 p-5 rounded-3xl text-left transition-all group"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold shrink-0 transition-transform group-hover:scale-110"
                style={{ background: 'rgba(124, 58, 237, 0.2)', border: '1px solid rgba(124, 58, 237, 0.3)' }}>
                {patient.name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-200 text-base">{patient.name}</p>
                <p className="text-xs text-purple-400 mt-1 uppercase tracking-widest group-hover:text-cyan-400 transition-colors">View Profile →</p>
              </div>
            </motion.button>
          )}

          {/* Doctor Notes */}
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={4}
            className="rounded-3xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Clinical Notes</h3>
            <textarea
              placeholder="No additional notes."
              className="w-full min-h-[120px] px-4 py-3 rounded-2xl text-gray-300 placeholder-gray-600 text-sm resize-y outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              readOnly
            />
          </motion.div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="lg:col-span-8 space-y-6">
          {/* AI Analysis Results */}
          <SectionCard icon={Activity} title="AI Analysis Metrics" color="purple" delay={2}>
            <div className="space-y-6">
              <ConfidenceGauge value={confidence} label="Overall Model Confidence" />

              {probabilityItems.length > 0 && (
                <ProbabilityBars items={probabilityItems} title="Disease Probabilities" />
              )}

              <AIInsightPanel text={insightText} />
            </div>
          </SectionCard>

          {/* Analysis Details (if full analysis exists) */}
          {analysis && (
            <>
              <SectionCard icon={Target} title="Feature Identification" color="cyan" delay={3}>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { icon: Search, label: 'Detected Regions', value: analysis.regions_found ?? 0, color: '#A855F7' },
                    { icon: Zap, label: 'Elevated Flags', value: elevatedCount, color: '#06B6D4' },
                    { icon: BarChart3, label: 'Avg Severity', value: analysis.feature_analysis?.mean_score ?? analysis.mean_score ?? 0, color: '#F59E0B' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="rounded-2xl p-5 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <Icon className="w-5 h-5 mx-auto mb-3" style={{ color }} />
                      <p className="text-3xl font-black tabular-nums" style={{ color }}>{value}</p>
                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Feature Bar Items */}
                {featureBarItems.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Identified Features</p>
                    {featureBarItems.map((item) => (
                      <div key={item.label} className="flex items-center gap-4">
                        <span className="text-sm text-gray-300 w-44 shrink-0 font-medium truncate" title={item.label}>{item.label}</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: item.status === 'ELEVATED' ? '#F43F5E' : item.status === 'MODERATE' ? '#F59E0B' : '#14B8A6' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, item.value)}%` }}
                            transition={{ duration: 0.7 }}
                          />
                        </div>
                        <span className="text-sm text-gray-400 tabular-nums w-12 text-right font-bold">{item.value}%</span>
                        <span className="text-[8px] font-black uppercase px-2.5 py-1 rounded-full w-24 text-center border tracking-widest"
                          style={{
                            background: item.status === 'ELEVATED' ? 'rgba(244,63,94,0.1)' : item.status === 'MODERATE' ? 'rgba(245,158,11,0.1)' : 'rgba(20,184,166,0.1)',
                            color: item.status === 'ELEVATED' ? '#F43F5E' : item.status === 'MODERATE' ? '#F59E0B' : '#14B8A6',
                            borderColor: item.status === 'ELEVATED' ? 'rgba(244,63,94,0.3)' : item.status === 'MODERATE' ? 'rgba(245,158,11,0.3)' : 'rgba(20,184,166,0.3)'
                          }}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Comparative Image Grid */}
              <SectionCard icon={Eye} title="Visualization Data" color="teal" delay={4}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(analysis.patient_ct && imageUrl(analysis.patient_ct, scanId)) || originalCtSrc ? (
                    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#000' }}>
                      <img src={imageUrl(analysis.patient_ct, scanId) ?? originalCtSrc} alt="Patient CT" className="w-full h-auto max-h-[160px] object-cover opacity-80 hover:opacity-100 transition-opacity" />
                    </div>
                  ) : null}
                  {analysis.normal_reference && imageUrl(analysis.normal_reference, scanId) && (
                    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#000' }}>
                      <img src={imageUrl(analysis.normal_reference, scanId)} alt="Normal Ref" className="w-full h-auto max-h-[160px] object-cover opacity-80 hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                  {((analysis.deviation_map && imageUrl(analysis.deviation_map, scanId)) || (analysis.heatmap && imageUrl(analysis.heatmap, scanId))) && (
                    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#000' }}>
                      <img src={imageUrl(analysis.deviation_map || analysis.heatmap, scanId)} alt="Map" className="w-full h-auto max-h-[160px] object-cover opacity-80 hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                  {(analysis.region_visualization && imageUrl(analysis.region_visualization, scanId)) || (analysis.regions_image && imageUrl(analysis.regions_image, scanId)) ? (
                    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#000' }}>
                      <img src={imageUrl(analysis.region_visualization || analysis.regions_image, scanId)} alt="Regions" className="w-full h-auto max-h-[160px] object-cover opacity-80 hover:opacity-100 transition-opacity" />
                    </div>
                  ) : null}
                </div>
                <button type="button" onClick={() => navigate(`/ct-analysis/${scanId || id}`, { state: { analysisData: analysis } })}
                  className="mt-6 w-full py-4 rounded-2xl font-bold text-sm text-cyan-400 transition-all flex items-center justify-center gap-2"
                  style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
                  Launch Full Interactive Viewer <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </SectionCard>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
