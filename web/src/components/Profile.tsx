import { useState, useEffect } from 'react';
import { User, ShieldCheck, KeyRound, Save } from 'lucide-react';

interface ProfileProps {
    user: any;
}

export function Profile({ user }: ProfileProps) {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        username: user?.username || '',
        email: user?.email || '',
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                username: user.username || '',
                email: user.email || '',
            });
        }
    }, [user]);

    const handleChange = (e: any) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-black text-slate-900 mb-4 mt-1 tracking-tight uppercase italic flex items-center gap-3">
                <User size={28} className="text-blue-600" />
                Profile
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
                {/* Profile Card */}
                <div className="lg:col-span-1">
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
                </div>

                {/* Edit Form */}
                <div className="lg:col-span-2">
                    <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden group">
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mb-16 -mr-16 opacity-30 group-hover:bg-indigo-50 transition-colors" />

                        <div className="space-y-4 relative z-10 flex-1">
                            {/* Profile Section */}
                            <section>
                                <h3 className="text-md font-black text-slate-900 mb-2 flex items-center gap-2">
                                    <ShieldCheck className="text-blue-600" size={18} />
                                    Personal Credentials
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <InputGroup label="Full Name" name="name" placeholder="Your Name" value={formData.name} onChange={handleChange} />
                                    <InputGroup label="Faculty Username" name="username" placeholder="Username" value={formData.username} onChange={handleChange} />
                                    <InputGroup label="Primary Email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} />
                                </div>
                            </section>

                            <div className="h-[1px] bg-slate-100" />

                            {/* Change Password Section */}
                            <section>
                                <h3 className="text-md font-black text-slate-900 mb-2 flex items-center gap-2">
                                    <KeyRound className="text-blue-600" size={16} />
                                    Change Password
                                </h3>
                                <div className="space-y-3">
                                    <div className="w-full sm:w-1/2">
                                        <InputGroup label="Old Password" type="password" placeholder="••••••••" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <InputGroup label="New Password" type="password" placeholder="••••••••" />
                                        <InputGroup label="Confirm Password" type="password" placeholder="••••••••" />
                                    </div>
                                </div>
                            </section>

                            <div className="pt-1 flex justify-end">
                                <button type="button" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 group text-sm">
                                    <Save size={18} className="group-hover:animate-bounce" />
                                    SYNC PROFILE
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
