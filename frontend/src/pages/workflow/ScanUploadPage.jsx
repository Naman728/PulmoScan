import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, Upload, X, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const SUPPORTED_FORMATS = 'PNG, JPG, BMP, DICOM';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function ScanUploadPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [files, setFiles] = useState([]);
    const [patientInfo, setPatientInfo] = useState({
        name: location.state?.patientForm?.patientName ?? '',
        age: location.state?.patientForm?.age ?? '',
        patientId: location.state?.patientForm?.patientId ?? '',
    });

    const onFileChange = (e) => {
        const selected = e.target.files ? Array.from(e.target.files) : [];
        if (selected.length) {
            setFiles(selected);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const dropped = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
        if (dropped.length) {
            setFiles(dropped);
        }
    };

    const startAnalysis = () => {
        if (!files.length) {
            toast.error('Please upload at least one CT slice.');
            return;
        }
        navigate('/processing', {
            state: {
                files,
                patientInfo,
                scanType: 'ct'
            }
        });
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 font-sans">
            <motion.div
                variants={containerVariants} initial="hidden" animate="visible"
                className="max-w-4xl w-full text-center space-y-8"
            >
                <motion.div variants={itemVariants} className="space-y-3 pb-4">
                    <h1 className="text-4xl font-black text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Upload CT Scan for AI Analysis</h1>
                    <p className="text-cyan-400 font-bold uppercase tracking-widest text-xs">Professional Neural Architecture</p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    {/* Patient Details Side */}
                    <motion.div variants={itemVariants} className="md:col-span-4 space-y-4 text-left">
                        <div className="p-6 rounded-3xl border shadow-sm space-y-5" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Patient Details (Optional)</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. John Doe"
                                        value={patientInfo.name}
                                        onChange={e => setPatientInfo(p => ({ ...p, name: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all text-sm font-medium border text-white placeholder-gray-600 focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] focus:bg-cyan-950/20"
                                        style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Patient ID</label>
                                    <input
                                        type="text"
                                        placeholder="ID-000000"
                                        value={patientInfo.patientId}
                                        onChange={e => setPatientInfo(p => ({ ...p, patientId: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all text-sm font-medium border text-white placeholder-gray-600 focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] focus:bg-cyan-950/20"
                                        style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Age</label>
                                    <input
                                        type="number"
                                        placeholder="Years"
                                        value={patientInfo.age}
                                        onChange={e => setPatientInfo(p => ({ ...p, age: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all text-sm font-medium border text-white placeholder-gray-600 focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] focus:bg-cyan-950/20"
                                        style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl border italic text-[10px] text-cyan-500 leading-relaxed font-semibold shadow-[0_0_15px_rgba(6,182,212,0.1)]" style={{ background: 'rgba(6,182,212,0.05)', borderColor: 'rgba(6,182,212,0.2)' }}>
                            * AI analysis is optimized for high-resolution DICOM and standard imagery. Ensure slices are sequential for volumetric extraction.
                        </div>
                    </motion.div>

                    {/* Upload Area */}
                    <motion.div variants={itemVariants} className="md:col-span-8 space-y-6">
                        <div
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            className={cn(
                                "relative group flex flex-col items-center justify-center p-12 h-[420px] rounded-[40px] border border-dashed transition-all duration-300 overflow-hidden",
                                files.length > 0 ? "border-cyan-500/50 bg-cyan-900/10 shadow-[0_0_20px_rgba(6,182,212,0.15)]" : "border-gray-700 hover:border-cyan-500/40 hover:bg-cyan-900/5"
                            )}
                            style={files.length === 0 ? { background: 'rgba(255,255,255,0.02)' } : {}}
                        >
                            <AnimatePresence mode="wait">
                                {files.length === 0 ? (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="flex flex-col items-center cursor-pointer w-full h-full justify-center relative z-10"
                                        onClick={() => document.getElementById('scan-upload-input').click()}
                                    >
                                        <div className="absolute inset-0 bg-cyan-500 rounded-full blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none"></div>
                                        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_15px_rgba(6,182,212,0.2)] border relative z-10"
                                          style={{ background: 'rgba(6,182,212,0.1)', borderColor: 'rgba(6,182,212,0.3)' }}>
                                            <Camera className="w-10 h-10 text-cyan-400" />
                                        </div>
                                        <p className="text-xl font-bold text-white relative z-10" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Click to upload or drag files here</p>
                                        <p className="text-sm text-gray-400 mt-2 font-medium relative z-10">Multiple CT slices supported</p>
                                        <div className="mt-8 px-6 py-2 rounded-full text-[10px] font-black text-gray-500 uppercase tracking-widest relative z-10 border" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                            {SUPPORTED_FORMATS}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="previews"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="absolute inset-0 p-8 flex flex-col z-10"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                                                <Upload className="w-3.5 h-3.5" />
                                                {files.length} Slices Ready
                                            </div>
                                            <button
                                                onClick={() => setFiles([])}
                                                className="text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors p-2"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 overflow-y-auto custom-scrollbar flex-1 pb-4">
                                            {files.map((file, i) => (
                                                <div key={i} className="aspect-square rounded-xl overflow-hidden bg-black border border-white/10 shadow-sm relative group/item">
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt={`Slice ${i}`}
                                                        className="w-full h-full object-cover filter grayscale opacity-60 group-hover/item:opacity-100 transition-opacity"
                                                    />
                                                    <div className="absolute inset-0 bg-cyan-500/10 mix-blend-overlay"></div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <input
                                type="file"
                                id="scan-upload-input"
                                className="hidden"
                                multiple
                                accept=".png,.jpg,.jpeg,.bmp,.dcm"
                                onChange={onFileChange}
                            />
                        </div>

                        <button
                            onClick={startAnalysis}
                            disabled={files.length === 0}
                            className={cn(
                                "w-full flex items-center justify-center gap-3 py-5 rounded-[24px] font-black text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl active:scale-95 group relative overflow-hidden",
                                files.length > 0 ? "text-white" : "bg-white/5 text-gray-500 border border-white/10"
                            )}
                            style={files.length > 0 ? {
                              background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
                              boxShadow: '0 10px 30px rgba(124, 58, 237, 0.4)'
                            } : {}}
                        >
                            {files.length > 0 && <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            <span className="relative z-10 flex items-center gap-3">
                              Run AI Analysis
                              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
