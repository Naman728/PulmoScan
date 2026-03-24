import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scanService, predictionService, aiPredictionService } from '../services/api';
import {
  ArrowLeft, Upload, Check, Loader2, Camera, Layers, FileText, Monitor, Zap, Shield, Info, X, Scan,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import lungIllustration from '../assets/illustrations/lung_scan_upload.png';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function UploadScan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scanType, setScanType] = useState('ct');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [notes, setNotes] = useState('');
  const [extraDetail, setExtraDetail] = useState('HRCT');

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
      let aiResult = scanType === 'ct'
        ? await aiPredictionService.predictCTScan(file)
        : await aiPredictionService.predictXRay(file);

      const diagnosis = aiResult?.prediction ?? (scanType === 'ct' ? 'CT Analysis' : 'X-Ray Analysis');
      const confidenceRaw = aiResult?.confidence ?? 0;
      const confidence = typeof confidenceRaw === 'number' && confidenceRaw <= 1 ? confidenceRaw * 100 : confidenceRaw;
      const filePath = aiResult?.image_path ?? `/uploads/${scanType}/${Date.now()}_${file.name}`;

      let uploadResult = scanType === 'ct'
        ? await scanService.createCTScan({ patient_id: parseInt(id), scan_type: extraDetail || 'HRCT', file_path: filePath, notes })
        : await scanService.createXRay({ patient_id: parseInt(id), body_part: extraDetail || 'Chest', file_path: filePath, notes });

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
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-12">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Run Diagnostic Scan</h1>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mt-0.5">Upload medical imaging for AI neural processing</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Left Column: Config ── */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div variants={itemVariants} className="rounded-3xl p-6 relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            
            {/* Scan Category */}
            <div className="space-y-4 mb-8 relative z-10">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-2">
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
                      "relative p-4 rounded-2xl border transition-all text-left overflow-hidden group h-32 flex flex-col justify-end",
                      scanType === option.id
                        ? "bg-cyan-900/20 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                        : "bg-white/5 border-white/5 hover:border-white/20"
                    )}
                  >
                    <div className={cn(
                      "absolute top-4 left-4 w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      scanType === option.id ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-gray-400"
                    )}>
                      <option.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={cn("text-sm font-bold", scanType === option.id ? "text-cyan-400" : "text-gray-300")}>{option.label}</p>
                      <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{option.desc}</p>
                    </div>
                    {scanType === option.id && (
                      <div className="absolute top-4 right-4">
                        <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Modality Detail */}
            <div className="space-y-4 mb-6 relative z-10">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                {scanType === 'ct' ? 'Scan Modality' : 'Body Region'}
              </label>
              <div className="relative">
                <Monitor className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={extraDetail}
                  onChange={(e) => setExtraDetail(e.target.value)}
                  placeholder={scanType === 'ct' ? "e.g. HRCT, Contrast" : "e.g. Chest, Spinal"}
                  className="w-full rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all font-medium border focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] focus:bg-cyan-950/20"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4 relative z-10">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Clinical Observations</label>
              <div className="relative">
                <FileText className="absolute left-4 top-4 w-4 h-4 text-gray-500" />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter case-specific clinical notes..."
                  className="w-full rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all font-medium min-h-[140px] resize-none border focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] focus:bg-cyan-950/20"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
                />
              </div>
            </div>
          </motion.div>

          {/* Security Badge */}
          <motion.div variants={itemVariants} className="p-5 rounded-2xl border flex items-start gap-4"
            style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.05), rgba(5,150,105,0.1))', borderColor: 'rgba(16,185,129,0.2)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
              style={{ background: 'rgba(16,185,129,0.2)', borderColor: 'rgba(16,185,129,0.3)', boxShadow: '0 0 15px rgba(16,185,129,0.2)' }}>
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Encrypted AI Pipeline
              </h5>
              <p className="text-xs font-medium text-emerald-500/80 leading-relaxed">Medical imaging is processed via secure neural nodes. Patient identity is anonymized before cloud-based inference.</p>
            </div>
          </motion.div>
        </div>

        {/* ── Right Column: File Upload ── */}
        <div className="lg:col-span-7 space-y-6">
          <motion.div variants={itemVariants}
            className="rounded-3xl p-8 border relative overflow-hidden flex flex-col items-center justify-center min-h-[500px]"
            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
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
                  className="w-full flex-1 flex flex-col items-center justify-center cursor-pointer group text-center relative z-10"
                >
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-cyan-500 rounded-full blur-[50px] opacity-10 group-hover:opacity-30 transition-opacity duration-700"></div>
                    <div className="relative w-32 h-32 rounded-full border border-dashed flex items-center justify-center transition-all duration-500 group-hover:scale-110"
                      style={{ background: 'rgba(6,182,212,0.05)', borderColor: 'rgba(6,182,212,0.3)' }}>
                      <div className="w-20 h-20 rounded-full flex items-center justify-center transition-colors"
                        style={{ background: 'rgba(6,182,212,0.1)' }}>
                        <Upload className="w-8 h-8 text-cyan-400" />
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Initialize AI Diagnostics</h3>
                  <p className="text-cyan-600/50 font-bold text-[10px] uppercase tracking-widest mb-8">Supporting DICOM, JPG, PNG & BMP</p>

                  <div className="flex flex-col items-center gap-4">
                    <div className="px-8 py-4 rounded-xl text-white font-bold text-xs uppercase tracking-widest transition-all group-hover:-translate-y-1"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      Select Clinical Scan
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                      <Info className="w-3.5 h-3.5" /> Drag & drop imaging data here
                    </div>
                  </div>

                  {lungIllustration && (
                    <img src={lungIllustration} alt="" className="w-64 h-auto opacity-5 absolute bottom-[-20px] right-[-20px] pointer-events-none filter grayscale" />
                  )}
                </motion.label>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full flex-1 flex flex-col relative z-10"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center border"
                        style={{ background: 'rgba(6,182,212,0.1)', borderColor: 'rgba(6,182,212,0.2)' }}>
                        <Scan className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white truncate max-w-[200px]">{file.name}</p>
                        <p className="text-[10px] text-cyan-500 uppercase font-black tracking-widest">Selected for analysis</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="w-9 h-9 rounded-full text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all flex items-center justify-center border border-transparent hover:border-rose-500/20"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 relative rounded-2xl overflow-hidden shadow-2xl border min-h-[300px] flex items-center justify-center p-4 mb-6"
                    style={{ background: '#0A0A0F', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Scan Preview"
                      className="w-full h-full object-contain filter grayscale brightness-110 relative z-10"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-purple-500/10 mix-blend-overlay z-20" />
                    {/* HUD lines */}
                    <div className="absolute top-4 left-4 w-4 h-4 border-l-2 border-t-2 border-cyan-500/50 z-30" />
                    <div className="absolute top-4 right-4 w-4 h-4 border-r-2 border-t-2 border-cyan-500/50 z-30" />
                    <div className="absolute bottom-4 left-4 w-4 h-4 border-l-2 border-b-2 border-cyan-500/50 z-30" />
                    <div className="absolute bottom-4 right-4 w-4 h-4 border-r-2 border-b-2 border-cyan-500/50 z-30" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="w-full relative z-10">
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className={cn(
                  "w-full rounded-2xl py-4 font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden",
                  isUploading ? "bg-white/10 text-white" : ""
                )}
                style={!isUploading ? {
                  background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
                  boxShadow: '0 8px 25px rgba(124, 58, 237, 0.3)',
                  color: '#fff'
                } : {}}
              >
                {!isUploading && <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />}
                {isUploading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Neural Processing...</>
                ) : (
                  <>Run AI Analysis <Zap className="w-5 h-5 group-hover:text-amber-300 group-hover:scale-125 transition-all text-white" /></>
                )}
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Activity className="w-3.5 h-3.5 text-gray-500" />
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Engine: PULMOSCAN-V3.0 · READY</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
