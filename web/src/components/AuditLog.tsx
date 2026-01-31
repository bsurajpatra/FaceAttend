import { useState, useEffect } from 'react';
import {
    Activity,
    Smartphone,
    Globe,
    Shield,
    Search,
    RefreshCw
} from 'lucide-react';
import { http } from '../api/http';
import { cn } from '../lib/utils';

interface Log {
    _id: string;
    action: string;
    details: string;
    platform: 'Web' | 'Mobile';
    deviceName?: string;
    ipAddress?: string;
    timestamp: string;
}

export function AuditLog() {
    const [logs, setLogs] = useState<Log[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [platformFilter, setPlatformFilter] = useState<'all' | 'Web' | 'Mobile'>('all');

    const fetchLogs = async () => {
        try {
            setIsLoading(true);
            const res = await http.get('/api/auth/audit-logs');
            setLogs(res.data.logs);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();

        const handleNewLog = (e: any) => {
            const newLog = e.detail;
            setLogs(prev => [newLog, ...prev].slice(0, 100));
        };

        window.addEventListener('new-audit-log', handleNewLog);
        return () => window.removeEventListener('new-audit-log', handleNewLog);
    }, []);

    const filteredLogs = logs.filter((log: Log) => {
        const matchesSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.deviceName?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPlatform = platformFilter === 'all' || log.platform === platformFilter;
        return matchesSearch && matchesPlatform;
    });

    if (isLoading && logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Secure Logs...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-2">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-3">
                        <Activity size={28} className="text-blue-600" />
                        Global Audit Log
                    </h2>
                    <p className="text-slate-500 font-bold mt-1 text-sm uppercase tracking-wider ml-10 text-balance">Real-time activity surveillance across all active credentials</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchLogs}
                        disabled={isLoading}
                        className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-100 transition-all active:scale-95 shadow-sm group"
                    >
                        <RefreshCw size={20} className={cn("group-hover:rotate-180 transition-transform duration-500", isLoading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative col-span-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search logs by action or detail..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-medium transition-all shadow-sm"
                    />
                </div>
                <div className="flex items-center p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
                    {(['all', 'Web', 'Mobile'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPlatformFilter(p)}
                            className={cn(
                                "flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-xl",
                                platformFilter === p
                                    ? "bg-slate-900 text-white shadow-lg"
                                    : "text-slate-500 hover:bg-slate-50"
                            )}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Logs Timeline */}
            <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/50">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-1/4">Event & Action</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Activity Details</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-1/6">Origin</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-1/5 text-right">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredLogs.map((log: Log) => (
                                <tr key={log._id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 duration-300",
                                                log.action.includes('Revoke') || log.action.includes('Logout')
                                                    ? "bg-red-50 text-red-600"
                                                    : log.action.includes('Login') || log.action.includes('Trusted')
                                                        ? "bg-green-50 text-green-600"
                                                        : "bg-blue-50 text-blue-600"
                                            )}>
                                                {log.action.includes('Login') ? <Shield size={18} /> : <Activity size={18} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight italic">{log.action}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    {log.platform === 'Web' ? <Globe size={11} className="text-slate-400" /> : <Smartphone size={11} className="text-slate-400" />}
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{log.platform}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <p className="text-sm font-bold text-slate-600 leading-relaxed max-w-md">{log.details}</p>
                                        {log.ipAddress && (
                                            <span className="text-[10px] font-mono text-slate-400 mt-1 block">IP: {log.ipAddress}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-slate-700 uppercase">{log.deviceName || 'Unknown Source'}</p>
                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-tight">
                                                Active Session
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm font-black text-slate-900 tabular-nums">
                                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                                {new Date(log.timestamp).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 text-slate-300 mb-4">
                                            <Search size={32} />
                                        </div>
                                        <p className="text-slate-500 font-black uppercase tracking-widest text-sm italic">No security logs found</p>
                                        <p className="text-slate-400 text-xs font-bold uppercase mt-2">Try adjusting your filters or search query</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
