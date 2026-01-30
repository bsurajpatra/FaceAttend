import React, { useState, useEffect, useCallback } from 'react';
import {
    User,
    Lock,
    ScanFace,
    ChevronRight,
    Loader2,
    CheckCircle2,
    AlertCircle,
    RotateCw,
    ShieldCheck
} from 'lucide-react';
import { loginApi } from '../api/auth';
import { cn } from '../lib/utils';
import logoImg from '../assets/logo.png';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [captchaInput, setCaptchaInput] = useState('');
    const [captchaCode, setCaptchaCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const generateCaptcha = useCallback(() => {
        const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        setCaptchaCode(result);
        setCaptchaInput('');
    }, []);

    useEffect(() => {
        generateCaptcha();
    }, [generateCaptcha]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (captchaInput.toUpperCase() !== captchaCode) {
            setError('Invalid captcha code. Please try again.');
            generateCaptcha();
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await loginApi({ username, password });
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            setSuccess(true);

            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Invalid username or password. Please try again.');
            setIsLoading(false);
            generateCaptcha();
        }
    };

    return (
        <div className="h-screen w-full overflow-hidden bg-white flex font-sans selection:bg-blue-100">
            {/* Background Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-3xl opacity-40" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-3xl opacity-40" />
            </div>

            <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 relative z-10">

                {/* Left Side: Branding/Visuals */}
                <div className="hidden md:flex flex-col justify-between p-12 bg-slate-900 text-white relative overflow-hidden">
                    {/* Subtle Grid Pattern */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-2xl p-2">
                                <img src={logoImg} alt="FaceAttend" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-3xl font-black tracking-tight italic">FaceAttend</span>
                        </div>

                        <h2 className="text-4xl font-extrabold leading-tight mb-6">
                            Intelligent
                            <span className="text-blue-400 text-5xl"> ERP Portal</span>
                        </h2>
                        <p className="text-slate-400 text-lg leading-relaxed max-w-sm opacity-90">
                            Centralized command center for management and security.
                        </p>
                    </div>

                    <div className="relative z-10 mt-auto">
                        {/* Face Recognition SVG Illustration */}
                        <div className="relative w-full aspect-square max-w-[240px] mx-auto mb-8 bg-blue-500/10 rounded-[2.5rem] border border-white/5 flex items-center justify-center p-8 backdrop-blur-sm">
                            <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-blue-500/30" />
                            <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-blue-500/30" />
                            <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-blue-500/30" />
                            <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-blue-500/30" />

                            <div className="relative">
                                <ScanFace className="w-48 h-48 text-white/90 animate-pulse" strokeWidth={1} />
                                {/* Scanning line animation */}
                                <div className="absolute top-0 left-0 right-0 h-[3px] bg-blue-400 shadow-[0_0_15px_#60a5fa] animate-[scan_3s_ease-in-out_infinite]" />
                            </div>

                            {/* Success Indicators */}
                            <div className="absolute -bottom-4 -right-4 bg-emerald-500 p-4 rounded-full border-4 border-slate-900 shadow-2xl scale-110">
                                <ShieldCheck className="w-8 h-8 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 text-slate-400 text-sm flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
                        <div className="flex flex-col">
                            <span className="text-white font-bold text-lg">ERP Console</span>
                            <span className="opacity-80">Faculty Management System</span>
                        </div>
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="h-full p-6 md:p-12 flex flex-col justify-center items-center bg-white overflow-y-auto">
                    <div className="w-full max-w-md">
                        <div className="mb-10 block md:hidden text-center">
                            <div className="flex items-center justify-center gap-4 mb-4">
                                <img src={logoImg} alt="FaceAttend" className="w-16 h-16 object-contain" />
                                <span className="text-4xl font-black tracking-tight text-slate-800 italic">FaceAttend</span>
                            </div>
                        </div>

                        <div className="mb-8 text-center">
                            <h3 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Login Portal</h3>
                            <p className="text-slate-500 text-lg">Log in to manage your sessions.</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5 w-full">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 ml-1 uppercase tracking-wider block text-center md:text-left">Username</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="block w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-medium"
                                        placeholder="your_username"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 ml-1 uppercase tracking-wider block text-center md:text-left">Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-medium"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 ml-1 uppercase tracking-wider block text-center md:text-left">Security Captcha</label>
                                <div className="flex gap-4 items-center">
                                    <div className="flex-1 relative group">
                                        <input
                                            type="text"
                                            required
                                            value={captchaInput}
                                            onChange={(e) => setCaptchaInput(e.target.value)}
                                            className="block w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-bold tracking-[0.5em] text-center italic"
                                            placeholder="CODE"
                                            maxLength={6}
                                        />
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div
                                            className="h-12 w-32 bg-slate-900 rounded-xl flex items-center justify-center font-black text-xl italic tracking-widest text-white select-none relative overflow-hidden shadow-inner border-2 border-slate-800 cursor-not-allowed group"
                                            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
                                        >
                                            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0px, #000 2px, transparent 2px, transparent 4px)' }} />
                                            {captchaCode}
                                            <div className="absolute top-0 bottom-0 left-0 right-0 border border-white/5 pointer-events-none" />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={generateCaptcha}
                                            className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition-all"
                                            title="Refresh Captcha"
                                        >
                                            <RotateCw className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-100 text-red-600 px-5 py-4 rounded-2xl flex items-center gap-3 animate-shake shadow-sm">
                                    <AlertCircle className="w-6 h-6 flex-shrink-0" />
                                    <span className="text-sm font-bold">{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || success}
                                className={cn(
                                    "w-full flex items-center justify-center gap-3 py-4 px-8 rounded-2xl text-white font-black text-lg shadow-2xl shadow-blue-200 transition-all active:scale-[0.97] mt-4",
                                    success ? "bg-emerald-500 shadow-emerald-100" : "bg-blue-600 hover:bg-blue-700"
                                )}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                ) : success ? (
                                    <>
                                        <CheckCircle2 className="w-8 h-8" />
                                        AUTHENTICATED
                                    </>
                                ) : (
                                    <>
                                        ENTER PORTAL
                                        <ChevronRight className="w-7 h-7" />
                                    </>
                                )}
                            </button>

                            <div className="text-center mt-6">
                                <p className="text-slate-500 text-sm">
                                    Don't have an account?{' '}
                                    <a href="/signup" className="text-blue-600 font-bold hover:underline">
                                        Register here
                                    </a>
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes scan {
                    0%, 100% { top: 0; }
                    50% { top: 100%; }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-6px); }
                    75% { transform: translateX(6px); }
                }
                .animate-shake {
                    animation: shake 0.2s cubic-bezier(.36,.07,.19,.97) both;
                }
                input::placeholder {
                    letter-spacing: normal;
                    font-style: normal;
                }
            `}</style>
        </div>
    );
}
