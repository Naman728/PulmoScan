import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiPredictionService } from '../services/api';
import {
    ScanLine,
    ImageIcon,
    Upload,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Stethoscope,
    Activity,
    X,
    ShieldCheck,
    Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatConfidence } from '../utils/format';
import toast from 'react-hot-toast';

const MODEL_OPTIONS = [
    { id: 'ct', label: 'CT Scan', subtitle: '224×224 • Brain / Body CT', Icon: ScanLine },
    { id: 'brain', label: 'Brain', subtitle: '224×224 • Brain MRI/CT', Icon: Brain },
    { id: 'xray', label: 'X-Ray', subtitle: 'Chest / Pulmonary', Icon: ImageIcon },
];

const AIPredict = () => {
    const [files, setFiles] = useState({ ct: null, brain: null, xray: null });
    const [loading, setLoading] = useState({ ct: false, brain: false, xray: false });
    const [results, setResults] = useState({ ct: null, brain: null, xray: null });
    const [errors, setErrors] = useState({ ct: null, brain: null, xray: null });

    const handleFileChange = (modelId, e) => {
        const f = e.target.files?.[0];
        if (f) {
            setFiles((prev) => ({ ...prev, [modelId]: f }));
            setResults((prev) => ({ ...prev, [modelId]: null }));
            setErrors((prev) => ({ ...prev, [modelId]: null }));
        }
    };

    const runPrediction = async (modelId) => {
        const file = files[modelId];
        if (!file) {
            toast.error(`Please select an image for ${MODEL_OPTIONS.find((m) => m.id === modelId)?.label ?? modelId}`);
            return;
        }
        setLoading((prev) => ({ ...prev, [modelId]: true }));
        setErrors((prev) => ({ ...prev, [modelId]: null }));
        setResults((prev) => ({ ...prev, [modelId]: null }));
        try {
            const data = await aiPredictionService.predictUnified(file, modelId);
            setResults((prev) => ({ ...prev, [modelId]: data }));
            const pred = data?.prediction ?? '';
            const isErr = pred.startsWith('Error') || pred === 'Model not available';
            if (isErr) toast.error(pred);
            else toast.success(`${data?.model ?? modelId} analysis complete`);
        } catch (err) {
            const msg = err.response?.data?.detail || err.message || 'Prediction failed';
            const str = typeof msg === 'string' ? msg : (Array.isArray(msg) ? msg.map((m) => m.msg || m).join(', ') : 'Prediction failed');
            setErrors((prev) => ({ ...prev, [modelId]: str }));
            toast.error(str);
        } finally {
            setLoading((prev) => ({ ...prev, [modelId]: false }));
        }
    };

    const clearResult = (modelId) => {
        setFiles((prev) => ({ ...prev, [modelId]: null }));
        setResults((prev) => ({ ...prev, [modelId]: null }));
        setErrors((prev) => ({ ...prev, [modelId]: null }));
    };

    const resultCard = (result, modelId) => {
        const modelName = (result?.model ?? modelId)?.toUpperCase?.() ?? String(modelId);
        const confidenceRaw = result?.confidence ?? 0;
        const confidencePct = confidenceRaw <= 1 ? confidenceRaw * 100 : confidenceRaw;
        const prediction = result?.prediction ?? '—';
        const isError = !prediction || prediction.startsWith('Error') || prediction === 'Model not available';
        return (
            <div className={cn(
                "rounded-[28px] border-2 p-6",
                isError ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800" : "bg-white/60 dark:bg-slate-800/60 border-white dark:border-slate-700"
            )}>
                <div className="flex items-center gap-3 mb-4">
                    {isError ? (
                        <AlertCircle className="w-8 h-8 text-red-500 shrink-0" />
                    ) : (
                        <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                    )}
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Model: {modelName}</p>
                        <p className={cn(
                            "text-xl font-black uppercase tracking-tight",
                            isError ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"
                        )}>{prediction}</p>
                    </div>
                </div>
                {!isError && (
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
        );
    };

    const uploadCard = (modelId) => {
        const { label, subtitle, Icon } = MODEL_OPTIONS.find((m) => m.id === modelId) || { label: modelId, subtitle: '', Icon: Activity };
        const file = files[modelId];
        const isLoading = loading[modelId];
        const result = results[modelId];
        const error = errors[modelId];
        return (
            <motion.div
                key={modelId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[44px] border border-white/20 p-8 shadow-2xl flex flex-col"
            >
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-[20px] bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                        <Icon className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{label}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{subtitle}</p>
                    </div>
                </div>

                <input
                    type="file"
                    id={`file-${modelId}`}
                    className="hidden"
                    accept="image/*,.dcm,.png,.jpg,.jpeg,.bmp"
                    onChange={(e) => handleFileChange(modelId, e)}
                />

                {!file ? (
                    <label
                        htmlFor={`file-${modelId}`}
                        className="flex flex-col items-center justify-center py-12 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-700 cursor-pointer hover:border-primary-500 hover:bg-primary-500/5 transition-all group"
                    >
                        <Upload className="w-12 h-12 text-slate-400 group-hover:text-primary-500 mb-4 transition-colors" />
                        <p className="text-sm font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">Select image</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">PNG, JPG, BMP, DICOM</p>
                    </label>
                ) : (
                    <>
                        <div className="relative aspect-video rounded-[28px] overflow-hidden bg-slate-900 border border-white/20 mb-6">
                            <img
                                src={URL.createObjectURL(file)}
                                alt="Preview"
                                className="w-full h-full object-contain"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-green-400" />
                                <span className="text-[10px] font-black text-white/90 uppercase tracking-wider truncate">{file.name}</span>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); clearResult(modelId); }}
                                className="absolute top-3 right-3 p-2 bg-white/20 hover:bg-red-500/80 rounded-xl text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => runPrediction(modelId)}
                            disabled={isLoading}
                            className="w-full py-4 bg-primary-500 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-primary-500/20 hover:bg-primary-600 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Activity className="w-5 h-5" />
                                    Run AI Analysis
                                </>
                            )}
                        </button>
                    </>
                )}

                <AnimatePresence mode="wait">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3"
                        >
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                            <p className="text-sm font-semibold text-red-700 dark:text-red-300">{typeof error === 'string' ? error : 'An error occurred'}</p>
                        </motion.div>
                    )}
                    {result && !error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-6"
                        >
                            {resultCard(result, modelId)}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-6xl mx-auto space-y-10 pb-20"
        >
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-[24px] bg-primary-500/10 flex items-center justify-center">
                    <Stethoscope className="w-8 h-8 text-primary-500" />
                </div>
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">AI Prediction</h1>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Upload CT, Brain, or X-ray • Get instant analysis</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {MODEL_OPTIONS.map((m) => uploadCard(m.id))}
            </div>

            <div className="p-6 rounded-[32px] bg-white/20 dark:bg-slate-900/20 border border-white/10 flex items-start gap-4">
                <ShieldCheck className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                <div>
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Privacy & processing</h5>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 leading-relaxed">
                        Images are sent to the backend for AI inference only. No images are stored. Results are for decision support; always confirm with a clinician.
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

export default AIPredict;
