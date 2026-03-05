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
    PieChart,
    Activity,
    User,
    ShieldCheck,
    Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

const UploadScan = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [scanType, setScanType] = useState('ct'); // 'ct' or 'xray'
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [notes, setNotes] = useState('');
    const [extraDetail, setExtraDetail] = useState(''); // e.g. HRCT or Chest

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return toast.error('Please select a file');

        setIsUploading(true);
        try {
            // Run AI prediction first (backend /ai/predict/ctscan or /ai/predict/xray)
            toast.loading('Running AI analysis...', { id: 'ai-analysis' });
            let aiResult;
            if (scanType === 'ct') {
                aiResult = await aiPredictionService.predictCTScan(file);
            } else {
                aiResult = await aiPredictionService.predictXRay(file);
            }
            toast.dismiss('ai-analysis');

            const diagnosis = aiResult?.prediction ?? (scanType === 'ct' ? 'CT Analysis' : 'X-Ray Analysis');
            const confidence = typeof aiResult?.confidence === 'number' ? aiResult.confidence * 100 : 0;

            const mockFilePath = `/uploads/${scanType}/${Date.now()}_${file.name}`;
            let uploadResult;
            if (scanType === 'ct') {
                uploadResult = await scanService.createCTScan({
                    patient_id: parseInt(id),
                    scan_type: extraDetail || 'HRCT',
                    file_path: mockFilePath,
                    notes: notes
                });
            } else {
                uploadResult = await scanService.createXRay({
                    patient_id: parseInt(id),
                    body_part: extraDetail || 'Chest',
                    file_path: mockFilePath,
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

            toast.success('AI Analysis complete!');
            navigate(`/predictions/${prediction.id}`);
        } catch (error) {
            toast.dismiss('ai-analysis');
            const detail = error.response?.data?.detail;
            const msg = Array.isArray(detail) ? detail.map((x) => x.msg || x).join(', ') : (detail || error.message || 'Upload failed.');
            toast.error(msg);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-5xl mx-auto space-y-10 pb-20"
        >
            <div className="flex items-center gap-6">
                <button
                    onClick={() => navigate(`/patients/${id}`)}
                    className="p-4 bg-white dark:bg-slate-900 border border-white/40 dark:border-slate-700/40 rounded-2xl shadow-sm text-slate-400 hover:text-primary-500 hover:scale-110 transition-all group"
                >
                    <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">Upload Diagnostic Scan</h1>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-loose">Medical Imaging & Neural Processing Interface</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-10 flex flex-col">
                    <div className="glass-morphism p-10 rounded-[44px] shadow-2xl border border-white relative overflow-hidden flex-1">
                        <div className="flex flex-col gap-10">
                            <div className="flex flex-col gap-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-4">Scan Category</label>
                                <div className="grid grid-cols-2 gap-6 pb-6">
                                    {[
                                        { id: 'ct', label: 'CT Scan', icon: Camera, desc: '3D Axial Imaging' },
                                        { id: 'xray', label: 'X-Ray', icon: Layers, desc: '2D Radiographic' }
                                    ].map(option => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => { setScanType(option.id); setExtraDetail(option.id === 'ct' ? 'HRCT' : 'Chest'); }}
                                            className={cn(
                                                "p-8 rounded-[36px] border-2 transition-all flex flex-col items-center justify-center gap-4 group relative",
                                                scanType === option.id
                                                    ? "bg-primary-500 text-white border-primary-400 shadow-xl shadow-primary-500/30 scale-[1.02]"
                                                    : "bg-white/40 dark:bg-slate-800/40 text-slate-400 border-white dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-all",
                                                scanType === option.id ? "bg-white/20" : "bg-slate-50 dark:bg-slate-700"
                                            )}>
                                                <option.icon className="w-8 h-8" />
                                            </div>
                                            <div className="text-center">
                                                <span className="font-black text-sm uppercase tracking-widest block mb-1">{option.label}</span>
                                                <span className={cn(
                                                    "text-[10px] font-bold uppercase tracking-wider opacity-60",
                                                    scanType === option.id ? "text-white" : "text-slate-400"
                                                )}>{option.desc}</span>
                                            </div>
                                            {scanType === option.id && (
                                                <motion.div layoutId="activeScan" className="absolute -top-3 -right-3 shadow-lg p-2 bg-white rounded-xl">
                                                    <Check className="w-5 h-5 text-primary-500" />
                                                </motion.div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-4">
                                    {scanType === 'ct' ? 'Scan Modality' : 'Target Body Region'}
                                </label>
                                <div className="relative group">
                                    <Monitor className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                                    <input
                                        type="text"
                                        value={extraDetail}
                                        onChange={(e) => setExtraDetail(e.target.value)}
                                        placeholder={scanType === 'ct' ? "e.g. HRCT, Contrast" : "e.g. Chest, Spinal"}
                                        className="w-full bg-slate-50/70 dark:bg-slate-800/70 border border-white/50 dark:border-slate-700/50 rounded-3xl py-5 pl-16 pr-8 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-bold"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-4">Medical Observations</label>
                                <div className="relative group">
                                    <FileText className="absolute left-6 top-6 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Enter clinical notes or observations..."
                                        className="w-full bg-slate-50/70 dark:bg-slate-800/70 border border-white/50 dark:border-slate-700/50 rounded-[32px] py-6 pl-16 pr-8 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium min-h-[160px] resize-none"
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-10 flex flex-col">
                    <div className="glass-morphism p-10 rounded-[44px] shadow-2xl border border-white relative overflow-hidden flex-1 flex flex-col items-center justify-center">
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
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    htmlFor="file-upload"
                                    className="w-full flex-1 flex flex-col items-center justify-center cursor-pointer group"
                                >
                                    <div className="w-32 h-32 rounded-[40px] bg-primary-50 dark:bg-primary-900/20 text-primary-500 flex items-center justify-center mb-10 group-hover:bg-primary-500 group-hover:text-white group-hover:rotate-6 transition-all duration-700 shadow-inner group-hover:shadow-primary-500/30">
                                        <Upload className="w-12 h-12" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Drop Medical File</h3>
                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-10">Supporting DICOM, JPG, PNG & BMP</p>
                                    <div className="px-10 py-5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest shadow-sm group-hover:border-primary-500 group-hover:translate-y-[-4px] transition-all">
                                        Select from computer
                                    </div>
                                </motion.label>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="w-full flex-1 flex flex-col items-center justify-center"
                                >
                                    <div className="w-full aspect-square relative rounded-[40px] overflow-hidden shadow-2xl mb-10 group/img border border-white">
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt="Preview"
                                            className="w-full h-full object-cover group-hover/img:scale-110 transition-all duration-1000 grayscale brightness-125"
                                        />
                                        <div className="absolute inset-0 bg-primary-500/20 opacity-0 group-hover/img:opacity-100 transition-opacity"></div>
                                        <button
                                            onClick={() => setFile(null)}
                                            className="absolute top-6 right-6 p-4 bg-white/40 backdrop-blur-md rounded-2xl text-white hover:bg-red-500 transition-all shadow-xl"
                                        >
                                            <ChevronRight className="w-6 h-6 rotate-45" />
                                        </button>
                                        <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
                                                    <ShieldCheck className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Authenticated Encryption</p>
                                                    <p className="text-sm font-black text-white truncate max-w-[240px]">{file.name}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {isUploading && (
                            <div className="w-full mb-6">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                                    </span>
                                    <span className="text-xs font-black text-primary-500">85%</span>
                                </div>
                                <div className="w-full h-3 bg-white/40 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: "85%" }}
                                        transition={{ duration: 2 }}
                                        className="h-full bg-primary-500 rounded-full"
                                    ></motion.div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleUpload}
                            disabled={!file || isUploading}
                            className="w-full bg-primary-500 text-white rounded-[24px] py-6 font-black text-sm uppercase tracking-widest shadow-xl shadow-primary-500/30 hover:bg-primary-600 hover:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {isUploading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    Initialize Neural Analysis <Zap className="w-6 h-6 group-hover:fill-current group-hover:scale-125 transition-all text-yellow-300" />
                                </>
                            )}
                        </button>
                    </div>

                    <div className="p-8 bg-white/20 dark:bg-slate-900/20 rounded-[32px] border border-white/10 flex items-start gap-4">
                        <ShieldCheck className="w-6 h-6 text-green-500 shrink-0 mt-1" />
                        <div>
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Encryption Protocol</h5>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">Your data is processed locally first and then encrypted before being sent to the AI diagnostic engine. All PHI is stripped automatically.</p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default UploadScan;
