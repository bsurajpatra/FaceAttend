import { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    ChevronDown,
    ChevronRight,
    Save,
    AlertCircle,
    CheckCircle2,
    Loader2,
    BookOpen
} from 'lucide-react';
import { cn } from '../lib/utils';
import { TIME_SLOTS, SESSION_TYPES, getSessionDuration, validateConsecutiveHours } from '../lib/timeSlots';
import { getTimetableApi, updateTimetableApi } from '../api/timetable';
import type { TimetableDay, Session } from '../api/timetable';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TimetableManager() {
    const [timetable, setTimetable] = useState<TimetableDay[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedSessions, setExpandedSessions] = useState<{ [key: string]: boolean }>({});
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [user, setUser] = useState<{ id: string } | null>(null);

    // Initial Load
    useEffect(() => {
        const loadTimetable = async () => {
            try {
                const userData = localStorage.getItem('user');
                if (!userData) return;

                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);

                const response = await getTimetableApi(parsedUser.id);

                if (response.timetable && response.timetable.length > 0) {
                    const processedTimetable = response.timetable.map(day => ({
                        day: day.day,
                        sessions: (day.sessions || []).map(session => ({
                            subject: session.subject || '',
                            sessionType: session.sessionType || 'Lecture',
                            section: session.section || '',
                            roomNumber: session.roomNumber || '',
                            hours: session.hours || []
                        }))
                    }));
                    setTimetable(processedTimetable);
                } else {
                    // Initialize empty
                    setTimetable(DAYS.map(day => ({ day, sessions: [] })));
                }
            } catch (err) {
                console.error("Failed to load timetable", err);
                // Initialize empty on error or 404
                setTimetable(DAYS.map(day => ({ day, sessions: [] })));
            } finally {
                setIsLoading(false);
            }
        };
        loadTimetable();
    }, []);

    const createEmptySession = (): Session => ({
        subject: '',
        sessionType: 'Lecture',
        section: '',
        roomNumber: '',
        hours: []
    });

    const addSession = (dayIndex: number) => {
        const updatedTimetable = [...timetable];
        updatedTimetable[dayIndex].sessions.push(createEmptySession());
        setTimetable(updatedTimetable);
        // Auto-expand the new session
        const sessionIndex = updatedTimetable[dayIndex].sessions.length - 1;
        setExpandedSessions(prev => ({ ...prev, [`${dayIndex}-${sessionIndex}`]: true }));
    };

    const removeSession = (dayIndex: number, sessionIndex: number) => {
        const updatedTimetable = [...timetable];
        updatedTimetable[dayIndex].sessions.splice(sessionIndex, 1);
        setTimetable(updatedTimetable);
    };

    const updateSession = (dayIndex: number, sessionIndex: number, field: keyof Session, value: any) => {
        const updatedTimetable = [...timetable];
        updatedTimetable[dayIndex].sessions[sessionIndex] = {
            ...updatedTimetable[dayIndex].sessions[sessionIndex],
            [field]: value
        };
        setTimetable(updatedTimetable);
    };

    const toggleHour = (dayIndex: number, sessionIndex: number, hour: number) => {
        const updatedTimetable = [...timetable];
        const session = updatedTimetable[dayIndex].sessions[sessionIndex];
        const hours = session.hours.includes(hour)
            ? session.hours.filter(h => h !== hour)
            : [...session.hours, hour].sort((a, b) => a - b);

        updateSession(dayIndex, sessionIndex, 'hours', hours);
    };

    const toggleSessionExpand = (dayIndex: number, sessionIndex: number) => {
        const key = `${dayIndex}-${sessionIndex}`;
        setExpandedSessions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const getTimeRange = (hours: number[]) => {
        if (hours.length === 0) return '';
        const sorted = [...hours].sort((a, b) => a - b);
        const startSlot = TIME_SLOTS.find(slot => slot.hour === sorted[0]);
        const endSlot = TIME_SLOTS.find(slot => slot.hour === sorted[sorted.length - 1]);
        if (startSlot && endSlot) {
            return `${startSlot.time.split(' - ')[0]} - ${endSlot.time.split(' - ')[1]}`;
        }
        return '';
    };

    // Validation Logic
    const validateTimetable = () => {
        setError(null);

        for (const day of timetable) {
            if (day.sessions) {
                for (const session of day.sessions) {
                    if (!session.subject.trim() || !session.section.trim() || !session.roomNumber.trim() || session.hours.length === 0) {
                        setError(`Please fill all required fields for ${day.day}.`);
                        return false;
                    }
                    if (!validateConsecutiveHours(session.hours)) {
                        setError(`Hours for ${session.subject} on ${day.day} must be consecutive.`);
                        return false;
                    }
                }
            }
        }

        // Overlap Check
        for (const day of timetable) {
            if (!day.sessions || day.sessions.length <= 1) continue;
            for (let i = 0; i < day.sessions.length; i++) {
                for (let j = i + 1; j < day.sessions.length; j++) {
                    const s1 = day.sessions[i];
                    const s2 = day.sessions[j];
                    const overlap = s1.hours.some(h => s2.hours.includes(h));
                    if (overlap) {
                        setError(`Overlap detected on ${day.day} between ${s1.subject} and ${s2.subject}.`);
                        return false;
                    }
                }
            }
        }
        return true;
    };

    const handleSave = async () => {
        if (!user || isSaving) return;
        if (!validateTimetable()) return;

        setIsSaving(true);
        setSuccessMessage(null);
        try {
            await updateTimetableApi(user.id, timetable);
            setSuccessMessage("Timetable saved successfully!");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || "Failed to save timetable.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-3">
                    <BookOpen size={28} className="text-blue-600" />
                    Timetable Manager
                </h2>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-200"
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Changes
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            {successMessage && (
                <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl border border-emerald-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{successMessage}</span>
                </div>
            )}

            <div className="grid gap-6">
                {timetable.map((day, dayIndex) => (
                    <div key={day.day} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="bg-slate-50/50 p-4 flex justify-between items-center border-b border-slate-100">
                            <h3 className="font-bold text-lg text-slate-700">{day.day}</h3>
                            <button
                                onClick={() => addSession(dayIndex)}
                                className="flex items-center gap-1.5 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
                            >
                                <Plus className="w-4 h-4" />
                                Add Session
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {day.sessions.length === 0 && (
                                <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">
                                    No sessions scheduled
                                </div>
                            )}

                            {day.sessions.map((session, sessionIndex) => {
                                const isExpanded = expandedSessions[`${dayIndex}-${sessionIndex}`];
                                return (
                                    <div key={sessionIndex} className="border border-slate-200 rounded-xl overflow-hidden transition-all bg-white hover:border-blue-200">
                                        <div
                                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                            onClick={() => toggleSessionExpand(dayIndex, sessionIndex)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                                    {sessionIndex + 1}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">
                                                        {session.subject || <span className="text-slate-400 italic">No Subject</span>}
                                                    </div>
                                                    {!isExpanded && (
                                                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                                                            {session.section || 'No Section'} • {getTimeRange(session.hours) || 'No Time'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeSession(dayIndex, sessionIndex); }}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/30">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                    {/* Subject */}
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Subject</label>
                                                        <input
                                                            type="text"
                                                            value={session.subject}
                                                            onChange={(e) => updateSession(dayIndex, sessionIndex, 'subject', e.target.value)}
                                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-medium"
                                                            placeholder="e.g. Mathematics"
                                                        />
                                                    </div>

                                                    {/* Session Type */}
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Type</label>
                                                        <div className="flex gap-2">
                                                            {SESSION_TYPES.map(type => (
                                                                <button
                                                                    key={type}
                                                                    onClick={() => updateSession(dayIndex, sessionIndex, 'sessionType', type)}
                                                                    className={cn(
                                                                        "flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all",
                                                                        session.sessionType === type
                                                                            ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200"
                                                                            : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                                                                    )}
                                                                >
                                                                    {type}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Section */}
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Section</label>
                                                        <input
                                                            type="text"
                                                            value={session.section}
                                                            onChange={(e) => updateSession(dayIndex, sessionIndex, 'section', e.target.value)}
                                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-medium"
                                                            placeholder="e.g. S12"
                                                        />
                                                    </div>

                                                    {/* Room */}
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Room</label>
                                                        <input
                                                            type="text"
                                                            value={session.roomNumber}
                                                            onChange={(e) => updateSession(dayIndex, sessionIndex, 'roomNumber', e.target.value)}
                                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-medium"
                                                            placeholder="e.g. 101"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Time Slots */}
                                                <div className="mt-4">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Time Slots</label>
                                                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                                            {getSessionDuration(session.hours)}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                                                        {TIME_SLOTS.map(slot => (
                                                            <button
                                                                key={slot.hour}
                                                                onClick={() => toggleHour(dayIndex, sessionIndex, slot.hour)}
                                                                className={cn(
                                                                    "flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-center h-16",
                                                                    session.hours.includes(slot.hour)
                                                                        ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200 scale-105"
                                                                        : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-slate-50"
                                                                )}
                                                            >
                                                                <span className="text-xs font-black">{slot.hour}</span>
                                                                <span className={cn("text-[10px] uppercase font-bold mt-1", session.hours.includes(slot.hour) ? "text-blue-200" : "text-slate-400")}>
                                                                    {slot.time.split(' - ')[0]}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {session.hours.length > 0 && !validateConsecutiveHours(session.hours) && (
                                                        <p className="text-red-500 text-xs mt-2 font-medium flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" />
                                                            Please select consecutive hours only
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
