import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authService } from '../services/api';
import { UserPlus, Mail, Lock, Loader2, Hospital, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        role: 'doctor' // default role
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            return toast.error("Passwords don't match");
        }

        setIsSubmitting(true);
        try {
            await authService.register({
                email: formData.email,
                password: formData.password,
                role: formData.role
            });
            toast.success('Registration successful. You can now login.');
            navigate('/login');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Registration failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-200/20 rounded-full blur-[120px] dark:bg-primary-900/10"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-200/20 rounded-full blur-[120px] dark:bg-sky-900/10"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-lg"
            >
                <div className="ps-card p-10 rounded-[40px] shadow-2xl relative z-10 overflow-hidden">
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-400 flex items-center justify-center shadow-lg shadow-sky-500/30 mb-6 group hover:scale-110 transition-transform">
                            <UserPlus className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Create Account</h1>
                        <p className="text-slate-400 font-semibold text-center leading-relaxed">Join the AI-powered medical diagnostics network</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px] ml-4">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="dr.smith@example.com"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-3xl py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px] ml-4">License Type</label>
                                <div className="relative group">
                                    <Hospital className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-3xl py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium appearance-none cursor-pointer"
                                        required
                                    >
                                        <option value="doctor">Medical Doctor</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px] ml-4">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Create a strong password"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-3xl py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px] ml-4">Confirm Password</label>
                            <div className="relative group">
                                <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    placeholder="Verify password"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-3xl py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-slate-900 text-white rounded-[24px] py-5 font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 hover:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Register <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-slate-400 font-semibold text-sm">
                            Already have an account? {' '}
                            <Link to="/login" className="text-primary-500 hover:text-primary-600 font-black underline underline-offset-4 decoration-2">
                                Log In
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
