import { useState, useEffect } from 'react';
import { User, ShieldCheck, KeyRound, Save, ShieldAlert, Loader2, X } from 'lucide-react';
import { toggle2faApi, verify2faApi, resend2faApi, updateProfileApi, verifyEmailChangeApi } from '../api/auth';
import { cn } from '../lib/utils';

interface ProfileProps {
    user: any;
}

export function Profile({ user }: ProfileProps) {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        username: user?.username || '',
        email: user?.email || '',
    });

    const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
    const [isUpdating2fa, setIsUpdating2fa] = useState(false);

    // OTP Verification State
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [verificationType, setVerificationType] = useState<'2fa-toggle' | 'email-change'>('2fa-toggle');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                username: user.username || '',
                email: user.email || '',
            });
            setTwoFactorEnabled(user.twoFactorEnabled || false);
        }
    }, [user]);

    const handleToggle2fa = async () => {
        setIsUpdating2fa(true);
        try {
            await toggle2faApi(!twoFactorEnabled);
            setVerificationType('2fa-toggle');
            setShowOtpModal(true);
            setResendTimer(60);
        } catch (error) {
            console.error('Failed to toggle 2FA', error);
        } finally {
            setIsUpdating2fa(false);
        }
    };

    const handleUpdateProfile = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await updateProfileApi(formData);

            if (res.emailVerificationRequired) {
                setVerificationType('email-change');
                setShowOtpModal(true);
                setResendTimer(60);
            } else {
                // Optionally show success message
                setError(null);
                // Force reload or state update if needed, but for now assuming silent success or parent update
                window.location.reload();
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to update profile');
        } finally {
            if (!showOtpModal) setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            if (verificationType === '2fa-toggle') {
                await verify2faApi(user.email, otp);
                setTwoFactorEnabled(!twoFactorEnabled);
            } else {
                await verifyEmailChangeApi(otp);
            }
            setShowOtpModal(false);
            setOtp('');
            window.location.reload();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Invalid or expired code.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendTimer > 0) return;
        try {
            if (verificationType === '2fa-toggle') {
                await resend2faApi(user.email);
            } else {
                // Logic for resending email change OTP if endpoint existed
                // For now, no-op or rely on user re-initiating
            }
            setResendTimer(60);
            setError(null);
        } catch (err) {
            setError('Failed to resend code');
        }
    };

    useEffect(() => {
        let interval: any;
        if (resendTimer > 0) {
            interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleChange = (e: any) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden scrollbar-hide">
            <h2 className="text-2xl font-black text-slate-900 mb-4 mt-1 tracking-tight uppercase italic flex items-center gap-3 flex-shrink-0">
                <User size={28} className="text-blue-600" />
                Profile
            </h2>

            <div className="flex-1 overflow-y-auto scrollbar-hide pr-1">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
                    {/* Column 1: Info & Security */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* User Card */}
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm text-center relative overflow-hidden group">
                            <div className="absolute top-0 inset-x-0 h-24 bg-slate-900 group-hover:h-28 transition-all duration-500" />
                            <div className="relative mt-4 mb-4">
                                <div className="w-24 h-24 bg-blue-600 rounded-2xl border-4 border-white mx-auto flex items-center justify-center text-white text-3xl font-black shadow-xl relative overflow-hidden">
                                    {user?.name?.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 px-2 leading-tight">{user?.name}</h3>
                            <p className="text-blue-600 font-bold italic mb-4 text-xs">FACULTY_ID: {user?.username?.toUpperCase() || 'N/A'}</p>
                            <div className="flex justify-center gap-2">
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-full uppercase tracking-tighter border border-emerald-100">Verified</span>
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[9px] font-black rounded-full uppercase tracking-tighter border border-blue-100">Faculty</span>
                            </div>
                        </div>

                        {/* MFA Protection Card */}
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-3xl -mt-12 -mr-12 opacity-50 group-hover:bg-indigo-50 transition-colors" />

                            <h3 className="text-xs font-black text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-widest italic">
                                <ShieldAlert className="text-blue-600" size={16} />
                                MFA Protection
                            </h3>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[12px] font-black text-slate-900 uppercase tracking-tighter">Email OTP</p>
                                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-0.5">Recommended</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleToggle2fa}
                                        disabled={isUpdating2fa}
                                        className={cn(
                                            "relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            twoFactorEnabled ? "bg-blue-600" : "bg-slate-200",
                                            isUpdating2fa && "opacity-50 cursor-wait"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                twoFactorEnabled ? "translate-x-5" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic border-t border-slate-50 pt-3">
                                    Multi-factor authentication adds an extra layer of security. Verified access required via email code on every new session login.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Edit Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden group">
                            <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mb-16 -mr-16 opacity-30 group-hover:bg-indigo-50 transition-colors" />

                            <div className="space-y-6 relative z-10 flex-1">
                                {/* Profile Section */}
                                <section>
                                    <h3 className="text-md font-black text-slate-900 mb-3 flex items-center gap-2">
                                        <ShieldCheck className="text-blue-600" size={18} />
                                        Personal Credentials
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <InputGroup label="Full Name" name="name" placeholder="Your Name" value={formData.name} onChange={handleChange} />
                                        <InputGroup label="Faculty Username" name="username" placeholder="Username" value={formData.username} onChange={handleChange} />
                                        <InputGroup label="Primary Email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} />
                                    </div>
                                </section>

                                <div className="h-[1px] bg-slate-100" />

                                {/* Change Password Section */}
                                <section>
                                    <h3 className="text-md font-black text-slate-900 mb-3 flex items-center gap-2">
                                        <KeyRound className="text-blue-600" size={16} />
                                        Account Security
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="w-full sm:w-1/2">
                                            <InputGroup label="Old Password" type="password" placeholder="••••••••" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <InputGroup label="New Password" type="password" placeholder="••••••••" />
                                            <InputGroup label="Confirm Password" type="password" placeholder="••••••••" />
                                        </div>
                                    </div>
                                </section>

                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleUpdateProfile}
                                        disabled={isLoading}
                                        className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 group text-sm"
                                    >
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save size={18} className="group-hover:animate-bounce" /> SYNC PROFILE</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* OTP Verification Modal */}
            {showOtpModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative">
                        <button
                            onClick={() => setShowOtpModal(false)}
                            className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
                                <ShieldCheck size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">Verify Identity</h3>
                            <p className="text-slate-500 font-medium text-sm mt-2">
                                Please enter the verification code sent to <br />
                                <span className="text-slate-900 font-bold">{verificationType === 'email-change' ? 'new email address' : user.email}</span>
                            </p>
                        </div>

                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Verification Code</label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    maxLength={6}
                                    placeholder="000000"
                                    className="w-full text-center text-3xl font-black tracking-[0.5em] py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-900 placeholder:text-slate-200"
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl text-center animate-shake">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || otp.length !== 6}
                                className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Change'}
                            </button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    disabled={resendTimer > 0}
                                    className={cn(
                                        "text-xs font-bold uppercase tracking-wider transition-colors",
                                        resendTimer > 0 ? "text-slate-300 cursor-wait" : "text-blue-600 hover:text-blue-700"
                                    )}
                                >
                                    {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : "Didn't receive code? Resend"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function InputGroup({ label, ...props }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
            <input
                {...props}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-bold text-slate-900 text-sm placeholder:text-slate-300 shadow-sm outline-none"
            />
        </div>
    );
}
