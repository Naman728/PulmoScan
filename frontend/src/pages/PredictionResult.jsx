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
    sky: { icon: 'text-sky-600', bg: 'bg-sky-50 border-sky-100' },
    teal: { icon: 'text-teal-600', bg: 'bg-teal-50 border-teal-100' },
    purple: { icon: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
    amber: { icon: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
  };
  const c = colors[color] || colors.sky;
  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={delay}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, #F8FAFC, #F0F9FF)' }}>
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center border', c.bg)}>
          <Icon className={cn('w-4 h-4', c.icon)} />
        </div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
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
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #14B8A6)', boxShadow: '0 8px 24px rgba(14,165,233,0.3)' }}>
          <Brain className="w-8 h-8 text-white animate-pulse" />
        </div>
        <p className="text-sm font-semibold text-slate-500">Loading report...</p>
      </div>
    );
  }

  if (isError || !prediction) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mb-4" />
        <h2 className="text-lg font-bold text-slate-900">Report not found</h2>
        <button type="button" onClick={() => navigate('/reports')}
          className="mt-4 ps-btn-primary">Back to reports</button>
      </div>
    );
  }

  const riskConfig = {
    High: { label: 'High Risk', className: 'bg-rose-50 text-rose-700 border-rose-200' },
    Medium: { label: 'Moderate Risk', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    Low: { label: 'Low Risk', className: 'bg-teal-50 text-teal-700 border-teal-200' },
  };
  const riskBadge = riskConfig[risk] || riskConfig.Low;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}
        className="flex items-center gap-4 no-print">
        <button type="button" onClick={() => navigate(-1)}
          className="ps-btn-secondary text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900">Prediction Report</h1>
          <p className="text-xs text-slate-400">Report #{prediction.id}</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── LEFT COLUMN ── */}
        <div className="lg:col-span-5 space-y-5">
          {/* CT Scan Preview */}
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}
            className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-3"
              style={{ background: 'linear-gradient(135deg, #F8FAFC, #F0F9FF)' }}>
              <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center">
                <Eye className="w-4 h-4 text-sky-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">CT Scan Preview</h3>
            </div>
            <div className="bg-slate-950 min-h-[360px] flex items-center justify-center p-4">
              {originalCtSrc ? (
                <img src={originalCtSrc} alt="Original CT" className="w-full h-auto max-h-[480px] object-contain rounded-xl" />
              ) : (
                <div className="text-center py-8">
                  <EmptyStateLung className="w-24 h-16 mx-auto text-slate-600/40 mb-3" />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scan image</p>
                  <p className="text-xs text-slate-600 mt-0.5">Preview not stored</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Diagnosis Card */}
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}
            className="rounded-2xl p-5 text-white overflow-hidden relative"
            style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0F2027 100%)' }}>
            <div className="h-0.5 absolute top-0 left-0 right-0" style={{ background: 'linear-gradient(90deg, #0EA5E9, #14B8A6)' }} />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Brain className="w-3 h-3 text-sky-400" /> AI Predicted Diagnosis
            </p>
            <h2 className="text-xl font-black text-white">{diagnosis}</h2>
            <p className="text-slate-400 text-xs mt-2">For decision support only. Clinical verification recommended.</p>
            <div className="mt-4 flex items-center gap-3">
              <span className={cn('text-xs font-bold px-3 py-1.5 rounded-full border', riskBadge.className)}>{riskBadge.label}</span>
              <span className="text-sm font-bold text-sky-400">{formatConfidence(confidence)}</span>
            </div>
          </motion.div>

          {/* Patient Card */}
          {patient && (
            <motion.button
              variants={cardVariants} initial="hidden" animate="visible" custom={3}
              type="button"
              onClick={() => navigate(`/patients/${patient.id}`)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-100 hover:border-sky-200 hover:shadow-md text-left transition-all shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg, #0EA5E9, #14B8A6)' }}>
                {patient.name?.charAt(0)?.toUpperCase() ?? 'P'}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800 text-sm">{patient.name}</p>
                <p className="text-xs text-slate-400">View patient profile →</p>
              </div>
            </motion.button>
          )}

          {/* Doctor Notes */}
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={4}
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Doctor Notes</h3>
            <textarea
              placeholder="Add clinical notes..."
              className="w-full min-h-[100px] px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 placeholder-slate-400 text-sm resize-y outline-none focus:ring-2 focus:border-sky-400 transition-all"
              readOnly
            />
          </motion.div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="lg:col-span-7 space-y-5">
          {/* AI Analysis Results */}
          <SectionCard icon={Activity} title="AI Analysis Results" color="sky" delay={2}>
            <div className="space-y-5">
              {/* Confidence + Risk Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl p-4 text-center border border-slate-100 bg-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Confidence</p>
                  <p className="text-3xl font-black tabular-nums text-sky-600">{formatConfidence(confidence)}</p>
                </div>
                <RiskBadge level={risk} label="Risk Level" />
              </div>

              <ConfidenceGauge value={confidence} label="AI Confidence Score" />

              {probabilityItems.length > 0 && (
                <ProbabilityBars items={probabilityItems} title="Probability Distribution" />
              )}

              <AIInsightPanel text={insightText} />
            </div>
          </SectionCard>

          {/* Analysis Metrics */}
          {analysis && (
            <>
              <SectionCard icon={Target} title="Analysis Metrics" color="teal" delay={3}>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { icon: Search, label: 'Regions Found', value: analysis.regions_found ?? 0, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
                    { icon: Zap, label: 'Elevated Features', value: elevatedCount, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-100' },
                    { icon: BarChart3, label: 'Mean Score', value: analysis.feature_analysis?.mean_score ?? analysis.mean_score ?? 0, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
                  ].map(({ icon: Icon, label, value, color, bg }) => (
                    <div key={label} className={cn('rounded-2xl p-4 border text-center', bg)}>
                      <Icon className={cn('w-4 h-4 mx-auto mb-2', color)} />
                      <p className={cn('text-2xl font-black tabular-nums', color)}>{value}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Feature Bar Items */}
                {featureBarItems.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CT Feature Analysis</p>
                    {featureBarItems.map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className={cn('w-2 h-2 rounded-full shrink-0',
                          item.status === 'ELEVATED' ? 'bg-rose-500' :
                            item.status === 'MODERATE' ? 'bg-amber-400' : 'bg-teal-500')} />
                        <span className="text-sm text-slate-700 w-44 shrink-0 font-medium">{item.label}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            className={cn('h-full rounded-full',
                              item.status === 'ELEVATED' ? 'bg-rose-500' :
                                item.status === 'MODERATE' ? 'bg-amber-400' : 'bg-teal-500')}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, item.value)}%` }}
                            transition={{ duration: 0.7 }}
                          />
                        </div>
                        <span className="text-sm text-slate-600 tabular-nums w-10 text-right font-semibold">{item.value}%</span>
                        <span className={cn(
                          'text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border',
                          item.status === 'ELEVATED' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                            item.status === 'MODERATE' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                              'bg-teal-50 text-teal-600 border-teal-200'
                        )}>{item.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Suspicious Regions Table */}
              {analysis.regions?.length > 0 && (
                <SectionCard icon={Target} title="Suspicious Region Details" color="amber" delay={4}>
                  <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Position & Size</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Area</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.regions.map((r, i) => {
                          const conf = typeof r.confidence === 'number'
                            ? (r.confidence <= 1 ? Math.round(r.confidence * 100) : Math.round(r.confidence))
                            : (r.confidence ?? 0);
                          const area = (r.w ?? 0) * (r.h ?? 0);
                          const isHigh = conf >= 50;
                          return (
                            <tr key={i} className="border-b border-slate-50 hover:bg-sky-50/30 transition-colors last:border-0">
                              <td className="px-4 py-3">
                                <span className={cn(
                                  'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold inline-flex',
                                  isHigh ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-700'
                                )}>R{i + 1}</span>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-600">({r.x}, {r.y}) · {r.w}×{r.h}px</td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-600">{area} px²</td>
                              <td className="px-4 py-3">
                                <span className={cn(
                                  'text-sm font-bold',
                                  isHigh ? 'text-rose-600' : 'text-teal-600'
                                )}>{conf}%</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              )}

              {/* Comparative Image Grid */}
              <SectionCard icon={Eye} title="Comparative Analysis" color="purple" delay={5}>
                <p className="text-xs text-slate-400 mb-4">Patient CT vs Normal Reference — deviation map and region visualization</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {(analysis.patient_ct && imageUrl(analysis.patient_ct, scanId)) || originalCtSrc ? (
                    <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-700/50">
                      <img src={imageUrl(analysis.patient_ct, scanId) ?? originalCtSrc} alt="Patient CT"
                        className="w-full h-auto object-contain" />
                      <p className="px-2 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center border-t border-slate-800 bg-slate-950/80">Patient CT</p>
                    </div>
                  ) : null}
                  {analysis.normal_reference && imageUrl(analysis.normal_reference, scanId) && (
                    <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-700/50">
                      <img src={imageUrl(analysis.normal_reference, scanId)} alt="Normal Reference"
                        className="w-full h-auto object-contain" />
                      <p className="px-2 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center border-t border-slate-800 bg-slate-950/80">Normal Ref</p>
                    </div>
                  )}
                  {((analysis.deviation_map && imageUrl(analysis.deviation_map, scanId)) || (analysis.heatmap && imageUrl(analysis.heatmap, scanId))) && (
                    <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-700/50">
                      <img src={imageUrl(analysis.deviation_map || analysis.heatmap, scanId)} alt="Deviation Map"
                        className="w-full h-auto object-contain" />
                      <p className="px-2 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center border-t border-slate-800 bg-slate-950/80">Deviation Map</p>
                    </div>
                  )}
                  {(analysis.region_visualization && imageUrl(analysis.region_visualization, scanId)) || (analysis.regions_image && imageUrl(analysis.regions_image, scanId)) ? (
                    <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-700/50">
                      <img src={imageUrl(analysis.region_visualization || analysis.regions_image, scanId)} alt="Regions"
                        className="w-full h-auto object-contain" />
                      <p className="px-2 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center border-t border-slate-800 bg-slate-950/80">Regions</p>
                    </div>
                  ) : null}
                </div>
              </SectionCard>

              {/* Grad-CAM */}
              {analysis.gradcam && imageUrl(analysis.gradcam, scanId) && (
                <SectionCard icon={Eye} title="Grad-CAM · Model Attention" color="teal" delay={6}>
                  <p className="text-xs text-slate-400 mb-4">Regions that influenced the model's feature scores</p>
                  <div className="rounded-xl bg-slate-900 border border-slate-700/50 overflow-hidden">
                    <img src={imageUrl(analysis.gradcam, scanId)} alt="Grad-CAM attention overlay"
                      className="w-full max-h-[400px] object-contain" />
                  </div>
                </SectionCard>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
