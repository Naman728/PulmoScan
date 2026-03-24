import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientService } from '../services/api';
import {
    UserPlus, ArrowLeft, User, Activity, Loader2, Check,
    Baby, Users, Heart, Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
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

    const inputStyle = {
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
    };

    const handleFocus = (e) => {
        e.target.style.borderColor = 'rgba(124, 58, 237, 0.4)';
        e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1), 0 0 20px rgba(124, 58, 237, 0.08)';
    };
    const handleBlur = (e) => {
        e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        e.target.style.boxShadow = 'none';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto space-y-10 pb-20 relative"
        >
            {/* Ambient glows */}
            <div className="absolute top-[-50px] right-[-100px] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
            <div className="absolute bottom-[10%] left-[-100px] w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

            <div className="flex items-center gap-6 relative z-10">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/patients')}
                    className="p-4 rounded-2xl text-gray-500 hover:text-purple-400 transition-all group"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                    <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </motion.button>
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>New Patient</h1>
                    <p className="text-gray-500 font-medium text-sm">Add a new patient to the diagnostic queue</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {/* Left Side: Guiding Info */}
                <div className="space-y-8">
                    <div className="rounded-3xl p-8 relative overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                            style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
                            <UserPlus className="w-7 h-7 text-purple-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-200 mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Registration Guidelines</h3>
                        <p className="text-gray-500 text-sm leading-relaxed mb-6">Enter correct patient demographics to ensure high accuracy in AI model outputs.</p>
                        <ul className="space-y-3">
                            {[
                                "Full Name is required",
                                "Age must be numerical",
                                "Verify gender identity",
                            ].map((text, idx) => (
                                <li key={idx} className="flex gap-3 items-center text-xs font-semibold text-gray-400 p-3 rounded-xl"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                                        style={{ background: 'rgba(16,185,129,0.12)' }}>
                                        <Check className="w-3 h-3 text-emerald-400" />
                                    </div>
                                    {text}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="md:col-span-2">
                    <div className="rounded-3xl p-10 relative"
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        }}>
                        {/* Top glow */}
                        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.2), transparent)' }} />

                        <form onSubmit={handleSubmit} className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="flex flex-col gap-3">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-4">Full Patient Name</label>
                                    <div className="relative group">
                                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-purple-400 transition-colors" />
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Enter full name"
                                            className="w-full rounded-2xl py-4 pl-14 pr-6 outline-none transition-all font-semibold text-white placeholder-gray-600"
                                            style={inputStyle}
                                            onFocus={handleFocus}
                                            onBlur={handleBlur}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-4">Age (Years)</label>
                                    <div className="relative group">
                                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-purple-400 transition-colors" />
                                        <input
                                            type="number"
                                            value={formData.age}
                                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                            placeholder="e.g. 45"
                                            min="0"
                                            className="w-full rounded-2xl py-4 pl-14 pr-6 outline-none transition-all font-semibold text-white placeholder-gray-600"
                                            style={inputStyle}
                                            onFocus={handleFocus}
                                            onBlur={handleBlur}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-4">Gender Selection</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {['Male', 'Female', 'Other'].map(option => (
                                        <motion.button
                                            key={option}
                                            type="button"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setFormData({ ...formData, gender: option })}
                                            className={cn(
                                                "py-5 rounded-2xl transition-all font-bold text-sm uppercase tracking-widest flex flex-col items-center gap-3 relative overflow-hidden",
                                            )}
                                            style={formData.gender === option ? {
                                                background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
                                                boxShadow: '0 8px 24px rgba(124,58,237,0.3)',
                                                color: 'white',
                                                border: 'none',
                                            } : {
                                                background: 'rgba(255,255,255,0.04)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                color: '#9CA3AF',
                                            }}
                                        >
                                            {option === 'Male' && <Activity className="w-5 h-5" />}
                                            {option === 'Female' && <Heart className="w-5 h-5" />}
                                            {option === 'Other' && <Users className="w-5 h-5" />}
                                            {option}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 flex gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="button"
                                    onClick={() => navigate('/patients')}
                                    className="flex-1 px-6 py-4 rounded-2xl font-bold text-sm text-gray-400 transition-all"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                                    whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] text-white rounded-2xl py-4 font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        background: isSubmitting ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #7C3AED, #06B6D4)',
                                        boxShadow: isSubmitting ? 'none' : '0 8px 24px rgba(124,58,237,0.3)',
                                    }}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            Finalize Registration <Check className="w-5 h-5" />
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default AddPatient;
