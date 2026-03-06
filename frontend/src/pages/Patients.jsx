import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { patientService } from '../services/api';
import { Users, Search, Plus, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { EmptyStatePatients } from '../components/illustrations';

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
        <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
        <p className="mt-4 text-sm text-slate-400">Loading patients...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <h2 className="mt-4 text-lg font-semibold text-white">Failed to load patients</h2>
        <p className="mt-2 text-sm text-slate-400 max-w-sm">Check the browser console for API errors. Ensure the backend is running.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-400"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Patients</h1>
          <p className="text-slate-400 mt-1">Manage patient records.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/patients/add')}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-xl font-medium hover:bg-sky-400"
        >
          <Plus className="w-5 h-5" /> New patient
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="search"
            placeholder="Search by name, gender, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-600 rounded-lg bg-slate-800/60 text-slate-200 placeholder-slate-500 text-sm focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
      </div>

      {!filtered.length ? (
        <div className="glass-card border border-slate-700/50 rounded-xl py-16 text-center">
          <EmptyStatePatients className="w-24 h-24 mx-auto" />
          <p className="mt-4 text-slate-400">
            {search ? 'No patients match your search.' : 'No patients yet. Add a patient to get started.'}
          </p>
          {!search && (
            <button
              type="button"
              onClick={() => navigate('/patients/add')}
              className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-400"
            >
              Add patient
            </button>
          )}
        </div>
      ) : (
        <div className="glass-card border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-800/30">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Patient name</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Age</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Gender</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered</th>
                  <th className="px-6 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/patients/${p.id}`)}
                    className="border-b border-slate-800/50 hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-white">{p.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">#{String(p.id).padStart(4, '0')}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{p.age ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{p.gender ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
