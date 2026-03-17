import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { LogIn, Mail, Lock, Loader2, ArrowRight, Shield, Zap, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import ctScanIllustration from '../assets/illustrations/ct_scan_machine.png';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = await authService.login(email, password);
            const token = typeof data === 'string' ? data : (data?.access_token ?? data);
            if (!token || (typeof token !== 'string')) {
                toast.error('Invalid login response. Please try again.');
                return;
            }
            login(token);
        } catch (error) {
            const message = !error.response
                ? 'Cannot reach server. Is the backend running at http://localhost:8000?'
                : (error.response?.data?.detail || error.response?.data?.message || 'Login failed. Check your credentials.');
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex overflow-hidden" style={{ background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 40%, #ECFDF5 100%)' }}>
            {/* Left Panel — Illustration */}
            <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden items-center justify-center p-12"
                style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 40%, #14B8A6 100%)' }}>

                {/* Abstract circles */}
                <div className="absolute top-[-10%] left-[-10%] w-80 h-80 rounded-full opacity-10 bg-white"></div>
                <div className="absolute bottom-[-8%] right-[-5%] w-96 h-96 rounded-full opacity-10 bg-white"></div>
                <div className="absolute top-[20%] right-[-5%] w-48 h-48 rounded-full opacity-10 bg-white"></div>

                <div className="relative z-10 text-center max-w-md">
                    {/* Logo mark */}
                    <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center mx-auto mb-8">
                        <Shield className="w-10 h-10 text-white" />
                    </div>

                    <h2 className="text-4xl font-black text-white mb-4 leading-tight">
                        AI-Powered<br />Medical Imaging
                    </h2>
                    <p className="text-sky-100 text-lg leading-relaxed mb-10">
                        Detect pulmonary conditions with 97.2% accuracy using advanced deep learning and CT analysis.
                    </p>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-4 mb-10">
                        {[
                            { label: 'Accuracy', value: '97.2%' },
                            { label: 'Conditions', value: '8+' },
                            { label: 'Speed', value: '<3s' },
                        ].map((s) => (
                            <div key={s.label} className="bg-white/15 rounded-2xl p-4 border border-white/20">
                                <p className="text-2xl font-black text-white">{s.value}</p>
                                <p className="text-xs text-sky-200 font-semibold mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Illustration */}
                    <div className="rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
                        <img src={ctScanIllustration} alt="CT Scan AI Analysis" className="w-full h-auto" />
                    </div>
                </div>
            </div>

            {/* Right Panel — Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="w-full max-w-md"
                >
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                            style={{ background: 'linear-gradient(135deg, #0EA5E9, #14B8A6)' }}>
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-black text-slate-900">PulmoScan</p>
                            <p className="text-xs text-slate-500 font-semibold">AI Radiology</p>
                        </div>
                    </div>

                    {/* Form card */}
                    <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
                        <div className="mb-8">
                            <h1 className="text-2xl font-black text-slate-900 mb-2">Welcome back</h1>
                            <p className="text-slate-500 text-sm">Sign in to access your clinical AI dashboard</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="doctor@hospital.com"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:border-sky-400 transition-all"
                                        style={{ '--tw-ring-color': 'rgba(14, 165, 233, 0.2)' }}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-11 pr-12 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:border-sky-400 transition-all"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full text-white rounded-2xl py-4 font-bold text-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                style={{
                                    background: isSubmitting ? '#94A3B8' : 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 60%, #14B8A6 100%)',
                                    boxShadow: isSubmitting ? 'none' : '0 8px 24px rgba(14, 165, 233, 0.35)',
                                }}
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
                                ) : (
                                    <>Sign In <ArrowRight className="w-4 h-4" /></>
                                )}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-slate-500">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-sky-600 font-bold hover:text-sky-700 transition-colors">
                                Create account
                            </Link>
                        </p>

                        {/* Security note */}
                        <div className="mt-6 flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                            <p className="text-xs text-slate-400">Secured with JWT authentication. Clinical use only.</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
