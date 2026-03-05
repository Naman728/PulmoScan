import React, { useState, useMemo } from 'react';
import { aiPredictionService } from '../services/api';
import {
  ScanLine,
  ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { formatConfidence } from '../utils/format';
import {
  ConfidenceGauge,
  ProbabilityBars,
  RiskBadge,
  AIInsightPanel,
} from '../components/ai';
import { EmptyStateScan } from '../components/illustrations';
import AILoadingSteps from '../components/illustrations/AILoadingSteps';
import { buildProbabilityItems, getAIInsightText } from '../utils/aiDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const SUPPORTED_FORMATS = 'PNG, JPG, BMP, DICOM';

export default function UploadScanStandalone() {
  const [scanType, setScanType] = useState('ct');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [sliceIndex, setSliceIndex] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isMultiCt = scanType === 'ct';
  const fileList = Array.isArray(files) ? files : (files ? [files] : []);
  const sliceCount = fileList.length;
  const currentSlice = sliceCount ? sliceIndex % sliceCount : 0;
  const currentFile = fileList[currentSlice] || null;

  const onFileChange = (e) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    if (selected.length) {
      setFiles(selected);
      setResult(null);
      setError(null);
      setSliceIndex(0);
    }
  };

  const runAnalysis = async () => {
    if (scanType === 'ct') {
      if (!fileList.length) {
        toast.error('Select at least one CT scan image');
        return;
      }
    } else {
      if (!fileList.length) {
        toast.error('Select an X-ray image');
        return;
      }
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setUploadProgress(0);
    const progressInterval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 8, 92));
    }, 300);
    try {
      const data = scanType === 'ct'
        ? await aiPredictionService.predictCTScan(fileList)
        : await aiPredictionService.predictXRay(fileList[0]);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setResult(data);
      toast.success('Analysis complete');
    } catch (err) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      const msg = err.response?.data?.detail || err.message || 'Analysis failed';
      setError(typeof msg === 'string' ? msg : (Array.isArray(msg) ? msg.map((m) => m.msg || m).join(', ') : 'Analysis failed'));
      toast.error('Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const isCtMultiResult = result && result.slice_results && result.slice_results.length > 0;
  const pred = result?.final_diagnosis ?? result?.prediction ?? null;
  const confidenceRaw = result?.final_confidence ?? result?.confidence;
  const confidence = confidenceRaw != null ? (typeof confidenceRaw === 'number' && confidenceRaw <= 1 ? confidenceRaw * 100 : confidenceRaw) : 0;
  const isErr = pred && (String(pred).startsWith('Error') || pred === 'Model not available' || pred === 'No images uploaded' || pred === 'Analysis failed for all slices');
  const riskLevel = confidence >= 70 ? 'High' : confidence >= 40 ? 'Medium' : 'Low';
  const probabilityItems = useMemo(
    () => (pred && !isErr ? buildProbabilityItems(pred, confidence) : []),
    [pred, confidence, isErr]
  );
  const insightText = useMemo(
    () => (pred && !isErr ? getAIInsightText(pred, confidence) : null),
    [pred, confidence, isErr]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Scan Analysis</h1>
        <p className="text-slate-400 mt-1">
          {isMultiCt ? 'Upload one or multiple CT scan slices for neural analysis.' : 'Upload an X-ray image for analysis.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[520px]">
        {/* Left: Upload */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="glass-card rounded-2xl p-5 border border-slate-700/50 flex-1 flex flex-col">
            <div className="flex gap-2 mb-4">
              {[
                { id: 'ct', label: 'CT Scan', icon: ScanLine },
                { id: 'xray', label: 'X-Ray', icon: ImageIcon },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setScanType(opt.id);
                    setFiles([]);
                    setResult(null);
                    setError(null);
                  }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-all',
                    scanType === opt.id
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      : 'bg-slate-800/40 text-slate-400 border-slate-600 hover:border-slate-500'
                  )}
                >
                  <opt.icon className="w-4 h-4" /> {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mb-3">Supported: {SUPPORTED_FORMATS}{isMultiCt ? ' (multiple allowed for CT)' : ''}</p>

            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept="image/*,.dcm,.png,.jpg,.jpeg,.bmp"
              multiple={isMultiCt}
              onChange={onFileChange}
            />

            {!fileList.length ? (
              <label
                htmlFor="file-upload"
                className="flex-1 flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer transition-all duration-300 animate-shimmer bg-slate-800/20 hover:border-sky-500/50 hover:bg-slate-800/30 hover:shadow-[0_0_24px_rgba(56,189,248,0.12)]"
              >
                <EmptyStateScan message={isMultiCt ? 'Drop CT scan slices here or browse files (multiple)' : 'Drop X-ray image here or browse'} />
              </label>
            ) : (
              <>
                {/* Preview grid for multiple CT slices */}
                {isMultiCt && fileList.length > 1 ? (
                  <div className="grid grid-cols-3 gap-2 mb-4 max-h-32 overflow-y-auto">
                    {fileList.map((f, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSliceIndex(i)}
                        className={cn(
                          'relative rounded-lg overflow-hidden border aspect-square',
                          currentSlice === i ? 'border-sky-500 ring-1 ring-sky-500/50' : 'border-slate-600'
                        )}
                      >
                        <img src={URL.createObjectURL(f)} alt={`Slice ${i + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-[10px] text-white py-0.5 text-center">
                          {i + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden bg-slate-800 border border-slate-600 mb-4">
                    <img
                      src={currentFile ? URL.createObjectURL(currentFile) : ''}
                      alt="Preview"
                      className="w-full h-36 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => { setFiles([]); setResult(null); setError(null); }}
                      className="absolute top-2 right-2 p-2 bg-slate-800/90 rounded-lg border border-slate-600 hover:bg-red-500/20"
                    >
                      <X className="w-4 h-4 text-slate-300" />
                    </button>
                  </div>
                )}
                {isMultiCt && fileList.length > 1 && (
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500">{fileList.length} slice(s) selected</p>
                    <button type="button" onClick={() => { setFiles([]); setResult(null); setError(null); }} className="text-xs text-red-400 hover:text-red-300">Clear all</button>
                  </div>
                )}
                {loading && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> AI Neural Analysis Running...
                      </span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-sky-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={runAnalysis}
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-medium bg-sky-500 text-white hover:bg-sky-400 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                  ) : (
                    'Run analysis'
                  )}
                </button>
              </>
            )}

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Center: Scan Preview / Slice Viewer */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="glass-card rounded-2xl border border-slate-700/50 flex-1 flex flex-col overflow-hidden min-h-[320px]">
            <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scan Preview</span>
              {sliceCount > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSliceIndex((i) => Math.max(0, i - 1))}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-400 tabular-nums">Slice {currentSlice + 1} / {sliceCount}</span>
                  <button
                    type="button"
                    onClick={() => setSliceIndex((i) => Math.min(sliceCount - 1, i + 1))}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 flex items-center justify-center p-4 bg-slate-900/50">
              {currentFile ? (
                <div className="w-full h-full rounded-lg overflow-hidden border border-slate-700 flex items-center justify-center bg-black/30">
                  <img
                    src={URL.createObjectURL(currentFile)}
                    alt={`Slice ${currentSlice + 1}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <EmptyStateScan message="Upload a scan to begin AI analysis" />
              )}
            </div>
          </div>

          {result && !isErr && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              {[
                { label: 'Model Confidence', value: `${Math.round(confidence)}%`, color: 'sky' },
                { label: 'Risk Level', value: riskLevel, color: confidence >= 70 ? 'red' : confidence >= 40 ? 'amber' : 'green' },
              ].map((m) => (
                <div key={m.label} className="glass-card rounded-xl px-3 py-2 border border-slate-700/50">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{m.label}</p>
                  <p className={cn('text-sm font-bold', m.color === 'sky' && 'text-sky-300', m.color === 'red' && 'text-red-400', m.color === 'amber' && 'text-amber-400', m.color === 'green' && 'text-emerald-400')}>{m.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: AI Analysis Results */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="glass-card rounded-2xl border border-slate-700/50 flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/50 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-semibold text-white">AI Analysis Results</span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-6">
              <AnimatePresence mode="wait">
                {loading && !result ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <AILoadingSteps />
                  </motion.div>
                ) : error || isErr ? (
                  <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
                    <p className="text-sm text-red-300">{error || pred || 'Analysis failed'}</p>
                  </motion.div>
                ) : result && pred ? (
                  <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                    {/* Final diagnosis summary (always for CT multi; single result uses same card) */}
                    <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20">
                      <p className="text-xs font-semibold text-sky-400/90 uppercase tracking-wider mb-1">Diagnosis</p>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <p className="text-lg font-bold text-white">{pred}</p>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">Confidence: {formatConfidence(confidence, false)}</p>
                      {isCtMultiResult && result.total_slices > 0 && (
                        <p className="text-xs text-slate-500 mt-1">Aggregated from {result.total_slices} slice(s)</p>
                      )}
                    </div>

                    {/* Per-slice results (CT multi only) */}
                    {isCtMultiResult && result.slice_results && result.slice_results.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Slice results</p>
                        <div className="rounded-xl border border-slate-600 overflow-hidden">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="bg-slate-800/50 border-b border-slate-600">
                                <th className="px-3 py-2 text-slate-400 font-medium">Slice</th>
                                <th className="px-3 py-2 text-slate-400 font-medium">Prediction</th>
                                <th className="px-3 py-2 text-slate-400 font-medium">Conf.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.slice_results.map((s) => (
                                <tr key={s.slice_index} className="border-b border-slate-700/50 last:border-0">
                                  <td className="px-3 py-2 text-slate-300">{s.slice_index}</td>
                                  <td className="px-3 py-2 font-medium text-white">{s.prediction}</td>
                                  <td className="px-3 py-2 text-sky-300 tabular-nums">{formatConfidence(s.confidence >= 0 && s.confidence <= 1 ? s.confidence * 100 : s.confidence)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {probabilityItems.length > 0 && <ProbabilityBars items={probabilityItems} title="Probability Distribution" />}
                    <ConfidenceGauge value={confidence} label="AI Confidence" />
                    <RiskBadge level={riskLevel} label="Risk Level" />
                    <AIInsightPanel text={insightText} />
                    <div className="rounded-xl border border-slate-600 border-dashed bg-slate-800/30 p-6 text-center">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Attention Map</p>
                      <p className="text-xs text-slate-500 mt-1">Coming Soon</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <EmptyStateScan message="Run analysis to see AI results" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
