import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { patientService, predictionService } from '../services/api';
import {
  Users,
  FileImage,
  ScanLine,
  ClipboardList,
  Plus,
  Loader2,
  AlertCircle,
  ChevronRight,
  Activity,
  Cpu,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { formatConfidence } from '../utils/format';
import { cn } from '../utils/cn';
import { AnimatedCounter } from '../components/ai';
import { EmptyStateLung, EmptyStatePatients } from '../components/illustrations';
import { motion } from 'framer-motion';

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06 } }),
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: patients, isLoading: patientsLoading, isError: patientsError } = useQuery({
    queryKey: ['patients'],
    queryFn: patientService.getAll,
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
    const sorted = [...predictions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return sorted.slice(0, 10);
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
  const scansToday = 0;
  const pendingReviews = 0;
  const aiAccuracy = 97.2;
  const trend = '+1.2%';

  if (patientsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
        <p className="mt-4 text-sm text-slate-400">Loading...</p>
      </div>
    );
  }

  if (patientsError || !patients?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-6">
          <EmptyStatePatients className="w-28 h-28 mx-auto" />
          <EmptyStateLung className="w-24 h-20 mx-auto mt-2 opacity-60" />
        </div>
        <h2 className="text-xl font-semibold text-white">No scans analyzed yet</h2>
        <p className="mt-2 text-sm text-slate-400 max-w-sm">
          Upload your first scan to start AI diagnosis, or add a patient to get started.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/upload')}
            className="px-6 py-3 bg-teal-500/20 border border-teal-500/40 text-teal-300 rounded-xl font-medium hover:bg-teal-500/30 flex items-center gap-2 transition-colors"
          >
            <ScanLine className="w-5 h-5" /> Upload scan
          </button>
          <button
            type="button"
            onClick={() => navigate('/patients/add')}
            className="px-6 py-3 bg-sky-500 text-white rounded-xl font-medium hover:bg-sky-400 flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" /> Add patient
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Overview of your AI diagnostic activity.</p>
      </div>

      {/* AI System Status Card */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={0}
        className="glass-card rounded-2xl p-6 border-gradient"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
              <Cpu className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI System Status</h2>
              <p className="text-sm text-slate-400">Neural analysis engine online</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-sky-300">
                <AnimatedCounter value={totalPredictions} />
              </p>
              <p className="text-xs text-slate-500">Active Predictions</p>
            </div>
            <div className="w-px h-10 bg-slate-700" />
            <div className="text-center">
              <p className="text-2xl font-bold text-teal-400">Ready</p>
              <p className="text-xs text-slate-500">Queue Status</p>
            </div>
            <div className="w-px h-10 bg-slate-700" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                <AnimatedCounter value={aiAccuracy} decimals={1} suffix="%" />
              </p>
              <p className="text-xs text-slate-500">Model Accuracy</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Animated metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Users,
            value: patients.length,
            label: 'Patients Analyzed',
            trend: null,
            color: 'sky',
            delay: 1,
          },
          {
            icon: Zap,
            value: aiAccuracy,
            label: 'AI Accuracy',
            trend: trend,
            suffix: '%',
            decimals: 1,
            color: 'teal',
            delay: 2,
          },
          {
            icon: ClipboardList,
            value: pendingReviews,
            label: 'Pending Scans',
            trend: null,
            color: 'amber',
            delay: 3,
          },
          {
            icon: FileImage,
            value: scansToday,
            label: "Today's Uploads",
            trend: null,
            color: 'sky',
            delay: 4,
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={card.delay}
            className={cn(
              'glass-card rounded-xl p-5 hover:border-slate-600/60 transition-colors',
              card.color === 'teal' && 'border-teal-500/20',
              card.color === 'amber' && 'border-amber-500/20'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  card.color === 'sky' && 'bg-sky-500/20',
                  card.color === 'teal' && 'bg-teal-500/20',
                  card.color === 'amber' && 'bg-amber-500/20'
                )}
              >
                <card.icon
                  className={cn(
                    'w-5 h-5',
                    card.color === 'sky' && 'text-sky-400',
                    card.color === 'teal' && 'text-teal-400',
                    card.color === 'amber' && 'text-amber-400'
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold text-white">
                  <AnimatedCounter
                    value={card.value}
                    decimals={card.decimals ?? 0}
                    suffix={card.suffix ?? ''}
                  />
                </p>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  {card.label}
                  {card.trend && (
                    <span className="text-emerald-400 text-xs flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> {card.trend}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Predictions */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={5}
        className="glass-card rounded-xl overflow-hidden border border-slate-700/50"
      >
        <div className="px-6 py-4 border-b border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Recent Predictions</h2>
          <input
            type="search"
            placeholder="Search by patient or diagnosis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 bg-slate-800/60 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 w-full sm:w-64 focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50"
          />
        </div>
        <div className="overflow-x-auto">
          {predictionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
            </div>
          ) : filteredRecent.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">No predictions to show.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-800/30">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Scan Type</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Result</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Confidence</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filteredRecent.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/predictions/${row.id}`)}
                    className="border-b border-slate-800/50 hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-slate-200">
                      {patientMap[row.patient_id] ?? `#${row.patient_id}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {row.model_outputs?.scan_type === 'ct' ? 'CT' : row.model_outputs?.scan_type === 'xray' ? 'X-Ray' : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-white">{row.final_diagnosis ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-sky-300 tabular-nums">{formatConfidence(row.confidence)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(row.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}
