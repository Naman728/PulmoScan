import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { predictionService } from '../services/api';
import Card, { CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { PrimaryButton, SecondaryButton } from '../components/ui/PrimaryButton';
import { Settings as SettingsIcon, Cpu, Upload, Wrench, Loader2, FileDown, Trash2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const STORAGE_KEYS = {
  enableTB: 'pulmoscan_settings_enable_tb',
  enablePneumonia: 'pulmoscan_settings_enable_pneumonia',
  maxFileSizeMB: 'pulmoscan_settings_max_file_mb',
};

const DEFAULT_MAX_FILE_MB = 50;
const SUPPORTED_FORMATS = 'PNG, JPG, JPEG, BMP, DICOM';

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' } }),
};

export default function Settings() {
  const queryClient = useQueryClient();
  const [enableTB, setEnableTB] = useState(true);
  const [enablePneumonia, setEnablePneumonia] = useState(true);
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(DEFAULT_MAX_FILE_MB);
  const [clearing, setClearing] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    try {
      const tb = localStorage.getItem(STORAGE_KEYS.enableTB);
      const pn = localStorage.getItem(STORAGE_KEYS.enablePneumonia);
      const max = localStorage.getItem(STORAGE_KEYS.maxFileSizeMB);
      if (tb !== null) setEnableTB(tb === 'true');
      if (pn !== null) setEnablePneumonia(pn === 'true');
      if (max !== null) setMaxFileSizeMB(Number(max) || DEFAULT_MAX_FILE_MB);
    } catch (_) {}
  }, []);

  const saveToggle = (key, value) => {
    try {
      localStorage.setItem(key, String(value));
    } catch (_) {}
  };

  const { data: predictions = [] } = useQuery({
    queryKey: ['all-predictions'],
    queryFn: predictionService.getAll,
  });

  const handleExportReports = async () => {
    setExporting(true);
    try {
      const headers = ['Report ID', 'Patient ID', 'Final Diagnosis', 'Confidence', 'Risk Level', 'Created At'];
      const rows = predictions.map((p) => [
        p.id,
        p.patient_id,
        p.final_diagnosis ?? '',
        p.confidence ?? '',
        p.urgency_level ?? '',
        new Date(p.created_at).toISOString(),
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pulmoscan-reports-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Reports exported');
    } catch (e) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleClearPredictions = async () => {
    if (!window.confirm('This will delete all your predictions. Are you sure?')) return;
    setClearing(true);
    try {
      let deleted = 0;
      for (const p of predictions) {
        try {
          await predictionService.delete(p.id);
          deleted++;
        } catch (_) {}
      }
      await queryClient.invalidateQueries({ queryKey: ['all-predictions'] });
      toast.success(`Deleted ${deleted} prediction(s)`);
    } catch (e) {
      toast.error('Clear failed');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-8">
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          <SettingsIcon className="w-7 h-7 text-purple-400" />
          Settings
        </h1>
        <p className="text-gray-500 mt-1">Application and AI model configuration.</p>
      </motion.div>

      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              AI Model Settings
            </CardTitle>
            <CardDescription>Enable or disable specific detection modules.</CardDescription>
          </CardHeader>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={enableTB}
                  onChange={(e) => {
                    setEnableTB(e.target.checked);
                    saveToggle(STORAGE_KEYS.enableTB, e.target.checked);
                  }}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-all ${enableTB ? 'bg-purple-500' : 'bg-gray-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform mt-1 ${enableTB ? 'translate-x-5 ml-0' : 'translate-x-1'}`} />
                </div>
              </div>
              <span className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors">Enable TB detection</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={enablePneumonia}
                  onChange={(e) => {
                    setEnablePneumonia(e.target.checked);
                    saveToggle(STORAGE_KEYS.enablePneumonia, e.target.checked);
                  }}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-all ${enablePneumonia ? 'bg-purple-500' : 'bg-gray-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform mt-1 ${enablePneumonia ? 'translate-x-5 ml-0' : 'translate-x-1'}`} />
                </div>
              </div>
              <span className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors">Enable Pneumonia detection</span>
            </label>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-cyan-400" />
              Upload Settings
            </CardTitle>
            <CardDescription>Limits and accepted formats (backend-enforced).</CardDescription>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Max file size</p>
              <p className="text-sm font-medium text-gray-200">{maxFileSizeMB} MB</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Supported formats</p>
              <p className="text-sm font-medium text-gray-200">{SUPPORTED_FORMATS}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={3}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-400" />
              System Tools
            </CardTitle>
            <CardDescription>Export or clear prediction data.</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-3">
            <PrimaryButton
              onClick={handleExportReports}
              disabled={exporting || !predictions.length}
              loading={exporting}
            >
              <FileDown className="w-4 h-4" /> Export reports
            </PrimaryButton>
            <SecondaryButton
              onClick={handleClearPredictions}
              disabled={clearing || !predictions.length}
            >
              {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Clear predictions
            </SecondaryButton>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
