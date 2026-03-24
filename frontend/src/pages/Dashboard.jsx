import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { patientService, predictionService } from '../services/api';
import {
  Users, FileImage, ClipboardList, Plus, Loader2, AlertCircle,
  ChevronRight, Cpu, Activity, Stethoscope, TrendingUp, Brain,
  Search, Zap, ArrowUpRight, Calendar, ScanLine,
} from 'lucide-react';
import { formatConfidence } from '../utils/format';
import { cn } from '@/lib/utils';
import { AnimatedCounter } from '../components/ai';
import { SimpleBarChart } from '../components/ui';
import { EmptyStateLung, EmptyStatePatients } from '../components/illustrations';
import { motion } from 'framer-motion';

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' } }),
};

function StatCard({ icon: Icon, value, label, color, prefix, suffix, delay }) {
  const colorMap = {
    sky: {
      icon: 'text-purple-400',
      iconBg: 'rgba(124, 58, 237, 0.12)',
      iconBorder: 'rgba(124, 58, 237, 0.2)',
      value: 'text-purple-300',
      glow: 'rgba(124, 58, 237, 0.1)',
    },
    teal: {
      icon: 'text-cyan-400',
      iconBg: 'rgba(6, 182, 212, 0.12)',
      iconBorder: 'rgba(6, 182, 212, 0.2)',
      value: 'text-cyan-300',
      glow: 'rgba(6, 182, 212, 0.1)',
    },
    amber: {
      icon: 'text-amber-400',
      iconBg: 'rgba(245, 158, 11, 0.12)',
      iconBorder: 'rgba(245, 158, 11, 0.2)',
      value: 'text-amber-300',
      glow: 'rgba(245, 158, 11, 0.1)',
    },
    rose: {
      icon: 'text-rose-400',
      iconBg: 'rgba(239, 68, 68, 0.12)',
      iconBorder: 'rgba(239, 68, 68, 0.2)',
      value: 'text-rose-300',
      glow: 'rgba(239, 68, 68, 0.1)',
    },
  };
  const c = colorMap[color] || colorMap.sky;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={delay}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="rounded-2xl p-5 cursor-default transition-all duration-300"
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: `0 4px 16px rgba(0,0,0,0.3)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = c.iconBorder;
        e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), 0 0 30px ${c.glow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: c.iconBg, border: `1px solid ${c.iconBorder}` }}>
          <Icon className={cn('w-5 h-5', c.icon)} />
        </div>
        <ArrowUpRight className="w-4 h-4 text-gray-700" />
      </div>
      <p className={cn('text-2xl font-black tabular-nums', c.value)}>
        {prefix}{typeof value === 'number' ? <AnimatedCounter value={value} /> : value}{suffix}
      </p>
      <p className="text-sm text-gray-500 mt-1 font-medium">{label}</p>
    </motion.div>
  );
}

function getRiskColor(diagnosis) {
  const d = (diagnosis || '').toLowerCase();
  if (d.includes('tuberculosis') || d.includes('malignant') || d.includes('cancer')) return 'rose';
  if (d.includes('pneumonia') || d.includes('effusion')) return 'amber';
  return 'teal';
}

function getRiskBadge(confidence) {
  const c = typeof confidence === 'number' && confidence <= 1 ? confidence * 100 : confidence ?? 0;
  if (c >= 70) return { label: 'High', className: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
  if (c >= 40) return { label: 'Moderate', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
  return { label: 'Low', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: patients, isLoading: patientsLoading, isError: patientsError, refetch: refetchPatients } = useQuery({
    queryKey: ['patients'],
    queryFn: patientService.getAll,
    retry: (failureCount, error) => error?.response?.status !== 401,
  });

  const { data: predictions, isLoading: predictionsLoading } = useQuery({
    queryKey: ['all-predictions'],
    queryFn: predictionService.getAll,
  });

  const patientMap = useMemo(() => {
    if (!patients?.length) return {};
    const m = {};
    patients.forEach((p) => { m[p.id] = p.name; });
    return m;
  }, [patients]);

  const recentPredictions = useMemo(() => {
    if (!predictions?.length) return [];
    return [...predictions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
  }, [predictions]);

  const filteredRecent = useMemo(() => {
    if (!search.trim()) return recentPredictions;
    const q = search.toLowerCase();
    return recentPredictions.filter(
      (p) =>
        (p.final_diagnosis && p.final_diagnosis.toLowerCase().includes(q)) ||
        (patientMap[p.patient_id] && patientMap[p.patient_id].toLowerCase().includes(q)) ||
        String(p.id).includes(q)
    );
  }, [recentPredictions, search, patientMap]);

  const totalPredictions = predictions?.length ?? 0;
  const tbCases = useMemo(
    () => (predictions ?? []).filter((p) => (p.final_diagnosis || '').toLowerCase().includes('tuberculosis')).length,
    [predictions]
  );
  const pneumoniaCases = useMemo(
    () => (predictions ?? []).filter((p) => (p.final_diagnosis || '').toLowerCase().includes('pneumonia')).length,
    [predictions]
  );
  const diagnosisDistribution = useMemo(() => {
    const counts = {};
    (predictions ?? []).forEach((p) => {
      const d = p.final_diagnosis || 'Unknown';
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [predictions]);

  const casesPerWeek = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (5 - i) * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const count = (predictions ?? []).filter((p) => {
        const t = new Date(p.created_at).getTime();
        return t >= weekStart.getTime() && t < weekEnd.getTime();
      }).length;
      return { label: i === 5 ? 'This week' : `${5 - i}w ago`, value: count };
    });
  }, [predictions]);

  const aiAccuracy = 97.2;
  const patientList = patients ?? [];

  if (patientsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)', boxShadow: '0 8px 30px rgba(124,58,237,0.3)' }}>
          <Brain className="w-8 h-8 text-white animate-pulse" />
        </div>
        <p className="text-sm font-semibold text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (patientsError) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-200">Could not load dashboard</h2>
        <p className="mt-2 text-sm text-gray-500 max-w-sm">Failed to load patients. Check your connection and that the backend is running.</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={() => refetchPatients()}
            className="ps-btn-primary">Retry</button>
          <button type="button" onClick={() => navigate('/patients/add')}
            className="ps-btn-secondary"><Plus className="w-4 h-4" /> Add patient</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      {/* Ambient background glows for depth */}
      <div className="absolute top-[-100px] left-[-200px] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute top-[20%] right-[-100px] w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

      {/* Page Title */}
      <motion.div
        variants={cardVariants} initial="hidden" animate="visible" custom={0}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Clinical Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">AI diagnostic activity overview</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => navigate('/patients/add')}
            className="ps-btn-secondary text-sm"
          >
            <Plus className="w-4 h-4" /> Add Patient
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => navigate('/upload-scan')}
            className="ps-btn-primary text-sm"
          >
            <Zap className="w-4 h-4" /> Run Analysis
          </motion.button>
        </div>
      </motion.div>

      {/* Hero AI Status Banner */}
      <motion.div
        variants={cardVariants} initial="hidden" animate="visible" custom={1}
        className="relative overflow-hidden rounded-[24px] p-8 text-white group"
        style={{
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(6, 182, 212, 0.1) 50%, rgba(124, 58, 237, 0.08) 100%)',
          border: '1px solid rgba(124, 58, 237, 0.2)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 12px 40px rgba(0,0,0,0.5), 0 0 40px rgba(124, 58, 237, 0.05)',
        }}
      >
        {/* Glow effect that appears on hover */}
        <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/0 via-cyan-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-1000 pointer-events-none"></div>

        {/* Decorative elements */}
        <div className="absolute top-[-30%] right-[10%] w-64 h-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.1), transparent)' }}></div>
        <div className="absolute bottom-[-20%] right-[-5%] w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.08), transparent)' }}></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(124, 58, 237, 0.2)', border: '1px solid rgba(124, 58, 237, 0.3)' }}>
              <Brain className="w-7 h-7 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-xs font-bold text-purple-300 uppercase tracking-widest">Neural Engine Online</span>
              </div>
              <h2 className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AI System Ready</h2>
              <p className="text-gray-500 text-sm mt-0.5">Multi-modal CT & X-Ray analysis platform</p>
            </div>
          </div>
          <div className="flex items-center gap-6 lg:gap-8">
            {[
              { label: 'Active Analyses', value: totalPredictions, suffix: '' },
              { label: 'Model Accuracy', value: aiAccuracy, suffix: '%' },
              { label: 'Queue Status', value: 'Ready', suffix: '' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black tabular-nums text-white">
                  {typeof s.value === 'number' ? <><AnimatedCounter value={s.value} decimals={s.suffix === '%' ? 1 : 0} />{s.suffix}</> : s.value}
                </p>
                <p className="text-xs text-gray-500 font-semibold mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} value={patientList.length} label="Total Patients" color="sky" delay={2} />
        <StatCard icon={ScanLine} value={totalPredictions} label="Total Scans" color="teal" delay={3} />
        <StatCard icon={Activity} value={tbCases} label="TB Cases" color="amber" delay={4} />
        <StatCard icon={Stethoscope} value={pneumoniaCases} label="Pneumonia Cases" color="rose" delay={5} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases per week */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={6}
          className="rounded-2xl p-6"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-gray-200">Weekly Cases</h3>
          </div>
          <SimpleBarChart
            title=""
            data={casesPerWeek.length > 0 ? casesPerWeek : [{ label: 'No data', value: 0 }]}
          />
        </motion.div>

        {/* Diagnosis distribution */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={7}
          className="rounded-2xl p-6"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-gray-200">Diagnosis Distribution</h3>
          </div>
          <SimpleBarChart
            title=""
            data={diagnosisDistribution.length > 0 ? diagnosisDistribution : [{ label: 'No data', value: 0 }]}
          />
        </motion.div>
      </div>

      {/* No patients prompt */}
      {patientList.length === 0 && (
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={9}
          className="rounded-2xl p-6 flex items-center gap-4"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(6,182,212,0.06))',
            border: '1px solid rgba(124,58,237,0.12)',
          }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(124,58,237,0.12)' }}>
            <Users className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-200">No patients yet</p>
            <p className="text-sm text-gray-500">Add a patient to start recording predictions.</p>
          </div>
          <button type="button" onClick={() => navigate('/patients/add')} className="ps-btn-primary text-sm shrink-0">
            <Plus className="w-4 h-4" /> Add patient
          </button>
        </motion.div>
      )}

      {/* Recent Predictions Table */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={10}
        className="rounded-[24px] overflow-hidden backdrop-blur-xl"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.4)' }}>
        {/* Table header */}
        <div className="px-6 py-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.01]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.12)' }}>
              <ClipboardList className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="text-base font-bold text-gray-200">Recent Predictions</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-gray-500 ml-1"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              {filteredRecent.length}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type="search"
              placeholder="Search by patient or diagnosis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm rounded-xl text-gray-300 placeholder-gray-600 outline-none w-full sm:w-64 transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(124, 58, 237, 0.3)';
                e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {predictionsLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)' }}>
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            </div>
          ) : filteredRecent.length === 0 ? (
            <div className="py-16 text-center">
              <EmptyStateLung className="w-20 h-14 mx-auto text-gray-700 mb-3" />
              <p className="text-gray-600 text-sm font-medium">No predictions to show.</p>
              <button type="button" onClick={() => navigate('/upload')} className="mt-4 ps-btn-primary text-sm">
                <Zap className="w-4 h-4" /> Run first analysis
              </button>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/6" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider">Scan</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider">Diagnosis</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider">Confidence</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider">Risk</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {filteredRecent.map((row) => {
                  const risk = getRiskBadge(row.confidence);
                  return (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/predictions/${row.id}`)}
                      className="border-b border-white/4 hover:bg-purple-500/4 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-purple-300 shrink-0"
                            style={{ background: 'rgba(124,58,237,0.12)' }}>
                            {(patientMap[row.patient_id] ?? `#${row.patient_id}`).charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-300">{patientMap[row.patient_id] ?? `#${row.patient_id}`}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg text-gray-400"
                          style={{ background: 'rgba(255,255,255,0.05)' }}>
                          {row.model_outputs?.scan_type === 'ct' ? 'CT Scan' : row.model_outputs?.scan_type === 'xray' ? 'X-Ray' : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-200">{row.final_diagnosis ?? '—'}</td>
                      <td className="px-6 py-4 text-sm font-bold text-purple-400 tabular-nums">{formatConfidence(row.confidence)}</td>
                      <td className="px-6 py-4">
                        <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full border', risk.className)}>
                          {risk.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(row.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <ChevronRight className="w-4 h-4 text-gray-700" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}
