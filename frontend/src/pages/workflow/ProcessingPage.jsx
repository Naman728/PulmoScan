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
        <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden relative">
            
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500 rounded-full blur-[150px] opacity-[0.05] pointer-events-none"></div>

            <div className="max-w-xl w-full text-center space-y-12 relative z-10">

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
                        className="w-40 h-40 rounded-[40px] flex items-center justify-center shadow-[0_0_50px_rgba(124,58,237,0.4)] relative z-10 border border-purple-500/30 backdrop-blur-3xl"
                        style={{ background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.4), rgba(6, 182, 212, 0.4))' }}
                    >
                        <Brain className="w-20 h-20 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                    </motion.div>

                    {/* Pulsing rings */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <motion.div
                            initial={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 2.5, opacity: 0 }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="w-40 h-40 rounded-full border-2 border-purple-400/40"
                        />
                        <motion.div
                            initial={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 3.5, opacity: 0 }}
                            transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                            className="w-40 h-40 rounded-full border border-cyan-400/30"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AI analyzing CT scan...</h2>
                    <p className="text-gray-400 font-medium text-sm">Processing volumetric data through neural pipeline</p>
                </div>

                {/* Progress Steps */}
                <div className="p-8 rounded-[32px] border shadow-2xl space-y-6 text-left relative z-10 backdrop-blur-xl" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                    {STEPS.map((step, index) => {
                        const isCompleted = completedSteps.includes(step.id);
                        const isActive = currentStepIndex === index;

                        return (
                            <div key={step.id} className="flex items-center gap-5 group">
                                <div className="shrink-0">
                                    {isCompleted ? (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                              <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                        </motion.div>
                                    ) : isActive ? (
                                        <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                                          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full border border-gray-700 bg-white/5" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className={cn(
                                        "font-bold transition-all duration-300 text-sm tracking-wide",
                                        isCompleted ? "text-gray-500 line-through decoration-emerald-500/30" : isActive ? "text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]" : "text-gray-600"
                                    )}>
                                        {step.label}
                                    </p>
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-bar"
                                            className="h-1 rounded-full mt-2.5 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                                            style={{ background: 'linear-gradient(90deg, #7C3AED, #06B6D4)' }}
                                            initial={{ width: 0 }}
                                            animate={{ width: '100%' }}
                                            transition={{ duration: 1.5, ease: 'linear' }}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center justify-center gap-2 text-cyan-500 bg-cyan-900/10 inline-flex mx-auto px-4 py-2 rounded-full border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                    <Scan className="w-4 h-4 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Neural Link Established</span>
                </div>
            </div>
        </div>
    );
}
