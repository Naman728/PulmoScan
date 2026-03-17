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
    <div className="space-y-8">
      {/* Header */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {isReportsPage ? 'Clinical Reports' : 'AI Prediction Logs'}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
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
              "ps-btn-secondary text-sm gap-1.5",
              showFilters && "bg-slate-100 border-slate-300"
            )}
          >
            <Filter className="w-4 h-4" /> Filters {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />}
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
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Search Keywords</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                placeholder="Patient or diagnosis..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 text-sm focus:ring-2 focus:ring-sky-400 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Risk Severity</label>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:ring-2 focus:ring-sky-400 outline-none transition-all"
            >
              <option value="">All Risk Levels</option>
              <option value="low">Low Risk</option>
              <option value="medium">Moderate Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Diagnostic Classification</label>
            <select
              value={filterDiagnosis}
              onChange={(e) => setFilterDiagnosis(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:ring-2 focus:ring-sky-400 outline-none transition-all"
            >
              <option value="">All Diagnoses</option>
              {diagnosisOptions.filter(Boolean).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Date Range</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full pl-9 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:ring-2 focus:ring-sky-400 outline-none transition-all"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0"
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
        className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

        {predictionsError || patientsError ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
            <h2 className="text-lg font-bold text-slate-900">Failed to load platform data</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-sm">Please check your network connection and verify that the backend services are operational.</p>
            <button
              type="button"
              onClick={() => { refetchPredictions(); refetchPatients(); }}
              className="mt-6 ps-btn-primary"
            >
              Retry Connection
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #14B8A6)' }}>
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hydrating data...</p>
          </div>
        ) : !filtered.length ? (
          <div className="py-32 text-center">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-sky-200 rounded-full blur-3xl opacity-20"></div>
              <EmptyStateLung className="w-24 h-20 mx-auto text-slate-200 relative" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No clinical records found</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto mb-8">Generated reports and AI predictions will appear here once processed.</p>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/upload-scan')}
                className="ps-btn-primary text-sm"
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
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Analysis ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient Identity</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isReportsPage ? 'Final Diagnosis' : 'AI Diagnosis'}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confidence</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Risk Level</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Study Date</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {isReportsPage ? 'Actions' : ''}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((row, i) => {
                  const risk = row.urgency_level || (row.confidence >= 70 ? 'High' : row.confidence >= 40 ? 'Medium' : 'Low');
                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={!isReportsPage ? () => navigate(`/predictions/${row.id}`) : undefined}
                      className={cn(
                        'hover:bg-sky-50/40 transition-colors group',
                        !isReportsPage && 'cursor-pointer'
                      )}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <ClipboardList className="w-3.5 h-3.5 text-slate-300" />
                          <span className="text-xs font-mono font-bold text-slate-400">#{row.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-xs font-bold text-sky-700 group-hover:bg-sky-500 group-hover:text-white transition-all shadow-inner">
                            {(patientMap[row.patient_id] ?? 'P').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 leading-none">{patientMap[row.patient_id] ?? `Patient #${row.patient_id}`}</p>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">ID: {row.patient_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <Brain className="w-3.5 h-3.5 text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="text-sm font-bold text-slate-700">{row.final_diagnosis ?? 'Analyzing...'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-sky-600 tabular-nums">{formatConfidence(row.confidence)}</span>
                          <div className="w-12 h-1 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
                            <div className="h-full bg-sky-500 rounded-full" style={{ width: `${row.confidence}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border',
                            risk === 'High' && 'bg-rose-50 text-rose-700 border-rose-200',
                            risk === 'Medium' && 'bg-amber-50 text-amber-700 border-amber-200',
                            (risk === 'Low' || !risk) && 'bg-teal-50 text-teal-700 border-teal-200'
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full',
                            risk === 'High' ? 'bg-rose-500' : risk === 'Medium' ? 'bg-amber-500' : 'bg-teal-500'
                          )}></span>
                          {risk}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-300" />
                          <span className="text-sm font-medium text-slate-500">{new Date(row.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        {isReportsPage ? (
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => navigate(`/predictions/${row.id}`)}
                              className="w-9 h-9 flex items-center justify-center rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white transition-all shadow-sm border border-sky-100"
                              title="View Report"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => window.open(`${window.location.origin}/predictions/${row.id}?print=1`, '_blank', 'noopener')}
                              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-800 hover:text-white transition-all shadow-sm border border-slate-200"
                              title="Export PDF"
                            >
                              <FileDown className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
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
          ].map((s) => (
            <div key={s.label} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                s.color === 'sky' ? 'bg-sky-50 text-sky-600' :
                  s.color === 'rose' ? 'bg-rose-50 text-rose-600' :
                    s.color === 'teal' ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-600'
              )}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-lg font-black text-slate-800 leading-none">{s.value}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
