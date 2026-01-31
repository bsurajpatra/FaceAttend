
import React, { useState, useEffect, useRef } from 'react';
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
    Users,
    Smartphone,
    Calendar,
    ExternalLink,
    X,
    CheckCircle2
} from 'lucide-react';
import { io } from 'socket.io-client';
import { cn } from '../lib/utils';
import logoImg from '../assets/logo.png';
import { getTimetableApi } from '../api/timetable';
import { getProfileApi } from '../api/auth';
import { getCurrentSession, getNextSession } from '../lib/timeSlots';
import { Profile } from './Profile';
import { AttendanceReports } from './AttendanceReports';
import TimetableManager from './TimetableManager';
import { StudentRegistration } from './StudentRegistration';
import { StudentManagement } from './StudentManagement';
import MyDevices from './MyDevices';
import { FacultyActivitySummary } from './FacultyActivitySummary';


export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);

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

    const notifiedSessions = useRef<Set<string>>(new Set());

    // Socket and Notification Logic
    useEffect(() => {
        if (!user?.id) return;

        const apiUrl = import.meta.env.VITE_API_URL;
        const socketUrl = apiUrl.split(',')[0].trim();
        const socket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            auth: { token: localStorage.getItem('token') },
            reconnection: true,
            reconnectionAttempts: 5
        });

        socket.on('connect', () => {
            socket.emit('join_room', `faculty_${user.id}`);
        });

        socket.on('devices_updated', () => {
            const newNotif = {
                id: Date.now(),
                type: 'device',
                title: 'Security Sync',
                message: 'Hardware trust status updated across your devices.',
                time: 'Just now',
                icon: <Smartphone className="text-blue-500" size={18} />,
                isNew: true
            };
            setNotifications(prev => [newNotif, ...prev.slice(0, 9)]);
        });

        socket.on('attendance_updated', (data) => {
            console.log('Attendance updated:', data);
            // We can add a notification or just let components refresh
            if (data.type === 'session_started') {
                const newNotif = {
                    id: Date.now(),
                    type: 'attendance',
                    title: 'Session Started',
                    message: `${data.subject} (${data.section}) attendance session is live.`,
                    time: 'Just now',
                    icon: <CheckCircle2 className="text-emerald-500" size={18} />,
                    isNew: true
                };
                setNotifications(prev => [newNotif, ...prev.slice(0, 9)]);
            }

            // Trigger a refresh of the metrics
            // We'll use a custom event or state change
            window.dispatchEvent(new CustomEvent('refresh-attendance-metrics'));
        });

        socket.on('timetable_updated', (data: { timetable: any[] }) => {
            console.log('Timetable updated via socket:', data);
            setTimetable(data.timetable);

            // Notification for sync
            const newNotif = {
                id: Date.now(),
                type: 'timetable',
                title: 'Schedule Updated',
                message: 'Your timetable has been synchronized with the latest ERP changes.',
                time: 'Just now',
                icon: <Calendar className="text-blue-500" size={18} />,
                isNew: true
            };
            setNotifications(prev => [newNotif, ...prev.slice(0, 9)]);
        });


        // Interval for session checks
        const checkSessions = () => {
            const current = getCurrentSession(timetable);
            const next = getNextSession(timetable);

            const newNotifs: any[] = [];

            if (current) {
                const sessionKey = `current-${current.subject}-${current.timeSlot}-${new Date().toDateString()}`;
                if (!notifiedSessions.current.has(sessionKey)) {
                    notifiedSessions.current.add(sessionKey);
                    newNotifs.push({
                        id: 'current-' + Date.now(),
                        type: 'current',
                        title: 'Ongoing Session',
                        message: `Currently: ${current.subject} (${current.timeSlot})`,
                        time: 'Live',
                        icon: <Clock className="text-green-500" size={18} />,
                        isNew: true
                    });
                }
            }

            if (next && next.minutesUntil <= 20) {
                const sessionKey = `reminder-${next.subject}-${next.startTime}-${new Date().toDateString()}`;
                if (!notifiedSessions.current.has(sessionKey)) {
                    notifiedSessions.current.add(sessionKey);
                    newNotifs.push({
                        id: 'reminder-' + Date.now(),
                        type: 'reminder',
                        title: 'Upcoming Session',
                        message: `Starts in ${next.minutesUntil}m: ${next.subject}`,
                        time: '20m early',
                        icon: <Calendar className="text-orange-500" size={18} />,
                        isNew: true,
                        action: () => setActiveTab('timetable')
                    });
                }
            }

            if (newNotifs.length > 0) {
                setNotifications(prev => [...newNotifs, ...prev].slice(0, 10));
            }
        };

        const interval = setInterval(checkSessions, 60000); // Check every minute
        checkSessions(); // Initial check

        return () => {
            socket.disconnect();
            clearInterval(interval);
        };
    }, [user?.id, timetable]);

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
                <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4">
                    <div className="flex justify-between items-center">
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
                                <div className="relative">
                                    <button
                                        onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                                        className={cn(
                                            "p-2 hover:bg-slate-100 rounded-lg text-slate-600 relative transition-all",
                                            isNotificationOpen && "bg-slate-100 text-blue-600"
                                        )}
                                    >
                                        <Bell size={22} />
                                        {notifications.some(n => n.isNew) && (
                                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                                        )}
                                    </button>

                                    {/* Notification Dropdown */}
                                    {isNotificationOpen && (
                                        <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                                    Notifications
                                                    <span className="bg-blue-100 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                                                        {notifications.length}
                                                    </span>
                                                </h3>
                                                <button
                                                    onClick={() => setIsNotificationOpen(false)}
                                                    className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <div className="max-h-[400px] overflow-y-auto">
                                                {notifications.length > 0 ? (
                                                    notifications.map((notif) => (
                                                        <div
                                                            key={notif.id}
                                                            onClick={() => {
                                                                if (notif.action) notif.action();
                                                                setIsNotificationOpen(false);
                                                                // Clear new status
                                                                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isNew: false } : n));
                                                            }}
                                                            className={cn(
                                                                "p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer group relative",
                                                                notif.isNew && "bg-blue-50/30"
                                                            )}
                                                        >
                                                            <div className="flex gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                                                                    {notif.icon}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex justify-between items-start mb-0.5">
                                                                        <p className="text-sm font-bold text-slate-900 truncate">{notif.title}</p>
                                                                        <span className="text-[10px] text-slate-400 font-medium">{notif.time}</span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-500 leading-normal line-clamp-2">{notif.message}</p>
                                                                    {notif.action && (
                                                                        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase tracking-tight">
                                                                            View Details <ExternalLink size={10} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {notif.isNew && (
                                                                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-full" />
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-8 text-center">
                                                        <Bell className="mx-auto text-slate-200 mb-2" size={32} />
                                                        <p className="text-sm text-slate-400 font-medium">No new notifications</p>
                                                    </div>
                                                )}
                                            </div>
                                            {notifications.length > 0 && (
                                                <button
                                                    onClick={() => setNotifications([])}
                                                    className="w-full p-3 text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-50/50 transition-all border-t border-slate-100 bg-slate-50/30"
                                                >
                                                    Clear All Notifications
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
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

                {/* Dashboard Content - Flexible scrolling area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10">
                    <div className="max-w-6xl mx-auto">
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center max-w-4xl mx-auto">
            <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                    Welcome back, <span className="text-blue-600 italic">{user.name}</span> !
                </h1>
                <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto leading-relaxed">
                    Manage your attendance records and profile from the ERP console.
                </p>
            </div>

            {currentSession ? (
                <div className="bg-white overflow-hidden rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col md:flex-row items-stretch group hover:scale-[1.01] transition-transform duration-500">
                    <div className="bg-slate-900 p-6 md:p-8 flex flex-col items-center justify-center text-white min-w-[200px] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '15px 15px' }} />
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-3 shadow-xl relative z-10 group-hover:rotate-12 transition-transform">
                            <Clock size={24} />
                        </div>
                        <span className="text-blue-400 font-black uppercase tracking-[0.2em] text-[10px] mb-1 relative z-10">Current Session</span>
                        <h4 className="text-2xl font-black italic tracking-tighter relative z-10">{currentSession.timeSlot}</h4>
                    </div>
                    <div className="flex-1 p-6 md:p-8 text-left flex flex-col justify-center relative">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                            <BookOpen size={100} />
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="px-4 py-1 bg-blue-50 text-blue-600 text-[9px] font-black rounded-full uppercase tracking-widest border border-blue-100 italic">
                                {currentSession.sessionType}
                            </span>
                            <span className="px-4 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-full uppercase tracking-widest border border-emerald-100 italic">
                                SEC: {currentSession.section}
                            </span>
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter group-hover:text-blue-600 transition-colors uppercase italic">{currentSession.subject}</h3>
                        <div className="flex items-center gap-4 text-slate-500 font-bold">
                            <div className="flex items-center gap-2">
                                <MapPinIcon size={18} className="text-blue-500" />
                                <span className="text-base uppercase tracking-tight">Room {currentSession.roomNumber}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 p-10 group hover:border-slate-300 transition-colors">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                        <Clock size={28} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-black text-slate-400 tracking-tight italic uppercase">No Ongoing Session</h3>
                    <p className="text-slate-400 text-sm font-medium mt-1">Check your timetable for upcoming classes.</p>
                </div>
            )}

            <FacultyActivitySummary user={user} timetable={timetable} />
        </div>
    );
}
