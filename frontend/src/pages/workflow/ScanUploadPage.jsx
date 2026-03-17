import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, Upload, ImageIcon, X, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const SUPPORTED_FORMATS = 'PNG, JPG, BMP, DICOM';

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
        // Navigate to processing page with state
        navigate('/processing', {
            state: {
                files,
                patientInfo,
                scanType: 'ct' // Defaulting to CT as requested in "CT Scan workflow"
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl w-full text-center space-y-8"
            >
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Upload CT Scan for AI Analysis</h1>
                    <p className="text-slate-500 font-medium">Professional Neural Architecture for Pulmonary Diagnostics</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    {/* Patient Details Side */}
                    <div className="md:col-span-4 space-y-4 text-left">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Patient Details (Optional)</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. John Doe"
                                        value={patientInfo.name}
                                        onChange={e => setPatientInfo(p => ({ ...p, name: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Patient ID</label>
                                    <input
                                        type="text"
                                        placeholder="ID-000000"
                                        value={patientInfo.patientId}
                                        onChange={e => setPatientInfo(p => ({ ...p, patientId: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Age</label>
                                    <input
                                        type="number"
                                        placeholder="Years"
                                        value={patientInfo.age}
                                        onChange={e => setPatientInfo(p => ({ ...p, age: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100 italic text-[11px] text-sky-700 leading-relaxed">
                            * AI analysis is optimized for high-resolution DICOM and standard imagery. Ensure slices are sequential for volumetric extraction.
                        </div>
                    </div>

                    {/* Upload Area */}
                    <div className="md:col-span-8 space-y-6">
                        <div
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            className={cn(
                                "relative group flex flex-col items-center justify-center p-12 h-[420px] rounded-[40px] border-4 border-dashed transition-all duration-300 overflow-hidden bg-white",
                                files.length > 0 ? "border-sky-200" : "border-slate-200 hover:border-sky-400 hover:bg-sky-50/30"
                            )}
                        >
                            <AnimatePresence mode="wait">
                                {files.length === 0 ? (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="flex flex-col items-center"
                                        onClick={() => document.getElementById('scan-upload-input').click()}
                                    >
                                        <div className="w-24 h-24 rounded-full bg-sky-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner border border-sky-100">
                                            <Camera className="w-10 h-10 text-sky-500" />
                                        </div>
                                        <p className="text-xl font-bold text-slate-700">Click to upload or drag files here</p>
                                        <p className="text-sm text-slate-400 mt-2 font-medium">Multiple CT slices supported</p>
                                        <div className="mt-8 px-4 py-2 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            {SUPPORTED_FORMATS}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="previews"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="absolute inset-0 p-8 flex flex-col"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="bg-sky-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                <Upload className="w-3 h-3" />
                                                {files.length} Slices Ready
                                            </div>
                                            <button
                                                onClick={() => setFiles([])}
                                                className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 overflow-y-auto custom-scrollbar flex-1 pb-4">
                                            {files.map((file, i) => (
                                                <div key={i} className="aspect-square rounded-xl overflow-hidden bg-black border border-slate-100 shadow-sm relative group/item">
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt={`Slice ${i}`}
                                                        className="w-full h-full object-cover opacity-80 group-hover/item:opacity-100 transition-opacity"
                                                    />
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
                            className="w-full flex items-center justify-center gap-3 py-5 rounded-[24px] bg-slate-900 text-white font-black text-lg hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-900/20 active:scale-95 group"
                        >
                            Run AI Analysis
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
