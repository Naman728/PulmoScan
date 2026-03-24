import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { patientService, scanService, predictionService } from '../services/api';
import {
  ArrowLeft, Upload, Camera, Layers, Loader2, AlertCircle, ChevronRight, FileText, Activity
} from 'lucide-react';
import { formatConfidence } from '../utils/format';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: patient, isLoading, isError } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientService.getOne(id),
  });

  const { data: ctScans } = useQuery({
    queryKey: ['ct-scans', id],
    queryFn: () => scanService.getPatientCTScans(id),
    enabled: !!id,
  });

  const { data: xrays } = useQuery({
    queryKey: ['xrays', id],
    queryFn: () => scanService.getPatientXRays(id),
    enabled: !!id,
  });

  const { data: predictions } = useQuery({
    queryKey: ['predictions', id],
    queryFn: () => predictionService.getPatientPredictions(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        <p className="mt-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Loading records...</p>
      </div>
    );
  }

  if (isError || !patient) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Patient not found</h2>
        <button type="button" onClick={() => navigate('/patients')} className="ps-btn-primary mt-4">
          Back to patients
        </button>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-12 relative w-full overflow-hidden">
      {/* Ambient background glows for depth */}
      <div className="absolute top-[0%] left-[-200px] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[20%] right-[-100px] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-5">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => navigate('/patients')}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.4), rgba(6, 182, 212, 0.4))', border: '1px solid rgba(124, 58, 237, 0.5)', boxShadow: '0 0 20px rgba(124,58,237,0.2)' }}>
              {patient.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-black text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{patient.name}</h1>
              <p className="text-xs font-mono text-gray-500">#{String(patient.id).padStart(4, '0')}</p>
            </div>
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => navigate(`/patients/${id}/upload`)} className="ps-btn-primary gap-2 text-sm shadow-[0_4px_20px_rgba(6,182,212,0.3)]">
          <Upload className="w-4 h-4" /> Run New Scan
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Column */}
        <motion.div variants={itemVariants} className="md:col-span-1 space-y-6">
          <div className="rounded-3xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Patient Bio</h2>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Age</p>
                <p className="text-sm font-medium text-gray-200">{patient.age ?? '—'}</p>
              </div>
              <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Gender</p>
                <p className="text-sm font-medium text-gray-200">{patient.gender ?? '—'}</p>
              </div>
              <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Registration Date</p>
                <p className="text-sm font-medium text-gray-200">{new Date(patient.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Doctor Notes</h2>
            <textarea
              placeholder="Add clinical notes..."
              className="w-full min-h-[140px] px-4 py-3 rounded-2xl text-gray-300 placeholder-gray-600 text-sm resize-none outline-none focus:border-cyan-500 transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              readOnly
            />
          </div>
        </motion.div>

        {/* Imaging Data Column */}
        <motion.div variants={itemVariants} className="md:col-span-2 space-y-6">
          
          {/* Recent AI Predictions */}
          <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="absolute top-0 right-0 p-6 opacity-20 pointer-events-none">
              <Activity className="w-24 h-24 text-cyan-400" />
            </div>
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> Diagnostic History
            </h2>
            
            {!predictions?.length ? (
              <div className="text-center py-10 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.04)' }}>
                <Activity className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-400">No predictions recorded.</p>
                <p className="text-xs text-gray-500 mt-1">Run a new scan to generate a report.</p>
              </div>
            ) : (
              <div className="space-y-3 relative z-10">
                {predictions.map((pred) => {
                  const isHigh = pred.urgency_level === 'High';
                  const isMid = pred.urgency_level === 'Medium';
                  const isLow = !isHigh && !isMid;
                  
                  return (
                    <button
                      key={pred.id}
                      type="button"
                      onClick={() => navigate(`/predictions/${pred.id}`)}
                      className="w-full text-left flex items-center gap-4 p-4 rounded-2xl border transition-all hover:-translate-y-1 group"
                      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                        isHigh ? "bg-rose-500/10 text-rose-400 border-rose-500/20 group-hover:bg-rose-500/20" :
                        isMid ? "bg-amber-500/10 text-amber-400 border-amber-500/20 group-hover:bg-amber-500/20" :
                        "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 group-hover:bg-cyan-500/20"
                      )}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-200 text-base truncate mb-1">{pred.final_diagnosis ?? '—'}</p>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                          <span className={isHigh ? 'text-rose-400' : isMid ? 'text-amber-400' : 'text-cyan-400'}>
                            {formatConfidence(pred.confidence)} Conf
                          </span>
                          <span className="text-gray-600">•</span>
                          <span className="text-gray-500">{new Date(pred.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className={cn("px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border", 
                        isHigh ? "bg-rose-500/10 text-rose-400 border-rose-500/30" :
                        isMid ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                        "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                      )}>
                        {pred.urgency_level || 'Low'}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-600 shrink-0 group-hover:text-white transition-colors" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Raw Scans Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
            <div className="rounded-[24px] p-6 border backdrop-blur-xl" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-teal-400 drop-shadow-[0_0_8px_rgba(20,184,166,0.6)]" />
                  </div>
                  <span className="font-bold text-base text-gray-200" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>CT Scans</span>
                </div>
                <span className="text-xs font-black bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-teal-400">{ctScans?.length ?? 0}</span>
              </div>
              {ctScans?.length > 0 ? (
                <ul className="space-y-2">
                  {ctScans.slice(0, 3).map((s) => (
                    <li key={s.id} className="text-xs font-medium text-gray-400 flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <span>{s.scan_type ?? 'CT'}</span>
                      <span className="text-gray-500 font-mono">{new Date(s.created_at || s.id).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-600 font-medium">No CT scans uploaded.</p>
              )}
            </div>

            <div className="rounded-[24px] p-6 border backdrop-blur-xl" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-purple-400 drop-shadow-[0_0_8px_rgba(124,58,237,0.6)]" />
                  </div>
                  <span className="font-bold text-base text-gray-200" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>X-Rays</span>
                </div>
                <span className="text-xs font-black bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-purple-400">{xrays?.length ?? 0}</span>
              </div>
              {xrays?.length > 0 ? (
                <ul className="space-y-2">
                  {xrays.slice(0, 3).map((s) => (
                    <li key={s.id} className="text-xs font-medium text-gray-400 flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <span>{s.body_part ?? 'X-Ray'}</span>
                      <span className="text-gray-500 font-mono">{new Date(s.created_at || s.id).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-600 font-medium">No X-Ray scans uploaded.</p>
              )}
            </div>
          </div>

        </motion.div>
      </div>
    </motion.div>
  );
}
