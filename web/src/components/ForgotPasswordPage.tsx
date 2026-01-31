import React, { useState } from 'react';
import {
    ArrowLeft,
    Mail,
    Send,
    Loader2,
    CheckCircle2,
    Lock,
    AlertCircle
} from 'lucide-react';
import logoImg from '../assets/logo.png';
import { forgotPasswordApi } from '../api/auth';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await forgotPasswordApi(email);
            setSuccess(true);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
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
                <div className="w-full max-w-md">
                    {/* Brand */}
                    <div className="flex items-center justify-center gap-3 mb-12">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-2xl p-2 border border-slate-100">
                            <img src={logoImg} alt="FaceAttend" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-2xl font-black tracking-tight text-slate-800 italic">FaceAttend</span>
                    </div>

                    <div className="bg-white border border-slate-100 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden">
                        {/* Decorative background for success */}
                        {success && (
                            <div className="absolute inset-0 bg-emerald-50/50 animate-in fade-in duration-500" />
                        )}

                        <div className="relative z-10">
                            {success ? (
                                <div className="text-center space-y-6 animate-in zoom-in-95 duration-500">
                                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-200">
                                        <CheckCircle2 className="w-10 h-10 text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-slate-900 uppercase">Check your email</h3>
                                        <p className="text-slate-500 font-medium">We've sent recovery instructions to <br /><span className="text-slate-900 font-bold">{email}</span></p>
                                    </div>
                                    <button
                                        onClick={() => window.location.href = '/login'}
                                        className="w-full py-4 px-8 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
                                    >
                                        Back to Login
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-10 text-center">
                                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 flex-shrink-0">
                                            <Lock size={32} />
                                        </div>
                                        <h3 className="text-3xl font-black text-slate-900 mb-2 uppercase italic tracking-tight">Recover Access</h3>
                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Enter your email to reset security credentials</p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest block">Registered Email</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                                    <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                                </div>
                                                <input
                                                    type="email"
                                                    required
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-bold"
                                                    placeholder="faculty@university.edu"
                                                />
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="bg-red-50 border border-red-100 text-red-600 px-5 py-4 rounded-2xl flex items-center gap-3 shadow-sm">
                                                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                                                <span className="text-sm font-bold">{error}</span>
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full flex items-center justify-center gap-3 py-4 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-blue-200 transition-all active:scale-95 italic"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                            ) : (
                                                <>
                                                    Send Reset Link
                                                    <Send size={18} />
                                                </>
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => window.location.href = '/login'}
                                            className="w-full flex items-center justify-center gap-2 py-4 text-slate-400 hover:text-slate-600 font-black text-xs uppercase tracking-widest transition-all group"
                                        >
                                            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                                            Back to Login
                                        </button>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mt-12 text-center">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">SafeAttend Security Protocols Active</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
