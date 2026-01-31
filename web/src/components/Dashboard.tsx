
import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    User,
    LogOut,
    Menu,
    Bell,
    Search,
    ShieldCheck,
    Clock,
    BookOpen,
    MapPin as MapPinIcon,
    History,
    UserPlus,
    Users
} from 'lucide-react';
import { cn } from '../lib/utils';
import logoImg from '../assets/logo.png';
import { getTimetableApi } from '../api/timetable';
import { getProfileApi } from '../api/auth';
import { getCurrentSession } from '../lib/timeSlots';
import { Profile } from './Profile';
import { AttendanceReports } from './AttendanceReports';
import TimetableManager from './TimetableManager';
import { StudentRegistration } from './StudentRegistration';
import { StudentManagement } from './StudentManagement';
import MyDevices from './MyDevices';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [user, setUser] = useState<any>(null);

    const [timetable, setTimetable] = useState<any[]>([]);

    const fetchTimetable = async (userId: string) => {
        try {
            const res = await getTimetableApi(userId);
            setTimetable(res.timetable || []);
        } catch (err) {
            console.error('Failed to fetch timetable', err);
        }
    };

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);

            // Fetch full profile from DB
            getProfileApi()
                .then(res => {
                    setUser(res.user);
                    localStorage.setItem('user', JSON.stringify(res.user));
                })
                .catch(err => console.error('Failed to fetch profile', err));

            // Fetch timetable
            fetchTimetable(parsedUser.id);
        } else {
            window.location.href = '/login';
        }
    }, []);

    // Refresh timetable when switching to overview
    useEffect(() => {
        if (activeTab === 'overview' && user?.id) {
            fetchTimetable(user.id);
        }
    }, [activeTab, user?.id]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    if (!user) return null;

    return (
        <div className="h-screen bg-slate-50 flex font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className={cn(
                "bg-slate-900 text-white transition-all duration-300 z-50 flex flex-col flex-shrink-0",
                isSidebarOpen ? "w-72" : "w-20"
            )}>
                {/* Sidebar Header */}
                <div className="p-6 flex items-center gap-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => setActiveTab('overview')}>
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1 flex-shrink-0">
                        <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    {isSidebarOpen && <span className="text-xl font-bold tracking-tight italic">FaceAttend</span>}
                </div>

                {/* Sidebar Content */}
                <nav className="flex-1 p-4 space-y-2">
                    <SidebarItem
                        icon={<LayoutDashboard />}
                        label="Overview"
                        active={activeTab === 'overview'}
                        isOpen={isSidebarOpen}
                        onClick={() => setActiveTab('overview')}
                    />
                    <SidebarItem
                        icon={<UserPlus />}
                        label="Registration"
                        active={activeTab === 'registration'}
                        isOpen={isSidebarOpen}
                        onClick={() => setActiveTab('registration')}
                    />
                    <SidebarItem
                        icon={<Users />}
                        label="Students"
                        active={activeTab === 'students'}
                        isOpen={isSidebarOpen}
                        onClick={() => setActiveTab('students')}
                    />
                    <SidebarItem
                        icon={<BookOpen />}
                        label="Timetable"
                        active={activeTab === 'timetable'}
                        isOpen={isSidebarOpen}
                        onClick={() => setActiveTab('timetable')}
                    />
                    <SidebarItem
                        icon={<History />}
                        label="Attendance Reports"
                        active={activeTab === 'reports'}
                        isOpen={isSidebarOpen}
                        onClick={() => setActiveTab('reports')}
                    />
                    <SidebarItem
                        icon={<User />}
                        label="My Profile"
                        active={activeTab === 'profile'}
                        isOpen={isSidebarOpen}
                        onClick={() => setActiveTab('profile')}
                    />
                    <SidebarItem
                        icon={<ShieldCheck />}
                        label="My Devices"
                        active={activeTab === 'devices'}
                        isOpen={isSidebarOpen}
                        onClick={() => setActiveTab('devices')}
                    />
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className={cn(
                            "flex items-center gap-4 w-full p-4 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all",
                            !isSidebarOpen && "justify-center px-0"
                        )}
                    >
                        <LogOut size={24} />
                        {isSidebarOpen && <span className="font-bold uppercase tracking-widest text-sm">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
                {/* Header */}
                <header className="bg-white border-b border-slate-200 sticky top-0 z-40 p-4">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all"
                        >
                            <Menu size={24} />
                        </button>

                        <div className="flex items-center gap-6">
                            <div className="relative hidden md:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search console..."
                                    className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64 text-sm transition-all text-slate-900"
                                />
                            </div>
                            <div className="flex items-center gap-4">
                                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 relative transition-all">
                                    <Bell size={22} />
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                                </button>
                                <div className="h-10 w-[1px] bg-slate-200" />
                                <div className="flex items-center gap-3 bg-slate-50 p-1 pr-4 rounded-full border border-slate-100">
                                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-200">
                                        {user.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 hidden sm:block">{user.name}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dashboard Content - The only scrolling area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                    <div className="max-w-7xl mx-auto h-full flex flex-col">
                        {activeTab === 'overview' && <OverviewSection user={user} timetable={timetable} />}
                        {activeTab === 'registration' && <StudentRegistration user={user} timetable={timetable} />}
                        {activeTab === 'students' && <StudentManagement user={user} timetable={timetable} />}
                        {activeTab === 'timetable' && <TimetableManager />}
                        {activeTab === 'reports' && <AttendanceReports />}
                        {activeTab === 'profile' && <Profile user={user} />}
                        {activeTab === 'devices' && <MyDevices user={user} />}
                    </div>
                </div>
            </main>
        </div>
    );
}

