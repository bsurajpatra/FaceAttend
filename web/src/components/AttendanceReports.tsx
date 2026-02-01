import { useState, useEffect } from 'react';
import {
    Clock,
    Users,
    ArrowLeft,
    Search,
    RefreshCw,
    MapPin,
    CheckCircle2,
    XCircle,
    FileSpreadsheet,
    FileText,
    Calendar
} from 'lucide-react';
import { getAttendanceReportsApi, getAttendanceSessionApi } from '../api/attendance';
import { getTimeRange } from '../lib/timeSlots';
import { cn } from '../lib/utils';

export function AttendanceReports() {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const loadReports = async () => {
        try {
            setLoading(true);
            const res = await getAttendanceReportsApi();
            setReports(res.sessions || []);
        } catch (err) {
            console.error('Failed to load reports', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    const handleSessionClick = async (session: any) => {
        try {
            const res = await getAttendanceSessionApi(session.id);
            setSelectedSession({
                ...session, // Start with the list view data (contains location)
                ...res.session, // Overwrite with full session details
                presentStudentsList: res.presentStudentsList || [],
                absentStudentsList: res.absentStudentsList || [],
                location: (res as any).session?.location || (res as any).location || session.location // Final check for location
            });
        } catch (err) {
            console.error('Failed to load session details', err);
            setSelectedSession(session);
        } finally {
            // Loading finished
        }
    };

    const formatLocation = (location: any) => {
        if (!location) return 'Location unavailable';

        const hasAddress = location.address && location.address.trim() !== '';
        const hasCoordinates = location.latitude && location.longitude;

        if (hasAddress && hasCoordinates) {
            return `${location.address} (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`;
        } else if (hasAddress) {
            return location.address;
        } else if (hasCoordinates) {
            return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
        } else {
            return 'Location unavailable';
        }
    };


    const exportToPDF = (session: any) => {
        const fmt = (d: any) => d ? new Date(d).toLocaleString() : '';
        const pres = (session.presentStudentsList || []).map((st: any) => `
            <tr>
                <td>${st.name}</td>
                <td>${st.rollNumber}</td>
                <td>${fmt(st.markedAt)}</td>
                <td>${st.confidence != null ? Math.round(st.confidence * 100) + '%' : ''}</td>
            </tr>
        `).join('');
        const abss = (session.absentStudentsList || []).map((st: any) => `
            <tr>
                <td>${st.name}</td>
                <td>${st.rollNumber}</td>
            </tr>
        `).join('');

        const html = `
            <html>
                <head>
                    <title>Attendance Report - ${session.subject}</title>
                    <style>
                        body { font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; }
                        .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
                        h1 { margin: 0; color: #0f172a; font-size: 24px; font-weight: 800; text-transform: uppercase; font-style: italic; }
                        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                        .meta-item { background: #f8fafc; padding: 15px; rounded: 12px; border: 1px solid #e2e8f0; }
                        .meta-item strong { display: block; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
                        .meta-item span { font-weight: 700; color: #0f172a; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; }
                        th { background: #f1f5f9; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; }
                        td { font-size: 13px; font-weight: 500; }
                        .status-present { color: #10b981; font-weight: 800; text-transform: uppercase; font-size: 10px; }
                        .status-absent { color: #ef4444; font-weight: 800; text-transform: uppercase; font-size: 10px; }
                        .section-title { margin-top: 40px; font-size: 16px; font-weight: 800; text-transform: uppercase; font-style: italic; color: #334155; border-left: 4px solid #3b82f6; padding-left: 12px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Attendance Report</h1>
                        <p style="margin: 5px 0 0; color: #64748b; font-weight: 600;">Generated on ${new Date().toLocaleString()}</p>
                    </div>
                    <div class="meta">
                        <div class="meta-item"><strong>Subject</strong><span>${session.subject}</span></div>
                        <div class="meta-item"><strong>Section</strong><span>${session.section}</span></div>
                        <div class="meta-item"><strong>Type</strong><span>${session.sessionType}</span></div>
                        <div class="meta-item"><strong>Date</strong><span>${fmt(session.date)}</span></div>
                        <div class="meta-item"><strong>Schedule</strong><span>${getTimeRange(session.hours)}</span></div>
                        <div class="meta-item"><strong>Location</strong><span>${formatLocation(session.location)}</span></div>
                        <div class="meta-item"><strong>Summary</strong><span>${session.presentStudents} Present / ${session.totalStudents} Total (${session.attendancePercentage}%)</span></div>
                    </div>

                    <h2 class="section-title">Present Students (${session.presentStudentsList.length})</h2>
                    <table>
                        <thead><tr><th>Name</th><th>Roll Number</th><th>Marked At</th><th>Confidence</th></tr></thead>
                        <tbody>${pres || '<tr><td colspan="4" style="text-align:center; padding: 40px; color: #94a3b8;">No records</td></tr>'}</tbody>
                    </table>

                    <h2 class="section-title">Absent Students (${session.absentStudentsList.length})</h2>
                    <table>
                        <thead><tr><th>Name</th><th>Roll Number</th></tr></thead>
                        <tbody>${abss || '<tr><td colspan="2" style="text-align:center; padding: 40px; color: #94a3b8;">No records</td></tr>'}</tbody>
                    </table>
                </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };

    const exportToCSV = (session: any) => {
        const headers = ['Name', 'Roll Number', 'Status', 'Marked At', 'Confidence'];
        const rows = [
            ...(session.presentStudentsList || []).map((s: any) => [
                s.name,
                s.rollNumber,
                'Present',
                s.markedAt ? new Date(s.markedAt).toLocaleString() : '',
                s.confidence ? Math.round(s.confidence * 100) + '%' : ''
            ]),
            ...(session.absentStudentsList || []).map((s: any) => [
                s.name,
                s.rollNumber,
                'Absent',
                '',
                ''
            ])
        ];

        const csvContent = [
            ['Report', `${session.subject} - ${session.section}`],
            ['Date', new Date(session.date).toLocaleString()],
            ['Type', session.sessionType],
            ['Location', formatLocation(session.location)],
            [],
            headers,
            ...rows
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Attendance_${session.subject}_${session.section}_${new Date(session.date).toLocaleDateString()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredReports = reports.filter(r =>
        r.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.section.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (selectedSession) {
        return (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                    <button
                        onClick={() => setSelectedSession(null)}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors group px-2"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        BACK TO REPORTS
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => exportToCSV(selectedSession)}
                            className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-2 rounded-xl font-black flex items-center gap-2 hover:bg-emerald-100 transition-all active:scale-[0.98] shadow-sm uppercase tracking-widest text-[10px] italic"
                        >
                            <FileSpreadsheet size={16} />
                            CSV
                        </button>
                        <button
                            onClick={() => exportToPDF(selectedSession)}
                            className="bg-red-50 text-red-600 border border-red-100 px-4 py-2 rounded-xl font-black flex items-center gap-2 hover:bg-red-100 transition-all active:scale-[0.98] shadow-sm uppercase tracking-widest text-[10px] italic"
                        >
                            <FileText size={16} />
                            PDF
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0 overflow-hidden">
                    {/* Session Summary Card */}
                    <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                <Clock size={100} />
                            </div>

                            <div className="relative z-10">
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[9px] font-black rounded-full uppercase tracking-widest border border-blue-100 italic mb-3 inline-block">
                                    {selectedSession.sessionType}
                                </span>
                                {selectedSession.isMissed && (
                                    <span className="ml-2 px-3 py-1 bg-red-50 text-red-600 text-[9px] font-black rounded-full uppercase tracking-widest border border-red-100 italic mb-3 inline-block">
                                        Missed
                                    </span>
                                )}
                                <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight uppercase italic">{selectedSession.subject}</h3>
                                <p className="text-slate-500 font-bold mb-4 text-xs">SECTION: {selectedSession.section}</p>

                                {selectedSession.isMissed ? (
                                    <div className="bg-red-50 rounded-xl p-4 border border-red-100 mb-4">
                                        <div className="flex items-center gap-2 mb-2 text-red-700">
                                            <XCircle size={16} />
                                            <span className="text-xs font-black uppercase tracking-wide">Session Missed</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-700 mb-1">Reason: <span className="font-normal">{selectedSession.missedReason}</span></p>
                                        {selectedSession.missedNote && (
                                            <p className="text-xs font-bold text-slate-700">Note: <span className="font-normal">{selectedSession.missedNote}</span></p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        <div className="flex items-center gap-3 text-slate-600">
                                            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-blue-600 border border-slate-100">
                                                <Calendar size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Session Date</p>
                                                <p className="text-[11px] font-bold">{new Date(selectedSession.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-600">
                                            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-blue-600 border border-slate-100">
                                                <Clock size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Schedule</p>
                                                <p className="text-[11px] font-bold">{getTimeRange(selectedSession.hours)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-600">
                                            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-blue-600 border border-slate-100">
                                                <MapPin size={14} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Location</p>
                                                <p className="text-[11px] font-bold truncate" title={formatLocation(selectedSession.location)}>
                                                    {formatLocation(selectedSession.location)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                            <div className="absolute bottom-0 right-0 w-24 h-24 bg-blue-600 rounded-full blur-3xl -mb-12 -mr-12 opacity-20" />
                            <h4 className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4">Attendance Metrics</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-2xl font-black italic">{selectedSession.presentStudents}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Present</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-black italic text-red-400">{selectedSession.absentStudents}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Absent</p>
                                </div>
                                <div className="col-span-2 pt-3 border-t border-slate-800">
                                    <div className="flex justify-between items-end mb-1.5">
                                        <p className="text-3xl font-black italic text-blue-500">{selectedSession.attendancePercentage}%</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Success Rate</p>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                                            style={{ width: `${selectedSession.attendancePercentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="lg:col-span-2 flex flex-col overflow-hidden">
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full uppercase italic">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
                                <h4 className="text-lg font-black text-slate-900">Detailed Records</h4>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-full uppercase tracking-tighter border border-emerald-100">
                                        {selectedSession.presentStudentsList.length} Present
                                    </span>
                                    <span className="px-3 py-1 bg-red-50 text-red-600 text-[9px] font-black rounded-full uppercase tracking-tighter border border-red-100">
                                        {selectedSession.absentStudentsList.length} Absent
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse table-fixed">
                                    <thead className="sticky top-0 bg-white shadow-sm z-10 font-black not-italic">
                                        <tr>
                                            <th className="px-6 py-3 text-[9px] text-slate-400 uppercase tracking-widest border-b border-slate-100 w-1/3">Student Name</th>
                                            <th className="px-6 py-3 text-[9px] text-slate-400 uppercase tracking-widest border-b border-slate-100 w-1/4">Roll Number</th>
                                            <th className="px-6 py-3 text-[9px] text-slate-400 uppercase tracking-widest border-b border-slate-100 w-1/6">Status</th>
                                            <th className="px-6 py-3 text-[9px] text-slate-400 uppercase tracking-widest border-b border-slate-100 w-1/6">Time</th>
                                            <th className="px-6 py-3 text-[9px] text-slate-400 uppercase tracking-widest border-b border-slate-100 w-1/4">Confidence</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 font-bold not-italic">
                                        {selectedSession.presentStudentsList.map((st: any) => (
                                            <tr key={st.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs">
                                                            {st.name.charAt(0)}
                                                        </div>
                                                        <span className="font-bold text-slate-900">{st.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4 font-bold text-slate-500">{st.rollNumber}</td>
                                                <td className="px-8 py-4">
                                                    <span className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase italic">
                                                        <CheckCircle2 size={14} /> Present
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 font-bold text-slate-500 text-xs">
                                                    {st.markedAt ? new Date(st.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                                                </td>
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-emerald-500"
                                                                style={{ width: `${Math.round(st.confidence * 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-black text-slate-400 italic">{Math.round(st.confidence * 100)}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {selectedSession.absentStudentsList.map((st: any) => (
                                            <tr key={st.id} className="hover:bg-slate-50/50 transition-colors opacity-60">
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-black text-xs">
                                                            {st.name.charAt(0)}
                                                        </div>
                                                        <span className="font-bold text-slate-400">{st.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4 font-bold text-slate-400">{st.rollNumber}</td>
                                                <td className="px-8 py-4">
                                                    <span className="flex items-center gap-2 text-red-400 font-black text-[10px] uppercase italic">
                                                        <XCircle size={14} /> Absent
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 text-slate-300 font-black italic">--</td>
                                                <td className="px-8 py-4 text-slate-300 font-black italic">--</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 scrollbar-hide">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-2">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-3">
                    <Clock size={28} className="text-blue-600" />
                    Attendance Reports
                </h2>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Filter by subject or section..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 w-full md:w-64 text-sm font-bold transition-all text-slate-900 shadow-sm"
                        />
                    </div>
                    <button
                        onClick={loadReports}
                        className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-100 transition-all active:scale-95 shadow-sm group"
                    >
                        <RefreshCw size={20} className={cn("group-hover:rotate-180 transition-transform duration-500", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 h-48 animate-pulse" />
                    ))}
                </div>
            ) : filteredReports.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                    {filteredReports.map((report) => (
                        <div
                            key={report.id}
                            onClick={() => handleSessionClick(report)}
                            className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 hover:-translate-y-1 transition-all group cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                <Clock size={80} />
                            </div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[9px] font-black rounded-full uppercase tracking-widest border border-blue-100 italic">
                                        {report.sessionType}
                                    </span>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                        {new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>

                                <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight group-hover:text-blue-600 transition-colors uppercase italic truncate">
                                    {report.subject}
                                </h3>
                                <div className="flex items-center justify-between gap-2 mb-4">
                                    <p className="text-slate-500 font-bold text-sm">SEC: {report.section}</p>
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 truncate max-w-[120px]">
                                        <MapPin size={10} className="text-blue-500 flex-shrink-0" />
                                        <span className="truncate">{report.location?.address || 'On Campus'}</span>
                                    </div>
                                </div>
                                {report.isMissed && (
                                    <div className="mb-4 px-3 py-2 bg-red-50 rounded-xl border border-red-100">
                                        <p className="text-[9px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1.5 truncate">
                                            <XCircle size={12} /> Missed: {report.missedReason}
                                        </p>
                                    </div>
                                )}

                                <div className="mt-auto grid grid-cols-3 gap-2 border-t border-slate-50 pt-4">
                                    <div className="text-center">
                                        <p className="text-lg font-black text-slate-900 italic">{report.presentStudents}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">P</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-black text-slate-900 italic">{report.absentStudents}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">A</p>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <p className={cn(
                                            "text-lg font-black italic",
                                            report.attendancePercentage >= 75 ? "text-emerald-600" : "text-red-500"
                                        )}>{report.attendancePercentage}%</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">RATE</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-[3rem] border-2 border-dashed border-slate-200 p-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                        <Users size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-400 tracking-tight italic uppercase">No reports found</h3>
                    <p className="text-slate-400 font-medium mt-2">Adjust your search or take your first attendance session.</p>
                </div>
            )}
        </div>
    );
}
