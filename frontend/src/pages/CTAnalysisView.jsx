import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { API_BASE_URL, reportService } from '../services/api';
import {
  ArrowLeft, Save, X, ZoomIn, Brain, Activity, MapPin, Eye,
  AlertTriangle, CheckCircle, Layers, Target, BarChart3, Scan,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const PLACEHOLDER_SVG = 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect fill="#F1F5F9" width="400" height="300" rx="12"/>
    <rect fill="#E2E8F0" x="160" y="100" width="80" height="80" rx="8"/>
    <text x="50%" y="72%" dominant-baseline="middle" text-anchor="middle" fill="#94A3B8" font-size="13" font-family="system-ui">No image available</text>
  </svg>`
);

const FEATURE_LABELS = {
  spiculated_nodule: 'Spiculated Nodule',
  ground_glass_opacity: 'Ground Glass Opacity',
  cavitary_lesion: 'Cavitary Lesion',
  pleural_effusion: 'Pleural Effusion',
  upper_lobe_predominant: 'Upper Lobe Predominant',
  lymph_node: 'Lymph Node',
  lymph_node_involvement: 'Lymph Node',
};

function buildImageUrl(path, scanId) {
  if (!path || typeof path !== 'string') return null;
  const trimmed = path.replace(/^\//, '');
  if (trimmed.startsWith('http')) return trimmed;
  const base = `${API_BASE_URL}/${trimmed}`;
  const cacheBuster = scanId || Date.now();
  return `${base}?t=${cacheBuster}`;
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' } }),
};

function SectionHeader({ icon: Icon, title, subtitle, color = 'sky' }) {
  const colors = {
    sky: { icon: 'text-sky-600', bg: 'bg-sky-50 border-sky-100' },
    teal: { icon: 'text-teal-600', bg: 'bg-teal-50 border-teal-100' },
    purple: { icon: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
    amber: { icon: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
    rose: { icon: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' },
  };
  const c = colors[color] || colors.sky;
  return (
    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center border', c.bg)}>
        <Icon className={cn('w-4.5 h-4.5', c.icon)} style={{ width: '18px', height: '18px' }} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}

function ImageCard({ title, src, subtitle, badge, onExpand }) {
  const url = src || PLACEHOLDER_SVG;
  const isFallback = !src;

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border overflow-hidden shadow-sm transition-all duration-200',
        !isFallback ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer border-slate-100' : 'border-slate-100'
      )}
    >
      {/* Card Header */}
      <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #F0F9FF 100%)' }}>
        <div>
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{title}</p>
          {subtitle && <p className="text-[10px] text-slate-400">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 uppercase tracking-wider border border-sky-200">
              {badge}
            </span>
          )}
          {!isFallback && (
            <button
              type="button"
              onClick={() => onExpand(url)}
              className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 hover:bg-sky-100 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {/* Image */}
      <button
        type="button"
        onClick={() => !isFallback && onExpand(url)}
        className={cn('w-full block bg-slate-900 focus:outline-none', isFallback && 'cursor-default')}
      >
        <img
          src={url}
          alt={title}
          className="w-full h-[220px] object-contain"
          onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER_SVG; }}
        />
      </button>
      {isFallback && (
        <p className="text-[10px] text-amber-600 text-center py-2 border-t border-slate-50 bg-amber-50/50">Image unavailable</p>
      )}
    </div>
  );
}

function ImageViewerModal({ src, alt = 'View', onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.9)' }}
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </button>
      <div className="max-w-[95vw] max-h-[95vh] w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <TransformWrapper initialScale={1} minScale={0.5} maxScale={6} doubleClick={{ mode: 'reset' }} wheel={{ step: 0.1 }}>
          <TransformComponent wrapperClass="!w-full !h-full flex items-center justify-center">
            <img src={src} alt={alt} className="max-w-full max-h-[90vh] object-contain rounded-xl" draggable={false} />
          </TransformComponent>
        </TransformWrapper>
      </div>
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/40 font-medium">Scroll to zoom · Double-click to reset</p>
    </motion.div>
  );
}

function ConfidenceRing({ value }) {
  const pct = Math.min(100, Math.max(0, value));
  const r = 44;
  const circ = 2 * Math.PI * r;
  const stroke = circ * (1 - pct / 100);
  const color = pct >= 70 ? '#EF4444' : pct >= 40 ? '#F59E0B' : '#10B981';

  return (
    <div className="relative flex items-center justify-center">
      <svg width="120" height="120" className="confidence-ring -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#E2E8F0" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={stroke}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-black tabular-nums" style={{ color }}>{pct}%</p>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">confidence</p>
      </div>
    </div>
  );
}

function ProbabilityBar({ label, probability }) {
  const pct = Math.round(Number(probability) * 100);
  const isHigh = pct >= 60;
  const isMedium = pct >= 30 && pct < 60;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className={cn(
          'text-sm font-bold tabular-nums',
          isHigh ? 'text-rose-600' : isMedium ? 'text-amber-600' : 'text-teal-600'
        )}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className="h-full rounded-full"
          style={{
            background: isHigh
              ? 'linear-gradient(90deg, #F87171, #EF4444)'
              : isMedium
                ? 'linear-gradient(90deg, #FCD34D, #F59E0B)'
                : 'linear-gradient(90deg, #34D399, #14B8A6)',
          }}
        />
      </div>
    </div>
  );
}

export default function CTAnalysisView() {
  const { scan_id: scanId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [viewerImage, setViewerImage] = useState(null);
  const [savingReport, setSavingReport] = useState(false);

  const analysis = useMemo(
    () => location.state?.analysis ?? location.state?.analysisData ?? null,
    [location.state]
  );

  const paths = useMemo(() => {
    if (!analysis) return {};
    const a = analysis.analysis || analysis;
    const imgs = analysis.images || {};
    const strip = (p) => (p && typeof p === 'string' ? p.replace(/^\//, '') : '');
    const outputBase = scanId ? `outputs/${scanId}/` : '';
    const fallback = (p, filename) => (p && p.trim()) ? p : (outputBase ? outputBase + filename : '');
    return {
      patient_ct: fallback(strip(imgs.patient_ct) || (analysis.patient_ct ?? a.patient_ct_path ?? a.patient_ct ?? ''), 'patient_ct.png'),
      normal_reference: fallback(strip(imgs.normal_reference) || (analysis.normal_reference ?? a.normal_reference_path ?? a.normal_reference ?? ''), 'normal_reference.png'),
      deviation_map: fallback(strip(imgs.deviation_map) || (analysis.deviation_map ?? a.deviation_map_path ?? a.deviation_map ?? ''), 'deviation_map.png'),
      suspicious_regions: fallback(strip(imgs.suspicious_regions) || (analysis.suspicious_regions ?? analysis.regions_overlay ?? a.suspicious_regions_path ?? a.region_visualization_path ?? a.region_visualization ?? ''), 'suspicious_regions.png'),
      regions_overlay: fallback(strip(imgs.suspicious_regions) || (analysis.regions_overlay ?? analysis.suspicious_regions ?? a.region_visualization_path ?? a.region_visualization ?? ''), 'suspicious_regions.png'),
      gradcam_overlay: fallback(strip(imgs.gradcam) || (analysis.gradcam_overlay ?? analysis.overlay_path ?? a.overlay_path ?? a.gradcam ?? ''), 'gradcam_overlay.png'),
      heatmap: fallback(strip(imgs.heatmap) || (analysis.heatmap ?? a.heatmap_path ?? a.heatmap ?? ''), 'heatmap.png'),
    };
  }, [analysis, scanId]);

  const imageUrls = useMemo(() => ({
    patient_ct: buildImageUrl(paths.patient_ct, scanId),
    normal_reference: buildImageUrl(paths.normal_reference, scanId),
    deviation_map: buildImageUrl(paths.deviation_map, scanId),
    suspicious_regions: buildImageUrl(paths.suspicious_regions || paths.regions_overlay, scanId),
    gradcam_overlay: buildImageUrl(paths.gradcam_overlay, scanId),
    heatmap: buildImageUrl(paths.heatmap, scanId),
  }), [paths, scanId]);

  const prediction = analysis?.final_diagnosis ?? analysis?.prediction ?? '';
  const confidenceRaw = analysis?.final_confidence ?? analysis?.confidence;
  const confidence = confidenceRaw != null
    ? (typeof confidenceRaw === 'number' && confidenceRaw <= 1 ? Math.round(confidenceRaw * 100) : Math.round(confidenceRaw))
    : 0;
  const riskLevel = analysis?.risk_level ?? (confidence >= 70 ? 'High' : confidence >= 40 ? 'Medium' : 'Low');
  const regionsList = analysis?.analysis?.regions ?? analysis?.regions ?? [];
  const regionsCount = Array.isArray(regionsList) ? regionsList.length : 0;
  const diseases = analysis?.conditions ?? [];

  const featureScores = useMemo(() => {
    const raw = analysis?.analysis?.features ?? analysis?.features ?? analysis?.analysis?.feature_scores ?? {};
    const out = {};
    Object.entries(raw).forEach(([k, v]) => {
      const label = FEATURE_LABELS[k] || k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      out[label] = typeof v === 'number' ? Math.round(v * 100) : v;
    });
    return out;
  }, [analysis]);

  const handleSaveReport = async () => {
    if (!analysis) { toast.error('No analysis data to save'); return; }
    setSavingReport(true);
    try {
      await reportService.saveReport({
        scan_id: scanId,
        patient_id: location.state?.patientId ?? null,
        prediction: prediction || analysis.prediction,
        confidence: typeof confidenceRaw === 'number' && confidenceRaw <= 1 ? confidenceRaw : confidence / 100,
        images: {
          patient_ct: paths.patient_ct,
          heatmap: paths.heatmap,
          deviation_map: paths.deviation_map,
          gradcam_overlay: paths.gradcam_overlay,
          regions_overlay: paths.suspicious_regions || paths.regions_overlay,
        },
      });
      toast.success('Report saved successfully.');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to save report';
      toast.error(typeof msg === 'string' ? msg : 'Failed to save report');
    } finally {
      setSavingReport(false);
    }
  };

  if (!analysis && !scanId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(135deg, #F0F9FF, #E0F2FE, #ECFDF5)' }}>
        <div className="text-center bg-white rounded-3xl p-10 shadow-lg border border-slate-100 max-w-sm w-full">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #14B8A6)' }}>
            <Scan className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">No Analysis Data</h2>
          <p className="text-slate-500 text-sm mb-6">Run a CT scan first, then open full analysis from the results.</p>
          <button type="button" onClick={() => navigate(-1)} className="ps-btn-primary w-full justify-center">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const riskConfig = {
    High: { label: 'High Risk', className: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
    Medium: { label: 'Moderate Risk', className: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    Low: { label: 'Low Risk', className: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' },
  };
  const risk = riskConfig[riskLevel] || riskConfig.Low;

  return (
    <div className="min-h-screen pb-12" style={{ background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 30%, #ECFDF5 70%, #F0FDF4 100%)' }}>
      <div className="max-w-[1400px] mx-auto px-6 py-6">

        {/* ─── TOP HEADER BAR ─── */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}
          className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate(-1)}
              className="ps-btn-secondary text-sm gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div>
              <h2 className="text-lg font-black text-slate-900">CT Scan Analysis</h2>
              <p className="text-xs text-slate-400 font-medium">AI-powered pulmonary analysis report</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveReport}
            disabled={savingReport}
            className="ps-btn-primary text-sm"
          >
            <Save className="w-4 h-4" /> {savingReport ? 'Saving…' : 'Save Report'}
          </button>
        </motion.div>

        {/* ─── SECTION 1: PREDICTION SUMMARY CARD ─── */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}
          className="mb-6 rounded-3xl overflow-hidden text-white"
          style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F2027 100%)' }}>

          {/* accent top bar */}
          <div className="h-1" style={{ background: 'linear-gradient(90deg, #0EA5E9, #14B8A6, #10B981)' }} />

          <div className="p-6">
            <div className="flex flex-wrap gap-6 items-start">
              {/* Diagnosis */}
              <div className="flex-1 min-w-[200px]">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-sky-400" /> AI Predicted Diagnosis
                </p>
                <h1 className="text-2xl font-black text-white leading-tight">{prediction || '—'}</h1>
                <p className="text-slate-400 text-xs mt-2">For decision support only. Clinical verification recommended.</p>
              </div>

              {/* Confidence Ring */}
              <div className="flex flex-col items-center">
                <ConfidenceRing value={confidence} />
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-4">
                {/* Risk Level */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 min-w-[130px]">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Risk Level</p>
                  <span className={cn('inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full border', risk.className)}>
                    <span className={cn('w-2 h-2 rounded-full', risk.dot)}></span>
                    {risk.label}
                  </span>
                </div>

                {/* Detected Regions */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 min-w-[130px]">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Detected Regions</p>
                  <p className="text-3xl font-black text-white tabular-nums">{regionsCount}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Suspicious areas</p>
                </div>

                {/* Scan ID */}
                {scanId && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10 min-w-[130px]">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Scan ID</p>
                    <p className="text-sm font-mono font-bold text-sky-400 break-all">{scanId.slice(0, 12)}…</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Unique identifier</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── SECTION 2: DISEASE PROBABILITIES ─── */}
        {diseases.length > 0 && (
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}
            className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-6">
            <SectionHeader icon={BarChart3} title="Disease Probability Distribution" subtitle="Likelihood scores for each candidate condition" color="sky" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {diseases.map((d, i) => (
                <ProbabilityBar key={d.label || i} label={d.label} probability={d.probability} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── SECTION 3: IMAGE ANALYSIS GRID ─── */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={3}
          className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-6">
          <SectionHeader icon={Scan} title="CT Image Comparison" subtitle="Patient scan vs normal reference · deviation and suspicious regions" color="teal" />
          <div className="analysis-image-grid">
            <ImageCard title="Patient CT" subtitle="Original scan" badge="Raw" src={imageUrls.patient_ct} onExpand={setViewerImage} />
            <ImageCard title="Normal Reference" subtitle="Population baseline" badge="Reference" src={imageUrls.normal_reference} onExpand={setViewerImage} />
            <ImageCard title="Deviation Map" subtitle="Structural anomalies" badge="Analysis" src={imageUrls.deviation_map} onExpand={setViewerImage} />
            <ImageCard title="Suspicious Regions" subtitle="Region visualization" badge="AI" src={imageUrls.suspicious_regions} onExpand={setViewerImage} />
          </div>
        </motion.div>

        {/* ─── SECTION 4: MODEL ATTENTION ─── */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={4}
          className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-6">
          <SectionHeader icon={Eye} title="Model Attention Visualizations" subtitle="Areas that influenced the model's prediction" color="purple" />
          <div className="analysis-heatmap-grid">
            <ImageCard title="Heatmap" subtitle="Activation intensity map" badge="Thermal" src={imageUrls.heatmap} onExpand={setViewerImage} />
            <ImageCard title="Grad-CAM Overlay" subtitle="Gradient-weighted class activation" badge="Grad-CAM" src={imageUrls.gradcam_overlay} onExpand={setViewerImage} />
          </div>
        </motion.div>

        {/* ─── SECTION 4b: FEATURE ANALYSIS ─── */}
        {Object.keys(featureScores).length > 0 && (
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={5}
            className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-6">
            <SectionHeader icon={Activity} title="CT Feature Analysis" subtitle="Feature scores extracted by the AI model" color="amber" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
              {Object.entries(featureScores).map(([label, value]) => {
                const isHigh = value >= 60;
                const isMid = value >= 30 && value < 60;
                return (
                  <div key={label}
                    className={cn(
                      'rounded-2xl p-4 text-center border transition-all',
                      isHigh ? 'bg-rose-50 border-rose-100' : isMid ? 'bg-amber-50 border-amber-100' : 'bg-teal-50 border-teal-100'
                    )}>
                    <p className={cn(
                      'text-2xl font-black tabular-nums',
                      isHigh ? 'text-rose-600' : isMid ? 'text-amber-600' : 'text-teal-600'
                    )}>{value}%</p>
                    <p className="text-[10px] font-semibold text-slate-500 mt-1 leading-tight">{label}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ─── SECTION 5: SUSPICIOUS REGIONS TABLE ─── */}
        {regionsList.length > 0 && (
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={6}
            className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-6">
            <SectionHeader icon={Target} title="Suspicious Region Details" subtitle={`${regionsCount} anomalous area${regionsCount !== 1 ? 's' : ''} detected with location and confidence`} color="rose" />
            <div className="rounded-2xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #F8FAFC, #F0F9FF)' }}
                      className="border-b border-slate-100">
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Region</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Coordinates</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Size</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Area</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confidence</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regionsList.map((r, i) => {
                      const area = (r.w ?? 0) * (r.h ?? 0);
                      const conf = typeof r.confidence === 'number'
                        ? (r.confidence <= 1 ? Math.round(r.confidence * 100) : Math.round(r.confidence))
                        : (r.confidence ?? 0);
                      const isHighConf = conf >= 60;
                      return (
                        <tr key={i} className="border-b border-slate-50 hover:bg-sky-50/30 transition-colors last:border-0">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className={cn(
                                'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                                isHighConf ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-700'
                              )}>
                                R{i + 1}
                              </div>
                              <span className="text-sm font-medium text-slate-700">Region {i + 1}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-mono text-sm text-slate-600">({r.x ?? 0}, {r.y ?? 0})</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-mono text-sm text-slate-600">{r.w ?? 0} × {r.h ?? 0} px</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-mono text-sm text-slate-600">{area.toLocaleString()} px²</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden max-w-[60px]">
                                <div className={cn('h-full rounded-full', isHighConf ? 'bg-rose-500' : 'bg-teal-500')}
                                  style={{ width: `${conf}%` }} />
                              </div>
                              <span className={cn('text-sm font-bold tabular-nums', isHighConf ? 'text-rose-600' : 'text-teal-600')}>{conf}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={cn(
                              'text-[10px] font-bold px-2.5 py-1 rounded-full border',
                              isHighConf
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-teal-50 text-teal-700 border-teal-200'
                            )}>
                              {isHighConf ? 'Suspicious' : 'Monitored'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary row */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Regions', value: regionsCount, icon: MapPin, color: 'sky' },
                { label: 'High Confidence', value: regionsList.filter(r => (typeof r.confidence === 'number' ? (r.confidence <= 1 ? r.confidence * 100 : r.confidence) : r.confidence ?? 0) >= 60).length, icon: AlertTriangle, color: 'rose' },
                { label: 'Monitored', value: regionsList.filter(r => (typeof r.confidence === 'number' ? (r.confidence <= 1 ? r.confidence * 100 : r.confidence) : r.confidence ?? 0) < 60).length, icon: CheckCircle, color: 'teal' },
                { label: 'Largest Area', value: `${Math.max(...regionsList.map(r => (r.w ?? 0) * (r.h ?? 0))).toLocaleString()} px²`, icon: Layers, color: 'amber' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label}
                  className={cn('rounded-xl p-3 border text-center',
                    color === 'sky' ? 'bg-sky-50 border-sky-100' :
                      color === 'rose' ? 'bg-rose-50 border-rose-100' :
                        color === 'teal' ? 'bg-teal-50 border-teal-100' : 'bg-amber-50 border-amber-100'
                  )}>
                  <Icon className={cn('w-4 h-4 mx-auto mb-1',
                    color === 'sky' ? 'text-sky-600' :
                      color === 'rose' ? 'text-rose-600' :
                        color === 'teal' ? 'text-teal-600' : 'text-amber-600'
                  )} />
                  <p className={cn('text-lg font-black', color === 'sky' ? 'text-sky-700' : color === 'rose' ? 'text-rose-700' : color === 'teal' ? 'text-teal-700' : 'text-amber-700')}>{value}</p>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Disclaimer */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={7}
          className="rounded-2xl p-4 flex items-center gap-3 border"
          style={{ background: 'rgba(14, 165, 233, 0.04)', borderColor: 'rgba(14, 165, 233, 0.15)' }}>
          <AlertTriangle className="w-4 h-4 text-sky-500 shrink-0" />
          <p className="text-xs text-slate-500">
            <strong className="text-slate-700">Clinical Disclaimer:</strong> This AI analysis is for decision support only and must be reviewed by a qualified radiologist or physician before clinical use.
          </p>
        </motion.div>
      </div>

      {/* Image Viewer Modal */}
      {viewerImage && (
        <ImageViewerModal src={viewerImage} alt="Zoom" onClose={() => setViewerImage(null)} />
      )}
    </div>
  );
}
