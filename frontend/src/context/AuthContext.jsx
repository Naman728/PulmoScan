import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';
import { authService } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
    const navigate = useNavigate();

    // Initialize Auth State
    useEffect(() => {
        const handleLogout = () => {
            setToken(null);
            setUser(null);
            localStorage.removeItem('token');
            navigate('/login');
        };

        const initAuth = async () => {
            const savedToken = localStorage.getItem('token');
            if (savedToken) {
                try {
                    const decoded = jwtDecode(savedToken);
                    const currentTime = Date.now() / 1000;

                    if (decoded.exp < currentTime) {
                        handleLogout();
                    } else {
                        setToken(savedToken);
                        // Fetch fresh user data from API
                        try {
                            const userData = await authService.getMe();
                            setUser(userData);
                        } catch (e) {
                            setUser({ email: decoded.email ?? `user_${decoded.user_id ?? 'unknown'}@session`, role: decoded.role ?? 'doctor' });
                        }
                    }
                } catch (error) {
                    handleLogout();
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    // React to 401 (e.g. token cleared by api interceptor)
    useEffect(() => {
        const onSessionExpired = () => {
            setToken(null);
            setUser(null);
            toast.error('Session expired. Please log in again.');
            navigate('/login');
        };
        window.addEventListener('auth:session-expired', onSessionExpired);
        return () => window.removeEventListener('auth:session-expired', onSessionExpired);
    }, [navigate]);

    // Dark Mode Handling
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const handleLogin = async (newToken) => {
        if (!newToken || typeof newToken !== 'string') {
            toast.error('Invalid token received. Please try again.');
            return;
        }
        localStorage.setItem('token', newToken);
        setToken(newToken);

        try {
            const userData = await authService.getMe();
            setUser(userData);
            toast.success(`Welcome Dr. ${userData.email.split('@')[0]}`, {
                icon: '🩺',
                duration: 3000
            });
        } catch (error) {
            try {
                const decoded = jwtDecode(newToken);
                setUser({ email: decoded.email ?? `user_${decoded.user_id ?? 'unknown'}@session`, role: decoded.role ?? 'doctor' });
                toast.success('Access Granted', { icon: '🛡️' });
            } catch (decodeErr) {
                localStorage.removeItem('token');
                setToken(null);
                toast.error('Session setup failed. Please log in again.');
                return;
            }
        }
        navigate('/dashboard');
    };

    const handleLogout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        toast.success('Safe disconnect complete');
        navigate('/login');
    };

    const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

    const value = {
        user,
        token,
        loading,
        isDarkMode,
        toggleDarkMode,
        login: handleLogin,
        logout: handleLogout,
        isAuthenticated: !!token,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
