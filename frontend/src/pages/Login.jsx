import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { LogIn, Mail, Lock, Loader2, Plus, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
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
            login(data.access_token);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Login failed. Please check your credentials.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-deep)] p-6 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-500/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[120px]"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md"
            >
                <div className="glass-card p-10 rounded-[40px] border border-slate-700/50 relative z-10">
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center mb-6 group hover:scale-110 transition-transform">
                            <LogIn className="w-8 h-8 text-sky-300" />
                        </div>
                        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Welcome Back</h1>
                        <p className="text-slate-400 font-semibold text-center leading-relaxed">Access your medical diagnostic dashboard</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px] ml-4">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-sky-400 transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="doctor@pulmoscan.com"
                                    className="w-full bg-slate-800/50 border border-slate-600 rounded-3xl py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition-all font-medium text-slate-100 placeholder-slate-500"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px] ml-4">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-sky-400 transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-800/50 border border-slate-600 rounded-3xl py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition-all font-medium text-slate-100 placeholder-slate-500"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-sky-500 text-white rounded-[24px] py-5 font-black text-sm uppercase tracking-widest shadow-xl shadow-sky-500/30 hover:bg-sky-400 hover:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Connect <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-slate-400 font-semibold text-sm">
                            Don't have an account? {' '}
                            <Link to="/register" className="text-sky-400 hover:text-sky-300 font-black underline underline-offset-4 decoration-2">
                                Sign Up
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
