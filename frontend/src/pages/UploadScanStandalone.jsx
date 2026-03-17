import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { aiPredictionService, API_BASE_URL } from '../services/api';
import {
  ScanLine, ImageIcon, Loader2, CheckCircle2, AlertCircle, X, ChevronLeft, ChevronRight, Activity,
  ZoomIn, ZoomOut, User, MapPin, Layers, Search, Zap, BarChart3, Upload, ShieldCheck,
  Stethoscope, Crosshair, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { buildTop3Predictions } from '../utils/aiDisplay';

const SUPPORTED_FORMATS = 'PNG, JPG, BMP, DICOM';

const PLACEHOLDER_SVG = 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect fill="#F1F5F9" width="400" height="300"/>
    <rect fill="#CBD5E1" x="176" y="126" width="48" height="48" rx="8"/>
    <text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" fill="#64748B" font-size="12" font-family="system-ui">Image Processing</text>
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

const FEATURE_LABELS = {
  spiculated_nodule: 'Spiculated Nodule',
  ground_glass_opacity: 'Ground Glass Opacity',
  cavitary_lesion: 'Cavitary Lesion',
  pleural_effusion: 'Pleural Effusion',
  upper_lobe_predominant: 'Upper Lobe Predominant',
  lymph_node_involvement: 'Lymph Node',
  local_invasion: 'Local Invasion',
};

function ZoomableImage({ src, alt }) {
  return (
    <TransformWrapper initialScale={1} minScale={0.5} maxScale={6}>
      {({ zoomIn, zoomOut, resetTransform }) => (
        <div className="relative w-full h-full bg-slate-900 group">
          <div className="absolute top-2 right-2 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={() => zoomIn()} className="p-1.5 bg-black/50 hover:bg-black/80 rounded border border-white/10 text-white backdrop-blur-sm transition-colors"><ZoomIn className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => zoomOut()} className="p-1.5 bg-black/50 hover:bg-black/80 rounded border border-white/10 text-white backdrop-blur-sm transition-colors"><ZoomOut className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => resetTransform()} className="p-1.5 bg-black/50 hover:bg-black/80 rounded border border-white/10 text-white backdrop-blur-sm transition-colors"><ScanLine className="w-3.5 h-3.5" /></button>
          </div>
          <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
            <img src={src} alt={alt} className="max-w-full max-h-full object-contain pointer-events-none" onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER_SVG; }} />
          </TransformComponent>
        </div>
      )}
    </TransformWrapper>
  );
}

