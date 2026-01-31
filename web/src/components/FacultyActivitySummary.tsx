
import React, { useState, useEffect } from 'react';
import {
    CalendarCheck,
    CheckCircle2,
    AlertCircle,
    RefreshCw
} from 'lucide-react';
import { getAttendanceReportsApi } from '../api/attendance';
import { DAYS, getTimeSlotByHour } from '../lib/timeSlots';
import { cn } from '../lib/utils';

interface FacultyActivitySummaryProps {
    user: any;
    timetable: any[];
}

export function FacultyActivitySummary({ user, timetable }: FacultyActivitySummaryProps) {
    const [metrics, setMetrics] = useState({
        totalScheduled: 0,
        taken: 0,
        missed: 0,
        loading: true
    });

    const fetchMetrics = async () => {
        if (!user || !timetable) return;

        setMetrics(prev => ({ ...prev, loading: true }));
        try {
            // 1. Get current week date range (Monday to Sunday)
            const now = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(now.setDate(diff));
            monday.setHours(0, 0, 0, 0);

            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            const startDate = monday.toISOString().split('T')[0];
            const endDate = sunday.toISOString().split('T')[0];

            // 2. Fetch attendance records for this week
            const attendanceRes = await getAttendanceReportsApi({
                startDate,
                endDate
            });
            const takenSessions = attendanceRes.sessions || [];

            // 3. Compute scheduled metrics
            let totalScheduledWeek = 0;
            let scheduledSoFar = 0;

            const currentDayIndex = new Date().getDay(); // 0-6
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            // Normalized day index (1=Mon, ..., 7=Sun)
            const todayNorm = currentDayIndex === 0 ? 7 : currentDayIndex;

            timetable.forEach(daySchedule => {
                const sessionsCount = daySchedule.sessions?.length || 0;
                totalScheduledWeek += sessionsCount;

                const dayIndex = DAYS.indexOf(daySchedule.day);
                const dayNorm = dayIndex === 0 ? 7 : dayIndex;

                if (dayNorm < todayNorm) {
                    scheduledSoFar += sessionsCount;
                } else if (dayNorm === todayNorm) {
                    daySchedule.sessions?.forEach((session: any) => {
                        const lastHour = Math.max(...session.hours);
                        const slot = getTimeSlotByHour(lastHour);
                        if (slot && slot.endMinutes && currentMinutes > slot.endMinutes) {
                            scheduledSoFar += 1;
                        }
                    });
                }
            });

            // Missed = Scheduled up to now - Actually taken
            // Note: If they took extra classes, taken might be > scheduledSoFar.
            // But we want "missed" of the SCHEDULED ones.
            // For a simple card, we'll use max(0, scheduledSoFar - taken) 
            // but a more robust way would be needed if taken includes non-timetable sessions.
            const missedCount = Math.max(0, scheduledSoFar - takenSessions.length);

            setMetrics({
                totalScheduled: totalScheduledWeek,
                taken: takenSessions.length,
                missed: missedCount,
                loading: false
            });
        } catch (err) {
            console.error('Failed to fetch activity metrics', err);
            setMetrics(prev => ({ ...prev, loading: false }));
        }
    };

    useEffect(() => {
        fetchMetrics();

        // Listen for real-time updates via custom event dispatched from Dashboard socket
        const handleRefresh = () => fetchMetrics();
        window.addEventListener('refresh-attendance-metrics', handleRefresh);

        // Also keep polling as a fallback
        const interval = setInterval(fetchMetrics, 5 * 60 * 1000);

        return () => {
            window.removeEventListener('refresh-attendance-metrics', handleRefresh);
            clearInterval(interval);
        };
    }, [user, timetable]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
            <SummaryCard
                title="Weekly Schedule"
                value={metrics.totalScheduled}
                subtitle="Total sessions this week"
                icon={<CalendarCheck className="text-blue-500" size={24} />}
                color="blue"
                loading={metrics.loading}
            />
            <SummaryCard
                title="Sessions Taken"
                value={metrics.taken}
                subtitle="Successfully conducted"
                icon={<CheckCircle2 className="text-emerald-500" size={24} />}
                color="emerald"
                loading={metrics.loading}
            />
            <SummaryCard
                title="Missed Sessions"
                value={metrics.missed}
                subtitle="Requires attention"
                icon={<AlertCircle className="text-rose-500" size={24} />}
                color="rose"
                loading={metrics.loading}
            />
        </div>
    );
}

interface SummaryCardProps {
    title: string;
    value: number | string;
    subtitle: string;
    icon: React.ReactNode;
    color: 'blue' | 'emerald' | 'rose';
    loading?: boolean;
}

function SummaryCard({ title, value, subtitle, icon, color, loading }: SummaryCardProps) {
    const colorClasses = {
        blue: "bg-blue-50 border-blue-100 text-blue-600 shadow-blue-100",
        emerald: "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-emerald-100",
        rose: "bg-rose-50 border-rose-100 text-rose-600 shadow-rose-100"
    };

    return (
        <div className="bg-white rounded-[2rem] p-5 md:p-6 border border-slate-200 shadow-lg shadow-slate-100/50 hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden">
            {/* Background Decoration */}
            <div className={cn(
                "absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-[0.03] group-hover:scale-150 transition-transform duration-700",
                color === 'blue' && "bg-blue-600",
                color === 'emerald' && "bg-emerald-600",
                color === 'rose' && "bg-rose-600"
            )} />

            <div className="flex items-center justify-between mb-4">
                <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:rotate-6",
                    colorClasses[color]
                )}>
                    {loading ? <RefreshCw className="animate-spin" size={18} /> : React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
                </div>
                <div className="text-right">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">This Week</span>
                </div>
            </div>

            <div className="space-y-0.5">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-tighter italic">{title}</h3>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">
                        {loading ? '--' : value}
                    </span>
                    {!loading && <span className="text-slate-400 font-bold text-sm italic">/ sessions</span>}
                </div>
                <p className="text-[11px] text-slate-400 font-medium truncate">{subtitle}</p>
            </div>

            <div className={cn(
                "h-1 w-full bg-slate-100 rounded-full mt-4 overflow-hidden"
            )}>
                <div
                    className={cn(
                        "h-full transition-all duration-1000 ease-out rounded-full",
                        color === 'blue' && "bg-blue-500",
                        color === 'emerald' && "bg-emerald-500",
                        color === 'rose' && "bg-rose-500"
                    )}
                    style={{ width: loading ? '0%' : '100%' }}
                />
            </div>
        </div>
    );
}
