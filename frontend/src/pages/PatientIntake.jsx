import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ScanLine, ImageIcon, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const initialForm = {
  patientName: '',
  patientId: '',
  age: '',
  gender: 'Male',
  contact: '',
  symptoms: '',
  clinicalNotes: '',
  scanType: 'ct',
};

export default function PatientIntake() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const goToUpload = (type) => {
    navigate('/upload-scan', {
      state: {
        patientForm: {
          patientName: form.patientName,
          patientId: form.patientId,
          age: form.age
        }
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Patient Intake</h1>
        <p className="text-gray-500 mt-1">Enter patient details and proceed to upload scan for AI analysis.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#2563EB]" />
            Patient Details
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
              <input
                type="text"
                value={form.patientName}
                onChange={(e) => update('patientName', e.target.value)}
                placeholder="Full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID</label>
              <input
                type="text"
                value={form.patientId}
                onChange={(e) => update('patientId', e.target.value)}
                placeholder="ID number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input
                type="number"
                min="1"
                max="120"
                value={form.age}
                onChange={(e) => update('age', e.target.value)}
                placeholder="Age"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => update('gender', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
            <input
              type="text"
              value={form.contact}
              onChange={(e) => update('contact', e.target.value)}
              placeholder="Phone or email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Symptoms</label>
            <input
              type="text"
              value={form.symptoms}
              onChange={(e) => update('symptoms', e.target.value)}
              placeholder="e.g. Cough, shortness of breath"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Notes</label>
            <textarea
              value={form.clinicalNotes}
              onChange={(e) => update('clinicalNotes', e.target.value)}
              placeholder="Additional notes"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Scan Type & Upload</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">Choose scan type and proceed to upload. You will run AI analysis on the upload page.</p>
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => goToUpload('ct')}
              className="flex items-center gap-3 px-6 py-4 rounded-xl border-2 border-gray-200 hover:border-[#2563EB] hover:bg-[#2563EB]/5 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-lg bg-[#2563EB]/10 flex items-center justify-center">
                <ScanLine className="w-6 h-6 text-[#2563EB]" />
              </div>
              <div>
                <span className="font-semibold text-gray-900 block">Upload CT Scan</span>
                <span className="text-sm text-gray-500">Multiple slices supported</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
            </button>
            <button
              type="button"
              onClick={() => goToUpload('xray')}
              className="flex items-center gap-3 px-6 py-4 rounded-xl border-2 border-gray-200 hover:border-[#2563EB] hover:bg-[#2563EB]/5 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-[#10B981]" />
              </div>
              <div>
                <span className="font-semibold text-gray-900 block">Upload X-Ray</span>
                <span className="text-sm text-gray-500">Single image</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
