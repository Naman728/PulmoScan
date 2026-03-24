import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { patientService } from '../services/api';
import { Users, Search, Plus, Loader2, AlertCircle, ChevronRight, Brain } from 'lucide-react';
import { EmptyStatePatients } from '../components/illustrations';

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' } }),
};

export default function Patients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: patients, isLoading, isError, refetch } = useQuery({
    queryKey: ['patients'],
    queryFn: patientService.getAll,
    retry: (failureCount, error) => error?.response?.status !== 401,
  });

  const filtered = useMemo(() => {
    if (!patients?.length) return [];
    if (!search.trim()) return patients;
    const q = search.toLowerCase();
    return patients.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.gender && p.gender.toLowerCase().includes(q)) ||
        String(p.id).includes(q)
    );
  }, [patients, search]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)', boxShadow: '0 8px 24px rgba(124,58,237,0.3)' }}>
          <Brain className="w-6 h-6 text-white animate-pulse" />
        </div>
        <p className="text-sm text-gray-500">Loading patients...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400" />
        <h2 className="mt-4 text-lg font-semibold text-gray-200">Failed to load patients</h2>
        <p className="mt-2 text-sm text-gray-500 max-w-sm">Check the browser console for API errors. Ensure the backend is running.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 ps-btn-primary text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative pb-12">
      {/* Ambient background glows for depth */}
      <div className="absolute top-[-100px] left-[-200px] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute top-[20%] right-[-100px] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

      <motion.div
        variants={cardVariants} initial="hidden" animate="visible" custom={0}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Patients</h1>
          <p className="text-gray-500 mt-1">Manage patient records.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => navigate('/patients/add')}
          className="ps-btn-primary text-sm"
        >
          <Plus className="w-5 h-5" /> New patient
        </motion.button>
      </motion.div>

      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
          <input
            type="search"
            placeholder="Search by name, gender, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none transition-all"
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
      </motion.div>

      {!filtered.length ? (
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}
          className="rounded-2xl py-16 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <EmptyStatePatients className="w-24 h-24 mx-auto" />
          <p className="mt-4 text-gray-500">
            {search ? 'No patients match your search.' : 'No patients yet. Add a patient to get started.'}
          </p>
          {!search && (
            <button
              type="button"
              onClick={() => navigate('/patients/add')}
              className="mt-4 ps-btn-primary text-sm"
            >
              Add patient
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}
          className="rounded-[24px] overflow-hidden backdrop-blur-xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 30px rgba(0,0,0,0.4)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Patient name</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Age</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Gender</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Registered</th>
                  <th className="px-6 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/patients/${p.id}`)}
                    className="border-b border-white/4 hover:bg-purple-500/4 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-purple-300"
                          style={{ background: 'rgba(124,58,237,0.12)' }}>
                          {p.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                        <span className="font-medium text-gray-200">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">#{String(p.id).padStart(4, '0')}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{p.age ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{p.gender ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <ChevronRight className="w-4 h-4 text-gray-700" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
