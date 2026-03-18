/**
 * Single-model analysis page: one model per page, no shared state.
 * Used by /ct-analysis, /brain-analysis, /xray-analysis.
 * Calls only POST /ai/predict?model_type=<modelType>. State resets when leaving page.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiPredictionService, API_BASE_URL } from '../../services/api';
import {
    Upload,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Activity,
    X,
    ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatConfidence } from '../../utils/format';
import toast from 'react-hot-toast';

export default function SingleModelAnalysisPage({
    modelType,
    title,
    subtitle,
    Icon,
    resultLabel = 'Prediction',
    conditionsLabel = 'Findings',
}) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        if (f) {
            setFile(f);
            setResult(null);
            setError(null);
        }
    };

    const runAnalysis = async () => {
        if (!file) {
            toast.error('Please select an image first.');
            return;
        }
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const data = await aiPredictionService.predictUnified(file, String(modelType).toLowerCase());
            setResult(data);
            const pred = data?.prediction ?? '';
            const isErr = pred.startsWith('Error') || pred === 'Model not available' || data?.error;
            if (isErr) {
                setError(pred || data?.error || 'Analysis failed');
                toast.error(pred || 'Analysis failed');
            } else {
                toast.success('Analysis complete');
            }
        } catch (err) {
            const status = err.response?.status;
            let msg = err.response?.data?.detail ?? err.message ?? 'Analysis failed';
            if (typeof msg !== 'string' && Array.isArray(msg)) {
                msg = msg.map((m) => m?.msg ?? m).join(', ');
            } else if (typeof msg !== 'string') {
                msg = 'Analysis failed';
            }
            if (status === 404) {
                msg = `API route not found (404). Ensure the backend is running at ${API_BASE_URL} and the endpoint POST /ai/predict is available.`;
            } else if (status >= 500) {
                msg = `Server error (${status}). ${msg}`;
            }
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const clearAll = () => {
        setFile(null);
        setResult(null);
        setError(null);
    };

    const confidenceRaw = result?.confidence ?? 0;
    const confidencePct = confidenceRaw <= 1 ? confidenceRaw * 100 : confidenceRaw;
    const prediction = result?.prediction ?? '';
    const isResultError = !prediction || prediction.startsWith('Error') || prediction === 'Model not available' || result?.error;
    const conditions = result?.conditions ?? [];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto space-y-8 pb-20"
        >
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-[24px] bg-primary-500/10 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-primary-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h1>
                    <p className="text-slate-500 font-semibold text-sm mt-1">{subtitle}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">AI Model: {modelType.toUpperCase()}</p>
                </div>
            </div>

            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[32px] border border-slate-200 dark:border-slate-700 p-8 shadow-xl">
                <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Upload image</h2>
                <input
                    type="file"
                    id={`file-${modelType}`}
                    className="hidden"
                    accept="image/*,.dcm,.png,.jpg,.jpeg,.bmp"
                    onChange={handleFileChange}
                />
                {!file ? (
                    <label
                        htmlFor={`file-${modelType}`}
                        className="flex flex-col items-center justify-center py-14 rounded-[24px] border-2 border-dashed border-slate-200 dark:border-slate-600 cursor-pointer hover:border-primary-500 hover:bg-primary-500/5 transition-all group"
                    >
                        <Upload className="w-14 h-14 text-slate-400 group-hover:text-primary-500 mb-4 transition-colors" />
                        <p className="text-sm font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">Select image</p>
                        <p className="text-xs font-bold text-slate-400 mt-1">PNG, JPG, BMP, DICOM</p>
                    </label>
                ) : (
                    <>
                        <div className="relative aspect-video rounded-[24px] overflow-hidden bg-slate-900 border border-slate-700 mb-6">
                            <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-contain" />
                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                                <span className="text-xs font-bold text-white/90 truncate">{file.name}</span>
                                <button
                                    type="button"
                                    onClick={clearAll}
                                    className="p-2 bg-white/20 hover:bg-red-500/80 rounded-xl text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={runAnalysis}
                            disabled={loading}
                            className="w-full py-4 bg-primary-500 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-lg hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Activity className="w-5 h-5" />
                                    Run Analysis
                                </>
                            )}
                        </button>
                    </>
                )}
            </div>

            <AnimatePresence mode="wait">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-6 rounded-[24px] bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 flex items-center gap-4"
                    >
                        <AlertCircle className="w-10 h-10 text-red-500 shrink-0" />
                        <div>
                            <p className="text-sm font-black text-red-800 dark:text-red-200 uppercase tracking-wider">Error</p>
                            <p className="text-slate-700 dark:text-slate-300 mt-1">{error}</p>
                        </div>
                    </motion.div>
                )}
                {result && !error && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6"
                    >
                        <div className={cn(
                            "rounded-[28px] border-2 p-6",
                            isResultError ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800" : "bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                        )}>
                            <div className="flex items-center gap-3 mb-4">
                                {isResultError ? (
                                    <AlertCircle className="w-8 h-8 text-red-500 shrink-0" />
                                ) : (
                                    <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                                )}
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Model: {modelType.toUpperCase()}</p>
                                    <p className={cn(
                                        "text-xl font-black uppercase tracking-tight",
                                        isResultError ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"
                                    )}>{prediction || '—'}</p>
                                </div>
                            </div>
                            {!isResultError && (
                                <>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confidence</span>
                                        <span className="text-2xl font-bold text-primary-600 dark:text-primary-400 tabular-nums">{formatConfidence(confidencePct, false)}</span>
                                    </div>
                                    <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, confidencePct)}%` }}
                                            transition={{ duration: 0.8 }}
                                            className="h-full bg-primary-500 rounded-full"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        {conditions.length > 0 && (
                            <div className="rounded-[24px] border border-slate-200 dark:border-slate-700 p-6 bg-white/60 dark:bg-slate-800/60">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">{conditionsLabel}</h3>
                                <ul className="space-y-2">
                                    {conditions.map((c, i) => (
                                        <li key={i} className="flex justify-between text-sm">
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{c.label ?? `Item ${i + 1}`}</span>
                                            <span className="tabular-nums font-bold text-slate-600 dark:text-slate-400">
                                                {typeof c.probability === 'number' ? formatConfidence(c.probability * 100, false) : (c.probability ?? '—')}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="p-6 rounded-[24px] bg-white/20 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-700 flex items-start gap-4">
                <ShieldCheck className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                <div>
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Privacy & processing</h5>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Only the selected model runs for your image. No cross-model execution. Results are for decision support; confirm with a clinician.
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