function SidebarItem({ icon, label, active, isOpen, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-4 w-full p-4 rounded-2xl transition-all duration-200 group relative text-left",
                active
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white",
                !isOpen && "justify-center px-0"
            )}
        >
            <div className={cn("flex-shrink-0 transition-transform group-hover:scale-110", active && "scale-110")}>
                {React.cloneElement(icon, { size: 24 })}
            </div>
            {isOpen && <span className="font-bold text-sm uppercase tracking-widest flex-1">{label}</span>}
            {!isOpen && active && (
                <div className="absolute left-0 w-1 h-8 bg-white rounded-r-full" />
            )}
        </button>
    );
}

function OverviewSection({ user, timetable }: any) {
    const currentSession = getCurrentSession(timetable);

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center max-w-4xl mx-auto">
            <div className="space-y-4">
                <h1 className="text-5xl font-black text-slate-900 tracking-tight">
                    Welcome back, <span className="text-blue-600 italic">{user.name}</span> !
                </h1>
                <p className="text-slate-500 text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                    Manage your attendance records and profile from the ERP console.
                </p>
            </div>

            {currentSession ? (
                <div className="bg-white overflow-hidden rounded-[3rem] border border-slate-200 shadow-2xl flex flex-col md:flex-row items-stretch group hover:scale-[1.01] transition-transform duration-500">
                    <div className="bg-slate-900 p-10 flex flex-col items-center justify-center text-white min-w-[240px] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '15px 15px' }} />
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-blue-600/20 relative z-10 group-hover:rotate-12 transition-transform">
                            <Clock size={32} />
                        </div>
                        <span className="text-blue-400 font-black uppercase tracking-[0.2em] text-xs mb-1 relative z-10">Current Session</span>
                        <h4 className="text-3xl font-black italic tracking-tighter relative z-10">{currentSession.timeSlot}</h4>
                    </div>
                    <div className="flex-1 p-10 text-left flex flex-col justify-center relative">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                            <BookOpen size={120} />
                        </div>
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-5 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-blue-100 italic">
                                {currentSession.sessionType}
                            </span>
                            <span className="px-5 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-emerald-100 italic">
                                SEC: {currentSession.section}
                            </span>
                        </div>
                        <h3 className="text-4xl font-black text-slate-900 mb-6 tracking-tighter group-hover:text-blue-600 transition-colors uppercase italic">{currentSession.subject}</h3>
                        <div className="flex items-center gap-6 text-slate-500 font-bold">
                            <div className="flex items-center gap-2">
                                <MapPinIcon size={20} className="text-blue-500" />
                                <span className="text-lg uppercase tracking-tight">Room {currentSession.roomNumber}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 p-16 group hover:border-slate-300 transition-colors">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                        <Clock size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-400 tracking-tight italic uppercase">No Ongoing Session</h3>
                    <p className="text-slate-400 font-medium mt-2">Check your timetable for upcoming classes.</p>
                </div>
            )}
        </div>
    );
}
