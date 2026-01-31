import React, { useState, useEffect } from 'react';
import {
    Lock,
    Eye,
    EyeOff,
    CheckCircle2,
    Loader2,
    ShieldCheck,
    AlertCircle
} from 'lucide-react';
import { resetPasswordApi } from '../api/auth';
import logoImg from '../assets/logo.png';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const t = urlParams.get('token');
        setToken(t);
        if (!t) {
            setError('Invalid or missing reset token.');
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (!token) {
            setError('Invalid reset token');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await resetPasswordApi({ token, password });
            setSuccess(true);
            setTimeout(() => {
                window.location.href = '/login';
            }, 3000);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to reset password. The link may have expired.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen w-full overflow-hidden bg-white flex font-sans selection:bg-blue-100">
            {/* Background Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-3xl opacity-40" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-3xl opacity-40" />
            </div>

            <div className="w-full h-full flex flex-col justify-center items-center relative z-10 p-6">
                <div className="w-full max-w-md text-center">
                    <div className="flex items-center justify-center gap-3 mb-10">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-2xl p-2 border border-slate-100">
                            <img src={logoImg} alt="FaceAttend" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-2xl font-black tracking-tight text-slate-800 italic">FaceAttend</span>
                    </div>

                    <div className="bg-white border border-slate-100 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden">
                        {success ? (
                            <div className="space-y-6 animate-in zoom-in-95 duration-500">
                                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-200">
                                    <CheckCircle2 className="w-10 h-10 text-white" />
                                </div>
                                <div className="space-y-2 text-center">
                                    <h3 className="text-2xl font-black text-slate-900 uppercase">Security Restored</h3>
                                    <p className="text-slate-500 font-medium">Your password has been reset successfully. Redirecting you to login...</p>
                                </div>
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
                            </div>
                        ) : (
                            <>
                                <div className="mb-10 text-center">
                                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                                        <ShieldCheck size={32} />
                                    </div>
                                    <h3 className="text-3xl font-black text-slate-900 mb-2 uppercase italic tracking-tight">Set New Password</h3>
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Ensure your new credentials meet security requirements</p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5 text-left">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest block">New Password</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                            </div>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="block w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-bold"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest block">Confirm Password</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                            </div>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-bold"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="bg-red-50 border border-red-100 text-red-600 px-5 py-4 rounded-2xl flex items-center gap-3 shadow-sm animate-in shake-in">
                                            <AlertCircle className="w-6 h-6 flex-shrink-0" />
                                            <span className="text-sm font-bold">{error}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isLoading || !token}
                                        className="w-full flex items-center justify-center gap-3 py-4 px-8 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 transition-all active:scale-95 italic mt-4"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            "Update Security Key"
                                        )}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
