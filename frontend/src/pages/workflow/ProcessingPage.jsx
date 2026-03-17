import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Brain, CheckCircle2, Loader2, Scan } from 'lucide-react';
import { motion } from 'framer-motion';
import { aiPredictionService } from '../../services/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const STEPS = [
    { id: 'preprocess', label: 'Slice Preprocessing' },
    { id: 'features', label: 'Feature Extraction' },
    { id: 'classify', label: 'Disease Classification' },
    { id: 'explain', label: 'Explainability Generation' },
];

export default function ProcessingPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [completedSteps, setCompletedSteps] = useState([]);

    const { files, patientInfo, scanType = 'ct' } = location.state || {};

    useEffect(() => {
        if (!files || !files.length) {
            toast.error('No scan data found. Returning to upload.');
            navigate('/upload-scan');
            return;
        }

        const runInference = async () => {
            try {
                // Dummy interval to simulate UI progress through steps
                const stepInterval = setInterval(() => {
                    setCurrentStepIndex(prev => {
                        if (prev < STEPS.length - 1) {
                            setCompletedSteps(c => [...c, STEPS[prev].id]);
                            return prev + 1;
                        }
                        return prev;
                    });
                }, 1500);

                const response = await aiPredictionService.predictCTScan(files);

                clearInterval(stepInterval);

                // Ensure all steps look completed before navigating
                setCompletedSteps(STEPS.map(s => s.id));
                setCurrentStepIndex(STEPS.length);

                // Success - navigate to results
                setTimeout(() => {
                    navigate('/results', {
                        state: {
                            result: response?.result ?? response,
                            patientInfo,
                            files // Passing files to avoid blob issues if needed or for reference
                        }
                    });
                }, 800);

            } catch (err) {
                console.error('Inference error:', err);
                const msg = err.response?.data?.detail || err.message || 'Analysis failed';
                toast.error(typeof msg === 'string' ? msg : 'Analysis failed');
                navigate('/upload-scan');
            }
        };

        runInference();
    }, [files, patientInfo, scanType, navigate]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 overflow-hidden">
            <div className="max-w-2xl w-full text-center space-y-12">

                {/* Animated Brain/Scan Icon */}
                <div className="relative flex items-center justify-center">
                    <motion.div
                        animate={{
                            scale: [1, 1.05, 1],
                            rotate: [0, 5, -5, 0]
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="w-40 h-40 rounded-[40px] bg-gradient-to-br from-sky-500 to-teal-400 flex items-center justify-center shadow-2xl shadow-sky-500/30 relative z-10"
                    >
                        <Brain className="w-20 h-20 text-white" />
                    </motion.div>

                    {/* Pulsing rings */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                            initial={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 2.5, opacity: 0 }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="w-40 h-40 rounded-full border-2 border-sky-400/30"
                        />
                        <motion.div
                            initial={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 3.5, opacity: 0 }}
                            transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                            className="w-40 h-40 rounded-full border border-teal-400/20"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">AI analyzing CT scan...</h2>
                    <p className="text-slate-500 font-medium">Processing volumetric data through neural pipeline</p>
                </div>

                {/* Progress Steps */}
                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6 text-left relative z-10">
                    {STEPS.map((step, index) => {
                        const isCompleted = completedSteps.includes(step.id);
                        const isActive = currentStepIndex === index;

                        return (
                            <div key={step.id} className="flex items-center gap-4 group">
                                <div className="shrink-0">
                                    {isCompleted ? (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                        </motion.div>
                                    ) : isActive ? (
                                        <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full border-2 border-slate-100" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className={cn(
                                        "font-bold transition-all duration-300",
                                        isCompleted ? "text-slate-400 line-through decoration-emerald-500/30" : isActive ? "text-slate-900" : "text-slate-300"
                                    )}>
                                        {step.label}
                                    </p>
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-bar"
                                            className="h-1 bg-sky-500 rounded-full mt-2"
                                            initial={{ width: 0 }}
                                            animate={{ width: '40%' }}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center justify-center gap-2 text-slate-400">
                    <Scan className="w-4 h-4 animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Neural Link Enabled</span>
                </div>
            </div>
        </div>
    );
}
