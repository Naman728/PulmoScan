import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authService } from '../services/api';
import { UserPlus, Mail, Lock, Loader2, Hospital, ArrowRight, ShieldCheck, Brain } from 'lucide-react';
import toast from 'react-hot-toast';
import AnimatedBackground from '../components/AnimatedBackground';

const Register = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        role: 'doctor'
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
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-6" style={{ background: '#0A0A0F' }}>
            <AnimatedBackground />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-lg relative z-10"
            >
                <div
                    className="rounded-3xl p-10 relative overflow-hidden"
                    style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 0 40px rgba(124, 58, 237, 0.06)',
                    }}
                >
                    {/* Top glow line */}
                    <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.4), rgba(6, 182, 212, 0.4), transparent)' }} />

                    <div className="flex flex-col items-center mb-10">
                        <motion.div
                            whileHover={{ scale: 1.1 }}
                            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                            style={{
                                background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
                                boxShadow: '0 8px 30px rgba(124, 58, 237, 0.35)',
                            }}
                        >
                            <UserPlus className="w-8 h-8 text-white" />
                        </motion.div>
                        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Create Account</h1>
                        <p className="text-gray-500 font-medium text-center leading-relaxed">Join the AI-powered medical diagnostics network</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[2px] ml-4">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-purple-400 transition-colors" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="dr.smith@example.com"
                                        className="w-full rounded-2xl py-4 pl-14 pr-6 outline-none transition-all font-medium text-white placeholder-gray-600"
                                        style={inputStyle}
                                        onFocus={handleFocus}
                                        onBlur={handleBlur}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[2px] ml-4">License Type</label>
                                <div className="relative group">
                                    <Hospital className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-purple-400 transition-colors" />
                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full rounded-2xl py-4 pl-14 pr-6 outline-none transition-all font-medium appearance-none cursor-pointer text-white"
                                        style={inputStyle}
                                        onFocus={handleFocus}
                                        onBlur={handleBlur}
                                        required
                                    >
                                        <option value="doctor" style={{ background: '#111827' }}>Medical Doctor</option>
                                        <option value="admin" style={{ background: '#111827' }}>Administrator</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[2px] ml-4">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Create a strong password"
                                    className="w-full rounded-2xl py-4 pl-14 pr-6 outline-none transition-all font-medium text-white placeholder-gray-600"
                                    style={inputStyle}
                                    onFocus={handleFocus}
                                    onBlur={handleBlur}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[2px] ml-4">Confirm Password</label>
                            <div className="relative group">
                                <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    placeholder="Verify password"
                                    className="w-full rounded-2xl py-4 pl-14 pr-6 outline-none transition-all font-medium text-white placeholder-gray-600"
                                    style={inputStyle}
                                    onFocus={handleFocus}
                                    onBlur={handleBlur}
                                    required
                                />
                            </div>
                        </div>

                        <motion.button
                            type="submit"
                            disabled={isSubmitting}
                            whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                            whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                            className="w-full text-white rounded-2xl py-5 font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                            style={{
                                background: isSubmitting ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
                                boxShadow: isSubmitting ? 'none' : '0 8px 30px rgba(124, 58, 237, 0.35)',
                            }}
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Register <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </motion.button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-gray-500 font-medium text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-purple-400 hover:text-purple-300 font-bold underline underline-offset-4 decoration-2 transition-colors">
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
