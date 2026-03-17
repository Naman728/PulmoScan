import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scanService, predictionService, aiPredictionService } from '../services/api';
import {
    ArrowLeft,
    Upload,
    Check,
    Loader2,
    Camera,
    Layers,
    FileText,
    ChevronRight,
    Monitor,
    Zap,
    Shield,
    Info,
    X,
    Scan,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import lungIllustration from '../assets/illustrations/lung_scan_upload.png';

const UploadScan = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [scanType, setScanType] = useState('ct'); // 'ct' or 'xray'
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [notes, setNotes] = useState('');
    const [extraDetail, setExtraDetail] = useState(scanType === 'ct' ? 'HRCT' : 'Chest');

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return toast.error('Please select a file');

        setIsUploading(true);
        const toastId = toast.loading('Running AI Neural Analysis...');
        try {
            // Run AI prediction first
            let aiResult;
            if (scanType === 'ct') {
                aiResult = await aiPredictionService.predictCTScan(file);
            } else {
                aiResult = await aiPredictionService.predictXRay(file);
            }

            const diagnosis = aiResult?.prediction ?? (scanType === 'ct' ? 'CT Analysis' : 'X-Ray Analysis');
            const confidenceRaw = aiResult?.confidence ?? 0;
            const confidence = typeof confidenceRaw === 'number' && confidenceRaw <= 1 ? confidenceRaw * 100 : confidenceRaw;

            const filePath = aiResult?.image_path ?? `/uploads/${scanType}/${Date.now()}_${file.name}`;

            let uploadResult;
            if (scanType === 'ct') {
                uploadResult = await scanService.createCTScan({
                    patient_id: parseInt(id),
                    scan_type: extraDetail || 'HRCT',
                    file_path: filePath,
                    notes: notes
                });
            } else {
                uploadResult = await scanService.createXRay({
                    patient_id: parseInt(id),
                    body_part: extraDetail || 'Chest',
                    file_path: filePath,
                    notes: notes
                });
            }

            const urgency = confidence >= 70 ? 'High' : confidence >= 40 ? 'Medium' : 'Low';
            const prediction = await predictionService.create({
                patient_id: parseInt(id),
                risk_score: confidence / 100,
                final_diagnosis: diagnosis,
                confidence: Math.round(confidence),
                urgency_level: urgency,
                model_outputs: { scan_id: uploadResult.id, scan_type: scanType }
            });

            toast.success('AI Analysis complete!', { id: toastId });
            navigate(`/predictions/${prediction.id}`);
        } catch (error) {
            const detail = error.response?.data?.detail;
            const msg = Array.isArray(detail) ? detail.map((x) => x.msg || x).join(', ') : (detail || error.message || 'Upload failed.');
            toast.error(msg, { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="ps-btn-secondary text-sm gap-1.5"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Run Diagnostic Scan</h1>
                        <p className="text-slate-500 mt-1 text-sm">Upload medical imaging for AI neural processing</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* ── Left Column: Config ── */}
                <div className="lg:col-span-5 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm"
                    >
                        {/* Scan Category */}
                        <div className="space-y-4 mb-8">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                <Scan className="w-3.5 h-3.5" /> Scan Category
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'ct', label: 'CT Scan', icon: Camera, desc: '3D Axial' },
                                    { id: 'xray', label: 'X-Ray', icon: Layers, desc: '2D Radiograph' }
                                ].map(option => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => {
                                            setScanType(option.id);
                                            setExtraDetail(option.id === 'ct' ? 'HRCT' : 'Chest');
                                        }}
                                        className={cn(
                                            "relative p-4 rounded-2xl border-2 transition-all text-left overflow-hidden group",
                                            scanType === option.id
                                                ? "bg-sky-50 border-sky-500 shadow-sm"
                                                : "bg-white border-slate-100 hover:border-slate-300"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all",
                                            scanType === option.id ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-500"
                                        )}>
                                            <option.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className={cn("text-sm font-bold", scanType === option.id ? "text-sky-700" : "text-slate-700")}>{option.label}</p>
                                            <p className="text-[10px] text-slate-400 font-semibold uppercase">{option.desc}</p>
                                        </div>
                                        {scanType === option.id && (
                                            <div className="absolute top-3 right-3">
                                                <div className="w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center">
                                                    <Check className="w-2.5 h-2.5 text-white" />
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Modality Detail */}
                        <div className="space-y-4 mb-6">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                                {scanType === 'ct' ? 'Scan Modality' : 'Body Region'}
                            </label>
                            <div className="relative">
                                <Monitor className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={extraDetail}
                                    onChange={(e) => setExtraDetail(e.target.value)}
                                    placeholder={scanType === 'ct' ? "e.g. HRCT, Contrast" : "e.g. Chest, Spinal"}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:border-sky-400 transition-all font-semibold"
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Clinical Observations</label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Enter case-specific clinical notes..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:border-sky-400 transition-all font-medium min-h-[140px] resize-none"
                                ></textarea>
                            </div>
                        </div>
                    </motion.div>

                    {/* Security Badge */}
                    <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 flex items-start gap-4">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 border border-emerald-400 shadow-sm">
                            <Shield className="w-4.5 h-4.5 text-white" />
                        </div>
                        <div>
                            <h5 className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1">Encrypted AI Pipeline</h5>
                            <p className="text-xs font-medium text-emerald-600/80 leading-relaxed">Medical imaging is processed via secure neural nodes. Patient identity is anonymized before cloud-based inference.</p>
                        </div>
                    </div>
                </div>

                {/* ── Right Column: File Upload ── */}
                <div className="lg:col-span-7 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col items-center justify-center min-h-[500px]"
                    >
                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            accept="image/*,.dcm"
                            onChange={handleFileChange}
                        />

                        <AnimatePresence mode="wait">
                            {!file ? (
                                <motion.label
                                    key="empty"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    htmlFor="file-upload"
                                    className="w-full flex-1 flex flex-col items-center justify-center cursor-pointer group text-center"
                                >
                                    <div className="relative mb-8">
                                        <div className="absolute inset-0 bg-sky-200 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                        <div className="relative w-32 h-32 rounded-[40px] bg-sky-50 text-sky-500 flex items-center justify-center border border-sky-100 shadow-inner group-hover:scale-110 group-hover:bg-sky-500 group-hover:text-white transition-all duration-500">
                                            <Upload className="w-10 h-10" />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-2">Initialize AI Diagnostics</h3>
                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8">Supporting DICOM, JPG, PNG & BMP</p>

                                    <div className="flex flex-col items-center gap-4">
                                        <div className="px-8 py-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-700 font-bold text-xs uppercase tracking-widest shadow-sm group-hover:border-sky-500 group-hover:-translate-y-1 transition-all">
                                            Select Clinical Scan
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                            <Info className="w-3 h-3" /> Drag & drop imaging data here
                                        </div>
                                    </div>

                                    {/* Illustration in background/bottom */}
                                    <img src={lungIllustration} alt="Lung scan illustration" className="w-64 h-auto opacity-10 absolute bottom-[-40px] right-[-40px] pointer-events-none" />
                                </motion.label>
                            ) : (
                                <motion.div
                                    key="preview"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="w-full flex-1 flex flex-col"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
                                                <Scan className="w-4 h-4 text-sky-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 truncate max-w-[200px]">{file.name}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Selected for analysis</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setFile(null)}
                                            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex-1 relative rounded-2xl overflow-hidden bg-slate-950 shadow-2xl group/img border border-slate-100 min-h-[300px] flex items-center justify-center p-4 mb-6 text-white overflow-hidden">
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt="Scan Preview"
                                            className="w-full h-full object-contain filter grayscale brightness-110"
                                        />
                                        <div className="absolute inset-0 bg-sky-500/10 mix-blend-overlay"></div>
                                        {/* AI HUD Overlay decorative elements */}
                                        <div className="absolute top-4 left-4 w-4 h-4 border-l-2 border-t-2 border-sky-400/50"></div>
                                        <div className="absolute top-4 right-4 w-4 h-4 border-r-2 border-t-2 border-sky-400/50"></div>
                                        <div className="absolute bottom-4 left-4 w-4 h-4 border-l-2 border-b-2 border-sky-400/50"></div>
                                        <div className="absolute bottom-4 right-4 w-4 h-4 border-r-2 border-b-2 border-sky-400/50"></div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            onClick={handleUpload}
                            disabled={!file || isUploading}
                            className={cn(
                                "w-full rounded-2xl py-4 font-black text-sm uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group",
                                isUploading ? "bg-slate-400 text-white" : "bg-gradient-to-r from-sky-600 to-sky-500 text-white hover:shadow-sky-200 hover:-translate-y-0.5"
                            )}
                        >
                            {isUploading ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Neural Processing...</>
                            ) : (
                                <>Run AI Analysis <Zap className="w-5 h-5 group-hover:fill-amber-300 group-hover:scale-125 transition-all text-white" /></>
                            )}
                        </button>

                        <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                            <Activity className="w-3.5 h-3.5 text-slate-400" />
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Engine: PULMOSCAN-V2.4 · READY</p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default UploadScan;
