import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { LogIn, Mail, Lock, Loader2, ArrowRight, Shield, Eye, EyeOff, Brain, Zap, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import AnimatedBackground from '../components/AnimatedBackground';

const trustedLogos = [
  'Mayo Clinic', 'Stanford Health', 'Johns Hopkins', 'Cleveland Clinic',
  'Mass General', 'UCSF Medical', 'Mount Sinai', 'UCLA Health',
];

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
        <div className="min-h-screen flex relative overflow-hidden" style={{ background: '#050508' }}>
            <AnimatedBackground />

            {/* Ambient Deep Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

            {/* LEFT SIDE — Hero Content */}
            <div className="hidden lg:flex lg:w-[55%] relative z-10 flex-col justify-center px-16 xl:px-24">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                >
                    {/* Brand */}
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)', boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)' }}>
                            <Brain className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>PulmoScan</span>
                    </div>

                    {/* Heading */}
                    <h1 className="text-5xl xl:text-6xl font-bold text-white leading-[1.1] mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        <span className="gradient-text">AI-Powered</span>
                        <br />
                        Medical Imaging
                        <br />
                        <span style={{ color: '#9CA3AF' }}>Diagnostics</span>
                    </h1>

                    <p className="text-lg text-gray-400 leading-relaxed mb-10 max-w-lg">
                        Analyze, detect, and diagnose pulmonary conditions with clinical-grade AI. Built for radiologists who demand precision.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex items-center gap-4 mb-16">
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => document.getElementById('login-email')?.focus()}
                            className="px-7 py-3.5 rounded-xl text-white font-semibold text-sm flex items-center gap-2"
                            style={{
                                background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
                                boxShadow: '0 8px 30px rgba(124, 58, 237, 0.35)',
                            }}
                        >
                            Start Building <ArrowRight className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-7 py-3.5 rounded-xl text-gray-300 font-semibold text-sm border border-white/10 hover:border-white/20 transition-colors"
                            style={{ background: 'rgba(255,255,255,0.04)' }}
                        >
                            View Demo
                        </motion.button>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-8">
                        {[
                            { icon: Zap, value: '97.2%', label: 'Accuracy' },
                            { icon: Activity, value: '<3s', label: 'Analysis Time' },
                            { icon: Shield, value: '8+', label: 'Conditions' },
                        ].map((stat) => (
                            <div key={stat.label} className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(124, 58, 237, 0.12)', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
                                    <stat.icon className="w-4 h-4 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-white tabular-nums">{stat.value}</p>
                                    <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Trusted By Section */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.7 }}
                    className="mt-16"
                >
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-5">Trusted by leading institutions</p>
                    <div className="flex flex-wrap items-center gap-6">
                        {trustedLogos.map((name) => (
                            <span
                                key={name}
                                className="text-sm font-semibold text-gray-600 hover:text-gray-400 transition-colors cursor-default"
                                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                            >
                                {name}
                            </span>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* RIGHT SIDE — Glassmorphism Login Panel */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, x: 30, scale: 0.97 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                    className="w-full max-w-md"
                >
                    {/* Mobile brand */}
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)' }}>
                            <Brain className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>PulmoScan</p>
                            <p className="text-xs text-gray-500 font-semibold">AI Diagnostics</p>
                        </div>
                    </div>

                    {/* Glass Card Container with Deep Shadows & Inner Glow */}
                    <div className="relative group/card">
                        {/* Ambient glow under the card */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-[32px] blur-2xl opacity-50 group-hover/card:opacity-100 transition duration-700"></div>
                        
                        <div
                            className="rounded-3xl p-8 sm:p-10 relative overflow-hidden backdrop-blur-3xl"
                            style={{
                                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 24px 64px rgba(0,0,0,0.8), 0 0 40px rgba(124, 58, 237, 0.08)',
                            }}
                        >
                            {/* Subtle glowing animated top border */}
                            <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.6), rgba(6, 182, 212, 0.6), transparent)' }} />
                            <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-white/40 blur-[2px]" />

                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Welcome back</h2>
                            <p className="text-gray-500 text-sm">Sign in to access your clinical AI dashboard</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-purple-400 transition-colors" />
                                    <input
                                        id="login-email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="doctor@hospital.com"
                                        className="w-full rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = 'rgba(124, 58, 237, 0.4)';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1), 0 0 20px rgba(124, 58, 237, 0.08)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-purple-400 transition-colors" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full rounded-2xl py-3.5 pl-11 pr-12 text-sm text-white placeholder-gray-600 outline-none transition-all"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = 'rgba(124, 58, 237, 0.4)';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1), 0 0 20px rgba(124, 58, 237, 0.08)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <motion.button
                                type="submit"
                                disabled={isSubmitting}
                                whileHover={{ scale: isSubmitting ? 1 : 1.01, translateY: -2 }}
                                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                                className="w-full text-white rounded-2xl py-4 font-bold text-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group/btn"
                                style={{
                                    background: isSubmitting ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, rgba(124,58,237,0.9) 0%, rgba(6,182,212,0.9) 100%)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    boxShadow: isSubmitting ? 'none' : 'inset 0 1px 1px rgba(255,255,255,0.2), 0 8px 30px rgba(124, 58, 237, 0.4)',
                                }}
                            >
                                {!isSubmitting && <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity" />}
                                <span className="relative z-10 flex items-center gap-2.5">
                                    {isSubmitting ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
                                    ) : (
                                        <>Sign In <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" /></>
                                    )}
                                </span>
                            </motion.button>
                        </form>

                        <p className="mt-6 text-center text-sm text-gray-500">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-purple-400 font-bold hover:text-purple-300 transition-colors">
                                Create account
                            </Link>
                        </p>

                        {/* Security note */}
                        <div className="mt-8 flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }}>
                            <Shield className="w-4 h-4 text-gray-500 shrink-0" />
                            <p className="text-xs text-gray-500 font-medium tracking-wide">Secured with premium JWT authentication. Clinical use only.</p>
                        </div>
                    </div></div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