export default function UploadScanStandalone() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const typeParam = searchParams.get('type');
  const patientFormFromState = location.state?.patientForm;

  const [scanType, setScanType] = useState(typeParam === 'xray' ? 'xray' : 'ct');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [sliceIndex, setSliceIndex] = useState(0);
  const [patientInfo, setPatientInfo] = useState({
    name: patientFormFromState?.patientName ?? '',
    age: patientFormFromState?.age ?? '',
    patientId: patientFormFromState?.patientId ?? '',
  });

  const isMultiCt = scanType === 'ct';
  const fileList = Array.isArray(files) ? files : (files ? [files] : []);
  const sliceCount = fileList.length;
  const currentSlice = sliceCount ? sliceIndex % sliceCount : 0;
  const currentFile = fileList[currentSlice] || null;

  useEffect(() => {
    if (typeParam === 'xray') setScanType('xray');
    else if (typeParam === 'ct') setScanType('ct');
  }, [typeParam]);

  const onFileChange = (e) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    if (selected.length) {
      setFiles(selected);
      setResult(null);
      setError(null);
      setSliceIndex(0);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    const dropped = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (dropped.length) {
      setFiles(dropped);
      setResult(null);
      setError(null);
      setSliceIndex(0);
    }
  };

  const runAnalysis = async () => {
    if (!fileList.length) {
      toast.error('Select an image to analyze.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = scanType === 'ct'
        ? await aiPredictionService.predictCTScan(fileList)
        : await aiPredictionService.predictXRay(fileList[0]);
      const resultData = scanType === 'ct' ? (data?.result ?? data) : data;
      setResult(resultData);
      const diagnosis = resultData?.final_diagnosis ?? resultData?.prediction ?? '';
      if (diagnosis === 'Model not available' || (typeof diagnosis === 'string' && diagnosis.toLowerCase().includes('model not available'))) {
        setError('AI model is not loaded on the server. Please contact support or try again later.');
        toast.error('AI model not available');
      } else {
        toast.success('AI Analysis Completed');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Analysis failed';
      setError(typeof msg === 'string' ? msg : (Array.isArray(msg) ? msg.map((m) => m.msg || m).join(', ') : 'Analysis failed'));
      toast.error('AI Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  // --- DERIVED DATA ---
  const predText = result?.final_diagnosis ?? result?.prediction ?? '';
  const isErr = predText?.startsWith('Error') || predText === 'Analysis failed for all slices' || predText === 'Model not available' || (typeof predText === 'string' && predText.toLowerCase().includes('model not available'));
  const pred = result?.final_diagnosis ?? result?.prediction ?? null;
  const confidenceRaw = result?.final_confidence ?? result?.confidence;
  const confidence = confidenceRaw != null ? (confidenceRaw <= 1 ? confidenceRaw * 100 : confidenceRaw) : 0;
  const riskLevel = result?.risk_level || (confidence >= 70 ? 'High' : confidence >= 40 ? 'Medium' : 'Low');

  const conditions = useMemo(() => result?.conditions ?? [], [result?.conditions]);
  const top3 = useMemo(() => buildTop3Predictions(conditions, pred, confidence), [conditions, pred, confidence]);

  const scanId = result?.scan_id ?? result?.analysis?.scan_id ?? '';
  const outputBase = scanId ? `outputs/${scanId}/` : '';
  const a = result?.analysis ?? result ?? {};
  const imgs = result?.images ?? {};

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

  const regions = Array.isArray(a.regions) ? a.regions : (Array.isArray(result?.regions) ? result.regions : []);
  const featureScoresRaw = a.feature_scores ?? a.features ?? result?.features ?? {};
  const featureBarItems = Object.entries(featureScoresRaw).map(([key, value]) => {
    const pct = Math.round(Number(value) * 100) || 0;
    const status = pct >= 60 ? 'ELEVATED' : pct >= 30 ? 'MODERATE' : 'NORMAL';
    return {
      label: FEATURE_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: pct,
      status,
    };
  });

  const originalSrc = currentFile ? URL.createObjectURL(currentFile) : null;
  useEffect(() => {
    return () => { if (originalSrc && originalSrc.startsWith('blob:')) URL.revokeObjectURL(originalSrc); };
  }, [originalSrc]);

  return (
    <div className="min-h-screen bg-[#F4F7FA] font-sans pb-24 text-slate-800 selection:bg-sky-200">

      {/* ─── TOP HEADER ─── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[linear-gradient(135deg,#0EA5E9,#2563EB)] flex items-center justify-center shadow-md shadow-sky-500/20">
            <ScanLine className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-tight">AI Radiology Dashboard</h1>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                AI Active
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">v2.4 Core</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>{patientInfo.name || 'Anonymous'}</span>
            </div>
            {patientInfo.patientId && (
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
                <FileText className="w-3.5 h-3.5" />
                <span>ID: {patientInfo.patientId}</span>
              </div>
            )}
            {scanId && (
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4 text-sky-600">
                <Crosshair className="w-3.5 h-3.5" />
                <span className="font-mono">Scan: {scanId.substring(0, 8)}</span>
              </div>
            )}
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading || !fileList.length}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4 text-sky-400" />}
            {loading ? 'Processing...' : 'Run Analysis'}
          </button>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 mt-6 space-y-6">

        {/* ─── ROW 1: CORE WORKSPACE ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">

          {/* L.1 INPUT PANEL */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Upload className="w-4 h-4 text-sky-600" />
                  Scan Input
                </h3>
              </div>
              <div className="p-4 flex flex-col gap-4 flex-1">
                <div className="flex bg-slate-100 rounded-lg p-1">
                  {[{ id: 'ct', label: 'CT Scan' }, { id: 'xray', label: 'X-Ray' }].map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setScanType(t.id); setFiles([]); setResult(null); }}
                      className={cn(
                        "flex-1 text-xs font-bold py-2 rounded-md transition-all",
                        scanType === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Patient Name" value={patientInfo.name} onChange={e => setPatientInfo(p => ({ ...p, name: e.target.value }))} className="col-span-2 text-xs w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
                    <input type="text" placeholder="Patient ID" value={patientInfo.patientId} onChange={e => setPatientInfo(p => ({ ...p, patientId: e.target.value }))} className="text-xs w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-sky-500" />
                    <input type="text" placeholder="Age" value={patientInfo.age} onChange={e => setPatientInfo(p => ({ ...p, age: e.target.value }))} className="text-xs w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-sky-500" />
                  </div>
                </div>

                <div
                  className={cn(
                    "flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center transition-colors relative",
                    fileList.length ? "border-sky-200 bg-sky-50/30" : "border-slate-200 hover:border-sky-400 bg-slate-50 hover:bg-sky-50/50 cursor-pointer"
                  )}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => !fileList.length && document.getElementById('scan-upload').click()}
                >
                  <input type="file" id="scan-upload" className="hidden" multiple={isMultiCt} accept=".png,.jpg,.jpeg,.bmp,.dcm" onChange={onFileChange} />

                  {!fileList.length ? (
                    <>
                      <ImageIcon className="w-8 h-8 text-sky-500/60 mb-3" />
                      <p className="text-sm font-bold text-slate-700">Drag & Drop Scan</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">{SUPPORTED_FORMATS}</p>
                    </>
                  ) : (
                    <div className="absolute inset-0 p-3 overflow-y-auto w-full">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700">{fileList.length} Slice(s)</span>
                        <button onClick={(e) => { e.stopPropagation(); setFiles([]); setResult(null); }} className="text-[10px] font-bold text-rose-500 uppercase hover:text-rose-700">Clear</button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {fileList.map((f, i) => (
                          <button key={i} onClick={(e) => { e.stopPropagation(); setSliceIndex(i); }} className={cn(
                            "relative aspect-square rounded-md overflow-hidden border-2 transition-all",
                            currentSlice === i ? "border-sky-500 shadow-sm shadow-sky-500/30" : "border-transparent opacity-60 hover:opacity-100"
                          )}>
                            <img src={URL.createObjectURL(f)} alt={`Slice ${i}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* L.2 CENTER VIEWER */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-sky-600" />
                  Primary Viewport
                </h3>
                {sliceCount > 0 && (
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-0.5 shadow-sm">
                    <button onClick={() => setSliceIndex(i => Math.max(0, i - 1))} className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-[10px] font-black w-14 text-center text-slate-600 font-mono tracking-widest">{currentSlice + 1}/{sliceCount}</span>
                    <button onClick={() => setSliceIndex(i => Math.min(sliceCount - 1, i + 1))} className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                )}
              </div>

              {/* Main Image Viewer */}
              <div className="flex-1 bg-slate-900 relative">
                {originalSrc ? (
                  <ZoomableImage src={result ? images.patient_ct : originalSrc} alt="Patient Scan" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                    <Layers className="w-12 h-12 text-slate-700 opacity-50 mb-4" />
                    <p className="text-sm font-semibold">No Image Loaded</p>
                  </div>
                )}
              </div>

              {/* Attention Thumbnails */}
              {result && !isErr && (
                <div className="h-44 bg-slate-50 border-t border-slate-200 p-3 flex gap-3">
                  <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 bg-black relative group">
                    <p className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-2 text-[10px] font-bold text-white uppercase tracking-wider z-10">Attention Heatmap</p>
                    <ZoomableImage src={images.heatmap} alt="Heatmap" />
                  </div>
                  <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 bg-black relative group">
                    <p className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-2 text-[10px] font-bold text-white uppercase tracking-wider z-10">Grad-CAM Overlay</p>
                    <ZoomableImage src={images.gradcam} alt="Grad-CAM" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* L.3 DIAGNOSTIC RESULTS */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden relative">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-sky-600" />
                  AI Diagnostic Results
                </h3>
              </div>

              <div className="p-5 flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center space-y-4">
                      <div className="w-12 h-12 border-4 border-sky-100 border-t-sky-600 rounded-full animate-spin"></div>
                      <p className="text-sm font-bold text-slate-600 animate-pulse">Running Neural Inference...</p>
                    </motion.div>
                  ) : error || isErr ? (
                    <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                      <AlertCircle className="w-6 h-6 text-rose-500 mb-2" />
                      <p className="text-sm font-semibold text-rose-800">{error || pred}</p>
                    </motion.div>
                  ) : result ? (
                    <motion.div key="res" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

                      {/* Prediction Hero */}
                      <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl shadow-slate-900/10 border border-slate-700">
                        <p className="text-[10px] font-black uppercase tracking-widest text-sky-400 mb-1">Primary Finding</p>
                        <h2 className="text-2xl font-black tracking-tight leading-tight">{pred}</h2>
                        <div className="mt-4 flex items-center justify-center gap-4">
                          <div className="text-center">
                            <p className="text-3xl font-black text-white tabular-nums">{Math.round(confidence)}<span className="text-lg">%</span></p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Confidence</p>
                          </div>
                        </div>
                      </div>

                      {/* Risk & Region Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risk Level</p>
                          <p className={cn("text-lg font-black mt-1", riskLevel === 'High' ? 'text-rose-600' : riskLevel === 'Medium' ? 'text-amber-600' : 'text-emerald-600')}>{riskLevel}</p>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Regions</p>
                          <p className="text-lg font-black mt-1 text-slate-800">{regions.length}</p>
                        </div>
                      </div>

                      {/* Probability Chart */}
                      {top3.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-3">Analysis Differentials</p>
                          <div className="space-y-3">
                            {top3.map((item, i) => (
                              <div key={i} className="space-y-1.5">
                                <div className="flex justify-between text-xs font-semibold">
                                  <span className="text-slate-700">{item.label}</span>
                                  <span className={cn('tabular-nums', item.value >= 60 ? 'text-rose-600' : 'text-slate-500')}>{item.value}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }} animate={{ width: `${Math.min(100, item.value)}%` }} transition={{ duration: 1 }}
                                    className={cn("h-full", item.value >= 60 ? 'bg-rose-500' : item.value >= 30 ? 'bg-amber-400' : 'bg-emerald-400')}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 opacity-60">
                      <ShieldCheck className="w-12 h-12" />
                      <p className="text-sm font-semibold text-center px-4">Upload a scan and run analysis to view detailed secure AI reports.</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* ─── ROW 2: COMPARATIVE ANALYSIS (4 Panels) ─── */}
        {result && !isErr && (
          <div className="pt-6">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-600" />
              Comparative Structural Analysis
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Patient CT', src: images.patient_ct, info: 'Original raw scan' },
                { label: 'Normal Reference', src: images.normal_reference, info: 'Model baseline expected state' },
                { label: 'Deviation Map', src: images.deviation_map, info: 'Subtraction heat mapping' },
                { label: 'Suspicious Regions', src: images.suspicious_regions, info: 'Isolated bounding box detections' }
              ].map((c, i) => (
                <div key={i} className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm group">
                  <div className="aspect-square bg-black rounded-xl overflow-hidden mb-3 relative">
                    <ZoomableImage src={c.src} alt={c.label} />
                  </div>
                  <div className="px-2 pb-2">
                    <p className="text-sm font-black text-slate-800 tracking-tight">{c.label}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">{c.info}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── ROW 3: DETECTED FEATURES (Horizontal Bars) ─── */}
        {result && !isErr && featureBarItems.length > 0 && (
          <div className="pt-6">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-600" />
              Pathological Feature Analysis
            </h2>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                {featureBarItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className="w-32 shrink-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{item.label}</p>
                    </div>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/50">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className={cn(
                          "h-full rounded-full ring-1 ring-inset ring-black/10 transition-colors",
                          item.status === 'ELEVATED' && 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]',
                          item.status === 'MODERATE' && 'bg-amber-400',
                          item.status === 'NORMAL' && 'bg-emerald-400'
                        )}
                      />
                    </div>
                    <div className="w-16 shrink-0 flex items-center justify-end gap-2">
                      <span className={cn("text-xs font-black tabular-nums", item.status === 'ELEVATED' ? 'text-rose-600' : 'text-slate-700')}>{item.value}%</span>
                      <div className={cn("w-2 h-2 rounded-full", item.status === 'ELEVATED' ? 'bg-rose-500 animate-pulse' : item.status === 'MODERATE' ? 'bg-amber-400' : 'bg-emerald-400')} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── ROW 4: SUSPICIOUS REGION TABLE ─── */}
        {result && !isErr && regions.length > 0 && (
          <div className="pt-6">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-sky-600" />
              Identified Suspicious Regions
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Region ID</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Coordinates</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Pixel Area</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {regions.map((r, i) => {
                    const conf = typeof r.confidence === 'number' ? (r.confidence <= 1 ? r.confidence * 100 : r.confidence) : 0;
                    return (
                      <tr key={i} className="hover:bg-sky-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black",
                            conf >= 60 ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700"
                          )}>R{i + 1}</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-600">x:{r.x}, y:{r.y} w:{r.w}, h:{r.h}</td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-600">{(r.w * r.h).toLocaleString()} px²</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-3">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={cn("h-full", conf >= 60 ? "bg-rose-500" : "bg-sky-500")} style={{ width: `${Math.min(100, conf)}%` }} />
                            </div>
                            <span className={cn("text-sm font-bold w-9 text-right", conf >= 60 ? "text-rose-600" : "text-sky-600")}>{Math.round(conf)}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const Monitor = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="8" y1="21" x2="16" y2="21"></line>
    <line x1="12" y1="17" x2="12" y2="21"></line>
  </svg>
);
