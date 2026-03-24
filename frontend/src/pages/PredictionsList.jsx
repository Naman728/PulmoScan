import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { predictionService, reportService, patientService } from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Loader2, ChevronRight, AlertCircle, ExternalLink, FileDown,
  Filter, Calendar, Brain, Activity, FilterX, ClipboardList, Scan
} from 'lucide-react';
import { formatConfidence } from '../utils/format';
import { cn } from '@/lib/utils';
import { EmptyStateLung } from '../components/illustrations';
import { motion } from 'framer-motion';

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4, ease: 'easeOut' } }),
};

export default function PredictionsList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('');
  const [filterDiagnosis, setFilterDiagnosis] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const isReportsPage = location.pathname === '/reports';

  const { data: predictionsRaw, isLoading, isError: predictionsError, refetch: refetchPredictions } = useQuery({
    queryKey: isReportsPage ? ['all-reports'] : ['all-predictions'],
    queryFn: isReportsPage ? reportService.getAll : predictionService.getAll,
    retry: (failureCount, error) => error?.response?.status !== 401,
  });

  const predictions = useMemo(() => {
    if (!predictionsRaw) return [];
    if (!isReportsPage) return predictionsRaw;
    return predictionsRaw.map((r) => ({
      id: r.prediction_id ?? r.id,
      report_id: r.id,
      patient_id: r.patient_id,
      final_diagnosis: r.diagnosis,
      confidence: r.confidence != null ? (r.confidence <= 1 ? r.confidence * 100 : r.confidence) : null,
      urgency_level: r.confidence != null ? (r.confidence >= 70 ? 'High' : r.confidence >= 40 ? 'Medium' : 'Low') : 'Low',
      created_at: r.created_at,
      model_outputs: { scan_type: r.scan_type === 'CT' ? 'ct' : 'xray' },
      review_status: 'Completed',
    }));
  }, [predictionsRaw, isReportsPage]);

  const { data: patients, isError: patientsError, refetch: refetchPatients } = useQuery({
    queryKey: ['patients'],
    queryFn: patientService.getAll,
    retry: (failureCount, error) => error?.response?.status !== 401,
  });

  const patientMap = useMemo(() => {
    if (!patients?.length) return {};
    const m = {};
    patients.forEach((p) => { m[p.id] = p.name; });
    return m;
  }, [patients]);

  const diagnosisOptions = useMemo(() => {
    const set = new Set();
    predictions.forEach((p) => set.add(p.final_diagnosis || 'Unknown'));
    return ['', ...Array.from(set).sort()];
  }, [predictions]);

  const filtered = useMemo(() => {
    let list = [...predictions];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.final_diagnosis && p.final_diagnosis.toLowerCase().includes(q)) ||
          (patientMap[p.patient_id] && patientMap[p.patient_id].toLowerCase().includes(q)) ||
          String(p.id).includes(q)
      );
    }
    if (filterRisk) {
      list = list.filter((p) => (p.urgency_level || '').toLowerCase() === filterRisk.toLowerCase());
    }
    if (filterDiagnosis) {
      list = list.filter((p) => (p.final_diagnosis || '') === filterDiagnosis);
    }
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      from.setHours(0, 0, 0, 0);
      list = list.filter((p) => new Date(p.created_at) >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter((p) => new Date(p.created_at) <= to);
    }
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [predictions, search, filterRisk, filterDiagnosis, filterDateFrom, filterDateTo, patientMap]);

  const clearFilters = () => {
    setSearch('');
    setFilterRisk('');
    setFilterDiagnosis('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const hasActiveFilters = search || filterRisk || filterDiagnosis || filterDateFrom || filterDateTo;

  return (
    <div className="space-y-8 pb-12 relative">
      {/* Ambient background glows for depth */}
      <div className="absolute top-[10%] left-[-200px] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[20%] right-[-100px] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

      {/* Header */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {isReportsPage ? 'Clinical Reports' : 'AI Prediction Logs'}
          </h1>
          <p className="text-gray-400 mt-1 text-sm font-medium">
            {isReportsPage
              ? 'Comprehensive history of diagnostic imaging reports'
              : 'Neural analysis logs for all patient CT scan and X-Ray studies'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "ps-btn-secondary text-sm gap-1.5 transition-all overflow-hidden relative",
              showFilters && "border-cyan-500/50 bg-cyan-900/20 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-white"
            )}
          >
            {hasActiveFilters && <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0.8)]" />}
            <Filter className="w-4 h-4" /> Filters
          </button>
          {!isReportsPage && (
            <button
              type="button"
              onClick={() => navigate('/upload-scan')}
              className="ps-btn-primary text-sm gap-1.5"
            >
              <Scan className="w-4 h-4" /> Run Analysis
            </button>
          )}
        </div>
      </motion.div>

      {/* Filters Expanded */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          className="rounded-3xl p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Search Keywords</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="search"
                placeholder="Patient or diagnosis..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-white placeholder-gray-600 text-sm focus:border-cyan-500 transition-all outline-none border focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] focus:bg-cyan-950/20"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Risk Severity</label>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-gray-300 text-sm focus:border-cyan-500 outline-none transition-all border focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] focus:bg-cyan-950/20 appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em]"
              style={{ background: 'rgba(255,255,255,0.03) url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <option value="" className="bg-gray-900 text-gray-200">All Risk Levels</option>
              <option value="low" className="bg-gray-900 text-gray-200">Low Risk</option>
              <option value="medium" className="bg-gray-900 text-gray-200">Moderate Risk</option>
              <option value="high" className="bg-gray-900 text-gray-200">High Risk</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Diagnostic Classification</label>
            <select
              value={filterDiagnosis}
              onChange={(e) => setFilterDiagnosis(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-gray-300 text-sm focus:border-cyan-500 outline-none transition-all border focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] focus:bg-cyan-950/20 appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em]"
              style={{ background: 'rgba(255,255,255,0.03) url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <option value="" className="bg-gray-900 text-gray-200">All Diagnoses</option>
              {diagnosisOptions.filter(Boolean).map((d) => (
                <option key={d} value={d} className="bg-gray-900 text-gray-200">{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Date Range</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full pl-9 pr-2 py-2.5 rounded-xl text-gray-300 text-sm focus:border-cyan-500 outline-none transition-all border focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] focus:bg-cyan-950/20 custom-calendar-icon"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
                />
              </div>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 border hover:border-rose-500/50 hover:bg-rose-500/10 text-gray-400 hover:text-rose-400"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
                title="Clear filters"
              >
                <FilterX className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}
        className="rounded-[24px] border overflow-hidden backdrop-blur-xl"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 30px rgba(0,0,0,0.4)' }}
      >
        {predictionsError || patientsError ? (
          <div className="flex flex-col items-center justify-center py-32 text-center px-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
              <AlertCircle className="w-8 h-8 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)] rounded-full" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Database Connection Failed</h2>
            <p className="mt-2 text-sm text-gray-400 max-w-sm">Unable to sync platform data. Please query the neural engine for status.</p>
            <button
              type="button"
              onClick={() => { refetchPredictions(); refetchPatients(); }}
              className="mt-8 ps-btn-secondary"
            >
              Retry Connection
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(6, 182, 212, 0.2))', border: '1px solid rgba(124, 58, 237, 0.3)' }}>
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
            <p className="text-xs font-bold text-cyan-500 uppercase tracking-widest animate-pulse">Hydrating Neural Logs...</p>
          </div>
        ) : !filtered.length ? (
          <div className="py-32 text-center px-4">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-cyan-500 rounded-full blur-[60px] opacity-10"></div>
              <EmptyStateLung className="w-24 h-20 mx-auto text-gray-700 relative filter grayscale" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>No clinical records found</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto mb-8 leading-relaxed">Generated reports and AI predictions will index here once processed by the core.</p>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/upload-scan')}
                className="ps-btn-primary text-sm shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                <Scan className="w-4 h-4" /> Start First Analysis
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ps-btn-secondary text-sm"
                >
                  Clear Active Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                  <th className="px-6 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Analysis ID</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Patient Identity</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isReportsPage ? 'Final Diagnosis' : 'AI Diagnosis'}</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Confidence</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Risk Level</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Study Date</th>
                  <th className="px-6 py-5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {isReportsPage ? 'Actions' : ''}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                {filtered.map((row, i) => {
                  const risk = row.urgency_level || (row.confidence >= 70 ? 'High' : row.confidence >= 40 ? 'Medium' : 'Low');
                  const isHigh = risk === 'High';
                  const isMid = risk === 'Medium';
                  const isLow = !isHigh && !isMid;

                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={!isReportsPage ? () => navigate(`/predictions/${row.id}`) : undefined}
                      className={cn(
                        'transition-colors group hover:bg-white/5',
                        !isReportsPage && 'cursor-pointer'
                      )}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center border"
                            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                            <ClipboardList className="w-3.5 h-3.5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                          </div>
                          <span className="text-xs font-mono font-bold text-gray-400 group-hover:text-gray-300 transition-colors">#{String(row.id).padStart(4, '0')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-gray-300 group-hover:text-white transition-all border"
                            style={{ background: 'rgba(124, 58, 237, 0.1)', borderColor: 'rgba(124, 58, 237, 0.2)' }}>
                            {(patientMap[row.patient_id] ?? 'P').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-200 leading-none group-hover:text-white transition-colors">{patientMap[row.patient_id] ?? `Patient #${row.patient_id}`}</p>
                            <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest">ID: {row.patient_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <Brain className="w-3.5 h-3.5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]" />
                          <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{row.final_diagnosis ?? 'Analyzing...'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-cyan-400 tabular-nums">{formatConfidence(row.confidence)}</span>
                          <div className="w-16 h-1.5 rounded-full overflow-hidden hidden sm:block" style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${row.confidence}%`, background: 'linear-gradient(90deg, #34D399, #06B6D4)', boxShadow: '0 0 10px rgba(6,182,212,0.5)' }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border',
                            isHigh && 'bg-rose-500/10 text-rose-400 border-rose-500/30',
                            isMid && 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                            isLow && 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                          )}
                          style={isHigh ? { boxShadow: '0 0 10px rgba(244,63,94,0.15)'} : isMid ? { boxShadow: '0 0 10px rgba(245,158,11,0.15)'} : { boxShadow: '0 0 10px rgba(20,184,166,0.15)' }}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full',
                            isHigh ? 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.8)]' : isMid ? 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.8)]' : 'bg-teal-500 shadow-[0_0_5px_rgba(20,184,166,0.8)]'
                          )}></span>
                          {risk}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-gray-500 group-hover:text-cyan-400/70 transition-colors" />
                          <span className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">{new Date(row.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        {isReportsPage ? (
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => navigate(`/predictions/${row.id}`)}
                              className="w-9 h-9 flex items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all shadow-[0_0_10px_rgba(6,182,212,0.1)] border border-cyan-500/20 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                              title="View Report"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => window.open(`${window.location.origin}/predictions/${row.id}?print=1`, '_blank', 'noopener')}
                              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-gray-400 hover:bg-white hover:text-gray-900 transition-all border border-white/10"
                              title="Export PDF"
                            >
                              <FileDown className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center ml-auto bg-white/5 opacity-0 group-hover:opacity-100 transition-all group-hover:bg-cyan-500/20 group-hover:text-cyan-400">
                            <ChevronRight className="w-4 h-4 text-gray-400 transition-colors group-hover:text-cyan-400" />
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Analytics Footer (Optional) */}
      {!isReportsPage && filtered.length > 0 && (
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}
          className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Analyses', value: filtered.length, icon: ClipboardList, color: 'sky' },
            { label: 'High Risk Studies', value: filtered.filter(p => p.urgency_level === 'High').length, icon: Activity, color: 'rose' },
            { label: 'Mean Confidence', value: formatConfidence(filtered.reduce((acc, p) => acc + (p.confidence || 0), 0) / filtered.length), icon: Brain, color: 'teal' },
            { label: 'Recent Growth', value: '+12%', icon: Scan, color: 'amber' },
          ].map((s) => {
            const isSky = s.color === 'sky';
            const isRose = s.color === 'rose';
            const isTeal = s.color === 'teal';
            const isAmber = s.color === 'amber';
            
            return (
            <div key={s.label} className="p-5 rounded-2xl flex items-center gap-4 border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border",
                isSky ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]' :
                isRose ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]' :
                isTeal ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 
                'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              )}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-black text-white leading-none font-mono tracking-tight">{s.value}</p>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1.5">{s.label}</p>
              </div>
            </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
