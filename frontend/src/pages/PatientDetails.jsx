import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { patientService, scanService, predictionService } from '../services/api';
import {
  ArrowLeft,
  Upload,
  User,
  Calendar,
  Camera,
  Layers,
  Loader2,
  AlertCircle,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { formatConfidence } from '../utils/format';
import { cn } from '../utils/cn';

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
        <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
        <p className="mt-4 text-sm text-slate-400">Loading patient...</p>
      </div>
    );
  }

  if (isError || !patient) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <h2 className="mt-4 text-lg font-semibold text-white">Patient not found</h2>
        <button
          type="button"
          onClick={() => navigate('/patients')}
          className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-400"
        >
          Back to patients
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/patients')}
            className="p-2 rounded-xl border border-slate-600 hover:bg-slate-800/60"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{patient.name}</h1>
            <p className="text-sm text-slate-400">Patient ID #{String(patient.id).padStart(4, '0')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/patients/${id}/upload`)}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-xl font-medium hover:bg-sky-400"
        >
          <Upload className="w-5 h-5" /> Upload scan
        </button>
      </div>

      {/* Patient Information */}
      <section className="glass-card border border-slate-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Patient information</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Name</p>
            <p className="font-medium text-white">{patient.name}</p>
          </div>
          <div>
            <p className="text-slate-400">Age</p>
            <p className="font-medium text-white">{patient.age ?? '—'}</p>
          </div>
          <div>
            <p className="text-slate-400">Gender</p>
            <p className="font-medium text-white">{patient.gender ?? '—'}</p>
          </div>
          <div>
            <p className="text-slate-400">Registered</p>
            <p className="font-medium text-white">{new Date(patient.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </section>

      {/* Scan history */}
      <section className="glass-card border border-slate-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Scan history</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-600 rounded-lg p-4 bg-slate-800/30">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-5 h-5 text-sky-400" />
              <span className="font-medium text-white">CT scans</span>
            </div>
            <p className="text-sm text-slate-400">{ctScans?.length ?? 0} record(s)</p>
            {ctScans?.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-slate-400">
                {ctScans.slice(0, 3).map((s) => (
                  <li key={s.id}>{s.scan_type ?? 'CT'} — {new Date(s.created_at || s.id).toLocaleDateString()}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="border border-slate-600 rounded-lg p-4 bg-slate-800/30">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-5 h-5 text-teal-400" />
              <span className="font-medium text-white">X-rays</span>
            </div>
            <p className="text-sm text-slate-400">{xrays?.length ?? 0} record(s)</p>
            {xrays?.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-slate-400">
                {xrays.slice(0, 3).map((s) => (
                  <li key={s.id}>{s.body_part ?? 'X-Ray'} — {new Date(s.created_at || s.id).toLocaleDateString()}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* AI Predictions */}
      <section className="glass-card border border-slate-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">AI predictions</h2>
        {!predictions?.length ? (
          <p className="text-sm text-slate-400">No predictions yet. Upload a scan to generate results.</p>
        ) : (
          <div className="space-y-3">
            {predictions.map((pred) => (
              <button
                key={pred.id}
                type="button"
                onClick={() => navigate(`/predictions/${pred.id}`)}
                className="w-full text-left flex items-center gap-4 p-4 rounded-xl border border-slate-600 hover:bg-slate-800/40 flex-wrap transition-colors"
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  pred.urgency_level === 'High' && "bg-red-500/20 text-red-400",
                  pred.urgency_level === 'Medium' && "bg-amber-500/20 text-amber-400",
                  (pred.urgency_level === 'Low' || !pred.urgency_level) && "bg-sky-500/20 text-sky-400"
                )}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">{pred.final_diagnosis ?? '—'}</p>
                  <p className="text-sm text-slate-400">{formatConfidence(pred.confidence)} · {new Date(pred.created_at).toLocaleDateString()}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Doctor notes (UI only) */}
      <section className="glass-card border border-slate-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Doctor notes</h2>
        <textarea
          placeholder="Add clinical notes..."
          className="w-full min-h-[120px] px-4 py-3 border border-slate-600 rounded-lg bg-slate-800/50 text-slate-200 placeholder-slate-500 text-sm resize-y focus:ring-2 focus:ring-sky-500/30"
          readOnly
        />
        <p className="mt-2 text-xs text-slate-500">Notes are for display only. Backend can be extended to save notes.</p>
      </section>
    </div>
  );
}
