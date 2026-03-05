import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientService } from '../services/api';
import {
    UserPlus,
    ArrowLeft,
    User,
    Activity,
    Loader2,
    Check,
    Baby,
    Users,
    Heart,
    Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

const AddPatient = () => {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        gender: 'Male',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await patientService.create({
                ...formData,
                age: parseInt(formData.age),
            });
            toast.success('Patient added successfully!');
            navigate('/patients');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to add patient.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto space-y-10 pb-20"
        >
            <div className="flex items-center gap-6">
                <button
                    onClick={() => navigate('/patients')}
                    className="p-4 bg-white dark:bg-slate-900 border border-white/40 dark:border-slate-700/40 rounded-2xl shadow-sm text-slate-400 hover:text-primary-500 hover:scale-110 transition-all group"
                >
                    <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">New Patient</h1>
                    <p className="text-slate-400 font-semibold text-lg uppercase tracking-wider text-[10px]">Add a new patient to the diagnostic queue</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

                {/* Left Side: Guiding Info */}
                <div className="space-y-8">
                    <div className="glass-morphism p-8 rounded-[40px] border border-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 -translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                            <Heart className="w-6 h-6 text-primary-500/20" />
                        </div>
                        <div className="w-16 h-16 rounded-3xl bg-primary-100 dark:bg-primary-900/30 text-primary-500 flex items-center justify-center mb-6 shadow-inner">
                            <UserPlus className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4 leading-tight">Registration Guidelines</h3>
                        <p className="text-slate-500 font-medium text-sm leading-relaxed mb-6">Enter correct patient demographics to ensure high accuracy in AI model outputs.</p>
                        <ul className="space-y-4">
                            {[
                                "Full Name is required",
                                "Age must be numerical",
                                "Verify gender identity",
                            ].map((text, idx) => (
                                <li key={idx} className="flex gap-3 items-center text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/20">
                                    <div className="w-6 h-6 rounded-lg bg-green-50/50 text-green-500 flex items-center justify-center shrink-0">
                                        <Check className="w-4 h-4" />
                                    </div>
                                    {text}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="md:col-span-2">
                    <div className="glass-morphism p-10 rounded-[44px] shadow-2xl border border-white relative">
                        <form onSubmit={handleSubmit} className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="flex flex-col gap-3">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[2.5px] ml-4">Full Patient Name</label>
                                    <div className="relative group">
                                        <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Enter full name"
                                            className="w-full bg-slate-50/70 dark:bg-slate-800/70 border border-white/50 dark:border-slate-700/50 rounded-3xl py-5 pl-16 pr-8 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-bold text-lg"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[2.5px] ml-4">Age (Years)</label>
                                    <div className="relative group">
                                        <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                                        <input
                                            type="number"
                                            value={formData.age}
                                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                            placeholder="e.g. 45"
                                            min="0"
                                            className="w-full bg-slate-50/70 dark:bg-slate-800/70 border border-white/50 dark:border-slate-700/50 rounded-3xl py-5 pl-16 pr-8 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-bold text-lg"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[2.5px] ml-4">Gender Selection</label>
                                <div className="grid grid-cols-3 gap-6">
                                    {['Male', 'Female', 'Other'].map(option => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, gender: option })}
                                            className={cn(
                                                "py-6 rounded-3xl border-2 transition-all font-black text-sm uppercase tracking-widest flex flex-col items-center gap-4 group relative overflow-hidden",
                                                formData.gender === option
                                                    ? "bg-primary-500 text-white border-primary-400 shadow-xl shadow-primary-500/20 translate-y-[-4px]"
                                                    : "bg-white/40 dark:bg-slate-800/40 text-slate-400 border-white dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:border-primary-200"
                                            )}
                                        >
                                            {option === 'Male' && <Activity className="w-6 h-6" />}
                                            {option === 'Female' && <Heart className="w-6 h-6" />}
                                            {option === 'Other' && <Users className="w-6 h-6" />}
                                            {option}
                                            {formData.gender === option && (
                                                <div className="absolute -bottom-2 -right-2 p-4 bg-white/20 rounded-full">
                                                    <Check className="w-5 h-5 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-10 flex gap-6">
                                <button
                                    type="button"
                                    onClick={() => navigate('/patients')}
                                    className="flex-1 px-8 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] bg-primary-500 text-white rounded-[24px] py-5 font-black text-sm uppercase tracking-widest shadow-xl shadow-primary-500/30 hover:bg-primary-600 hover:translate-y-[-4px] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            Finalize Registration <Check className="w-6 h-6" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default AddPatient;
