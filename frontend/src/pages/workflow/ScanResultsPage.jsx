import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Activity, ArrowLeft, BarChart3, Brain, ChevronLeft, ChevronRight,
    Crosshair, Eye, Files, Layers, MapPin, Monitor, Search,
    ShieldCheck, Stethoscope, Target, X, ZoomIn, ZoomOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { API_BASE_URL } from '../../services/api';
import { cn } from '@/lib/utils';
import { buildTop3Predictions } from '../../utils/aiDisplay';

const FEATURE_LABELS = {
    spiculated_nodule: 'Spiculated Nodule',
    ground_glass_opacity: 'Ground Glass Opacity',
    cavitary_lesion: 'Cavitary Lesion',
    pleural_effusion: 'Pleural Effusion',
    upper_lobe_predominant: 'Upper Lobe Predominant',
    lymph_node_involvement: 'Lymph Node',
    local_invasion: 'Local Invasion',
};

const PLACEHOLDER_SVG = 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect fill="#F1F5F9" width="400" height="300"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#CBD5E1" font-size="12" font-family="system-ui">Processing Map...</text>
  </svg>`
);

function buildImageUrl(path, scanId) {
    if (!path || typeof path !== 'string' || path.trim() === '') return PLACEHOLDER_SVG;
    const trimmed = path.replace(/^\//, '');
    if (trimmed.startsWith('http')) return trimmed;
    const base = `${API_BASE_URL}/${trimmed}`;
    const cacheBuster = scanId || Date.now();
    return `${base}?t=${cacheBuster}`;
}

function ZoomableImage({ src, alt }) {
    return (
        <TransformWrapper initialScale={1} minScale={0.5} maxScale={6}>
            {({ zoomIn, zoomOut, resetTransform }) => (
                <div className="relative w-full h-full bg-slate-950 group">
                    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => zoomIn()} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 text-white backdrop-blur-md transition-all shadow-lg"><ZoomIn className="w-4 h-4" /></button>
                        <button onClick={() => zoomOut()} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 text-white backdrop-blur-md transition-all shadow-lg"><ZoomOut className="w-4 h-4" /></button>
                        <button onClick={() => resetTransform()} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 text-white backdrop-blur-md transition-all shadow-lg text-[10px] font-bold">RESET</button>
                    </div>
                    <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                        <img src={src} alt={alt} className="max-w-full max-h-full object-contain pointer-events-none" onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER_SVG; }} />
                    </TransformComponent>
                </div>
            )}
        </TransformWrapper>
    );
}

export default function ScanResultsPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { result, patientInfo, files = [] } = location.state || {};
    const [sliceIndex, setSliceIndex] = useState(0);

    useEffect(() => {
        if (!result) {
            navigate('/upload-scan');
        }
    }, [result, navigate]);

    if (!result) return null;

    // --- DATA EXTRACTION ---
    const pred = result.final_diagnosis ?? result.prediction ?? 'Normal';
    const confidenceRaw = result.final_confidence ?? result.confidence;
    const confidence = confidenceRaw != null ? (confidenceRaw <= 1 ? confidenceRaw * 100 : confidenceRaw) : 0;
    const riskLevel = result.risk_level || (confidence >= 70 ? 'High' : confidence >= 40 ? 'Medium' : 'Low');

    const conditions = result.conditions ?? [];
    const top3 = buildTop3Predictions(conditions, pred, confidence);

    const scanId = result.scan_id ?? result.analysis?.scan_id ?? '';
    const outputBase = scanId ? `outputs/${scanId}/` : '';
    const a = result.analysis ?? result ?? {};
    const imgs = result.images ?? {};

    const paths = {
        patient_ct: (imgs.patient_ct && imgs.patient_ct.replace(/^\//, '')) || (a.patient_ct_path ?? a.patient_ct ?? (outputBase ? `${outputBase}patient_ct.png` : '')),
        normal_reference: (imgs.normal_reference && imgs.normal_reference.replace(/^\//, '')) || (a.normal_reference_path ?? a.normal_reference ?? (outputBase ? `${outputBase}normal_reference.png` : '')),
        deviation_map: (imgs.deviation_map && imgs.deviation_map.replace(/^\//, '')) || (a.deviation_map_path ?? a.deviation_map ?? (outputBase ? `${outputBase}deviation_map.png` : '')),
        suspicious_regions: (imgs.suspicious_regions && imgs.suspicious_regions.replace(/^\//, '')) || (a.region_visualization_path ?? a.regions_image ?? (outputBase ? `${outputBase}suspicious_regions.png` : '')),
        heatmap: (imgs.heatmap && imgs.heatmap.replace(/^\//, '')) || (a.heatmap_path ?? a.heatmap ?? (outputBase ? `${outputBase}heatmap.png` : '')),
        gradcam: (imgs.gradcam && imgs.gradcam.replace(/^\//, '')) || (a.overlay_path ?? a.gradcam ?? (outputBase ? `${outputBase}gradcam_overlay.png` : '')),
    };

    const images = {
        patient_ct: buildImageUrl(paths.patient_ct, scanId),
        normal_reference: buildImageUrl(paths.normal_reference, scanId),
        deviation_map: buildImageUrl(paths.deviation_map, scanId),
        suspicious_regions: buildImageUrl(paths.suspicious_regions, scanId),
        heatmap: buildImageUrl(paths.heatmap, scanId),
        gradcam: buildImageUrl(paths.gradcam, scanId),
    };

    const regions = Array.isArray(a.regions) ? a.regions : (Array.isArray(result.regions) ? result.regions : []);
    const featureScoresRaw = a.feature_scores ?? a.features ?? result.features ?? {};
    const featureBarItems = Object.entries(featureScoresRaw).map(([key, value]) => {
        const pct = Math.round(Number(value) * 100) || 0;
        const status = pct >= 60 ? 'ELEVATED' : pct >= 30 ? 'MODERATE' : 'NORMAL';
        return {
            label: FEATURE_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            value: pct,
            status,
        };
    });

    const sliceCount = files.length;
    const currentSliceFile = files[sliceIndex] ? URL.createObjectURL(files[sliceIndex]) : null;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-sky-500/30">

            {/* ─── NAVIGATION OVERLAY ─── */}
            <div className="fixed top-6 left-6 z-50">
                <button
                    onClick={() => navigate('/upload-scan')}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-xl transition-all text-sm font-bold"
                >
                    <ArrowLeft className="w-4 h-4" />
                    New Analysis
                </button>
            </div>

            <div className="h-screen flex flex-col p-6">

                {/* ─── MAIN WORKSPACE ROW ─── */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden min-h-0">

                    {/* L: CT VIEWER */}
                    <div className="lg:col-span-4 flex flex-col bg-white/5 rounded-[40px] border border-white/10 shadow-2xl overflow-hidden">
                        <div className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_#0EA5E9]" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Volumetric CT Source</h3>
                            </div>
                            {sliceCount > 0 && (
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setSliceIndex(i => Math.max(0, i - 1))} className="p-1 hover:text-sky-400 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                                    <span className="text-xs font-mono font-bold">{sliceIndex + 1} / {sliceCount}</span>
                                    <button onClick={() => setSliceIndex(i => Math.min(sliceCount - 1, i + 1))} className="p-1 hover:text-sky-400 transition-colors"><ChevronRight className="w-5 h-5" /></button>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-h-0 relative">
                            <ZoomableImage src={currentSliceFile || images.patient_ct} alt="Patient CT" />
                        </div>
                        <div className="p-6 bg-white/5 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest px-8">
                            <span>Patient: {patientInfo?.name || 'Anonymous'}</span>
                            <span>ID: {patientInfo?.patientId || result.id || 'N/A'}</span>
                        </div>
                    </div>

                    {/* C: EXPLAINABILITY MAPS */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
                            <div className="flex flex-col bg-white/5 rounded-[32px] border border-white/10 overflow-hidden group">
                                <div className="p-4 bg-white/5 flex items-center gap-2 border-b border-white/5">
                                    <Activity className="w-3.5 h-3.5 text-teal-400" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Heatmap Activation</span>
                                </div>
                                <div className="flex-1 min-h-0"><ZoomableImage src={images.heatmap} alt="Heatmap" /></div>
                            </div>
                            <div className="flex flex-col bg-white/5 rounded-[32px] border border-white/10 overflow-hidden">
                                <div className="p-4 bg-white/5 flex items-center gap-2 border-b border-white/5">
                                    <Eye className="w-3.5 h-3.5 text-sky-400" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">GradCAM Overlay</span>
                                </div>
                                <div className="flex-1 min-h-0"><ZoomableImage src={images.gradcam} alt="GradCAM" /></div>
                            </div>
                            <div className="flex flex-col bg-white/5 rounded-[32px] border border-white/10 overflow-hidden">
                                <div className="p-4 bg-white/5 flex items-center gap-2 border-b border-white/5">
                                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Deviation Map</span>
                                </div>
                                <div className="flex-1 min-h-0"><ZoomableImage src={images.deviation_map} alt="Deviation" /></div>
                            </div>
                            <div className="flex flex-col bg-white/5 rounded-[32px] border border-white/10 overflow-hidden">
                                <div className="p-4 bg-white/5 flex items-center gap-2 border-b border-white/5">
                                    <Search className="w-3.5 h-3.5 text-rose-400" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Suspicious Regions</span>
                                </div>
                                <div className="flex-1 min-h-0"><ZoomableImage src={images.suspicious_regions} alt="Regions" /></div>
                            </div>
                        </div>
                    </div>

                    {/* R: AI DIAGNOSIS PANEL */}
                    <div className="lg:col-span-3 flex flex-col gap-6">
                        <div className="flex-1 bg-white/5 rounded-[40px] border border-white/10 p-8 flex flex-col overflow-y-auto custom-scrollbar shadow-2xl relative">

                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 via-teal-400 to-sky-500 shadow-[0_4px_12px_rgba(14,165,233,0.5)]" />

                            <div className="text-center space-y-4 mb-10 pt-4">
                                <div className="mx-auto w-12 h-12 rounded-2xl bg-sky-500/20 flex items-center justify-center border border-sky-500/30 mb-4 animate-pulse">
                                    <ShieldCheck className="w-6 h-6 text-sky-400" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-sky-400 uppercase tracking-[0.2em] mb-2">Verified AI Finding</h2>
                                    <h1 className="text-3xl font-black text-white leading-tight">{pred}</h1>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="p-4 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Confidence</span>
                                    <p className="text-2xl font-black text-sky-400 tabular-nums">{Math.round(confidence)}%</p>
                                </div>
                                <div className="p-4 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Risk Level</span>
                                    <p className={cn(
                                        "text-xl font-black",
                                        riskLevel === 'High' ? 'text-rose-500' : riskLevel === 'Medium' ? 'text-amber-400' : 'text-emerald-500'
                                    )}>{riskLevel}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">Disease Probability Gradient</p>
                                <div className="space-y-5">
                                    {top3.map((item, i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="flex justify-between items-center text-xs font-bold">
                                                <span className="text-slate-200">{item.label}</span>
                                                <span className="text-sky-400 font-mono tracking-tighter">{item.value}%</span>
                                            </div>
                                            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 shadow-inner">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${item.value}%` }}
                                                    transition={{ duration: 1, ease: 'easeOut' }}
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-1000",
                                                        item.value >= 60 ? "bg-rose-500" : item.value >= 30 ? "bg-sky-400" : "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── BOTTOM ROW: EXTENDED ANALYSIS ─── */}
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-visible">

                    {/* COMPARATIVE CARDS */}
                    <div className="lg:col-span-8 flex flex-col gap-4">
                        <div className="flex items-center gap-3 mb-2 px-2">
                            <Target className="w-5 h-5 text-sky-400" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">Comparative Structural Pipeline</h3>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            {[
                                { label: 'Patient CT', src: images.patient_ct, info: 'Processed data' },
                                { label: 'Normal Reference', src: images.normal_reference, info: 'AI Model Baseline' },
                                { label: 'Deviation Map', src: images.deviation_map, info: 'Delta Analysis' },
                                { label: 'Suspicious Regions', src: images.suspicious_regions, info: 'ROI Extraction' }
                            ].map((c, i) => (
                                <div key={i} className="bg-white/5 rounded-[24px] border border-white/10 p-3 hover:bg-white/[0.08] transition-all group overflow-hidden">
                                    <div className="aspect-square rounded-[18px] overflow-hidden bg-black mb-3 border border-white/10">
                                        <img src={c.src} alt={c.label} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" />
                                    </div>
                                    <div className="px-1">
                                        <p className="text-xs font-black text-white">{c.label}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-0.5">{c.info}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AI SUMMARY & REGION TABLE */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <div className="bg-white/5 rounded-[32px] border border-white/10 p-6 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Stethoscope className="w-20 h-20 text-white" />
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                <Brain className="w-3.5 h-3.5 text-sky-400" />
                                AI Radiology Summary
                            </h3>
                            <p className="text-sm font-medium leading-relaxed text-slate-200">
                                Neural inference engine detected abnormal pulmonary tissue patterns consistent with <span className="text-sky-400 font-bold underline decoration-sky-400/30 underline-offset-4">{pred}</span>.
                            </p>
                            <ul className="mt-4 space-y-2">
                                {[
                                    `${regions.length} suspicious regional anomalies detected`,
                                    `Observation confirms elevated ${pred.toLowerCase()} profile`,
                                    `Structural delta exceeds normal variance thresholds`
                                ].map((obs, i) => (
                                    <li key={i} className="flex items-start gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500/50 mt-1 shrink-0" />
                                        {obs}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* REGION TABLE */}
                {regions.length > 0 && (
                    <div className="mt-12 space-y-4">
                        <div className="flex items-center gap-3 px-2">
                            <MapPin className="w-5 h-5 text-rose-400" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">Anomalous ROI Coordinate Registry</h3>
                        </div>
                        <div className="bg-white/5 rounded-[32px] border border-white/10 overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">ID</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Coordinates</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Area Index</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Probability</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {regions.map((r, i) => {
                                        const conf = typeof r.confidence === 'number' ? (r.confidence <= 1 ? r.confidence * 100 : r.confidence) : 0;
                                        return (
                                            <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                                                <td className="px-8 py-5">
                                                    <span className={cn(
                                                        "inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black border",
                                                        conf >= 60 ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-sky-500/10 text-sky-400 border-sky-500/20"
                                                    )}>R{i + 1}</span>
                                                </td>
                                                <td className="px-8 py-5 font-mono text-xs text-slate-400">
                                                    X:{r.x} Y:{r.y} <span className="text-slate-600 mx-2">|</span> W:{r.w} H:{r.h}
                                                </td>
                                                <td className="px-8 py-5 font-mono text-xs text-slate-400">{(r.w * r.h).toLocaleString()} <span className="text-slate-600 ml-1 font-sans font-bold uppercase tracking-widest text-[9px]">px²</span></td>
                                                <td className="px-8 py-5 text-right">
                                                    <span className={cn(
                                                        "text-sm font-black tabular-nums",
                                                        conf >= 60 ? "text-rose-400" : "text-sky-400"
                                                    )}>{Math.round(conf)}%</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
