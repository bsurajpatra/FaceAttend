
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
    UserPlus,
    Camera,
    Upload,
    CheckCircle2,
    Loader2,
    Smartphone,
    AlertCircle,
    XCircle
} from 'lucide-react';
import { http } from '../api/http';

interface StudentRegistrationProps {
    user: any;
    timetable: any[];
}

export function StudentRegistration({ user, timetable }: StudentRegistrationProps) {
    const [name, setName] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [subject, setSubject] = useState('');
    const [section, setSection] = useState('');
    const [sessionType, setSessionType] = useState('Lecture');

    const [status, setStatus] = useState<'idle' | 'initiating' | 'waiting_for_mobile' | 'photo_received' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Derive options from timetable
    const subjects = Array.from(new Set(timetable.flatMap(d => d.sessions.map((s: any) => s.subject))));
    const sections = Array.from(new Set(timetable.flatMap(d => d.sessions.filter((s: any) => !subject || s.subject === subject).map((s: any) => s.section))));
    const types = Array.from(new Set(timetable.flatMap(d => d.sessions.filter((s: any) => (!subject || s.subject === subject) && (!section || s.section === section)).map((s: any) => s.sessionType))));

    // Reset children when parent changes
    useEffect(() => {
        setSection('');
    }, [subject]);

    useEffect(() => {
        setSessionType('');
    }, [section]);

    useEffect(() => {
        // Determine Socket URL
        const apiUrl = import.meta.env.VITE_API_URL;
        const socketUrl = apiUrl.split(',')[0].trim();

        const newSocket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            auth: { token: localStorage.getItem('token') } // Pass token if middleware checks it on connection
        });

        newSocket.on('connect', () => {
            console.log('Socket connected');
            newSocket.emit('join_room', `faculty_${user.id}`);
        });

        newSocket.on('capture_complete', (data: any) => {
            console.log('Capture complete:', data);
            if (data.rollNumber === rollNumber || status === 'waiting_for_mobile') {
                setCapturedImage(data.photoBase64 || null); // Note: server might not send base64 back for heavy load, but let's assume it does for thumbnail
                setStatus('photo_received');
                setMessage(`Photo captured for ${data.name}. Please confirm to complete.`);
            }
        });

        return () => {
            newSocket.disconnect();
        };
    }, [user.id, rollNumber, status]);

    const handleInitiate = async () => {
        if (!name || !rollNumber || !subject || !section) {
            setMessage('Please fill all fields');
            setStatus('error');
            return;
        }

        try {
            setStatus('initiating');
            setMessage('Initiating registration...');

            const res = await http.post('/api/students/initiate', {
                name,
                rollNumber,
                subject,
                section,
                sessionType
            });

            if (res.data.warning) {
                setStatus('error');
                setMessage(res.data.message);
                return;
            }

            setStatus('waiting_for_mobile');
            setMessage('Request sent! Open the mobile app to capture photo.');
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            const msg = err.response?.data?.message || 'Failed to initiate';
            const hint = err.response?.data?.hint;
            setMessage(hint ? `${msg}\n${hint}` : msg);
        }
    };

    const handleFinalize = () => {
        setStatus('success');
        setMessage('Student successfully registered!');

        setTimeout(() => {
            setStatus('idle');
            setName('');
            setRollNumber('');
            setCapturedImage(null);
            setMessage('');
        }, 2000);
    };

    const handleCancel = () => {
        // Cancel the current operation and reset form
        setStatus('idle');
        setMessage('');
        setCapturedImage(null);
        // We keep the class context (Subject/Section) as user likely registers multiple students for same class
        setName('');
        setRollNumber('');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setStatus('error');
            setMessage('File too large (max 5MB)');
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1]; // Remove prefix

            // We need student ID first, so we initiate first if not already waiting
            if (status !== 'waiting_for_mobile') {
                // Initiate and then upload immediately
                try {
                    setStatus('initiating');
                    const initRes = await http.post('/api/students/initiate', {
                        name,
                        rollNumber,
                        subject,
                        section,
                        sessionType
                    });
                    const studentId = initRes.data.studentId;

                    // Upload face
                    setMessage('Uploading photo...');
                    await http.post(`/api/students/${studentId}/face`, {
                        faceImageBase64: base64Data
                    });

                    // Success handled by socket or manual set
                    setStatus('photo_received');
                    setMessage('Photo uploaded. Please confirm.');
                    setCapturedImage(base64); // Show preview

                } catch (err: any) {
                    setStatus('error');
                    setMessage(err.response?.data?.message || 'Failed to upload');
                }
            } else {
                // Already initiated but waiting, just upload to whom? We need studentId. 
                // ideally we should handle this but for now let's just reset and try again logic via UI is simpler
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 scrollbar-hide">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-3">
                <UserPlus size={28} className="text-blue-600" />
                Register Student
            </h2>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                {/* Form Section */}
                <div className="p-6 md:p-8 flex-1 space-y-6 flex flex-col justify-center">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Name</label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
                                placeholder="John Doe"
                                disabled={status === 'waiting_for_mobile' || status === 'photo_received' || status === 'success'}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Roll Number</label>
                            <input
                                value={rollNumber}
                                onChange={e => setRollNumber(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all uppercase"
                                placeholder="CS101"
                                disabled={status === 'waiting_for_mobile' || status === 'photo_received' || status === 'success'}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                            <select
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all appearance-none cursor-pointer"
                                disabled={status === 'waiting_for_mobile' || status === 'photo_received' || status === 'success'}
                            >
                                <option value="">Select...</option>
                                {subjects.map((s: any) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Section</label>
                            <select
                                value={section}
                                onChange={e => setSection(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all appearance-none cursor-pointer"
                                disabled={status === 'waiting_for_mobile' || status === 'photo_received' || status === 'success'}
                            >
                                <option value="">Select...</option>
                                {sections.map((s: any) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                            <select
                                value={sessionType}
                                onChange={e => setSessionType(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all appearance-none cursor-pointer"
                                disabled={status === 'waiting_for_mobile' || status === 'photo_received' || status === 'success'}
                            >
                                <option value="">Select...</option>
                                {types.map((t: any) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            {status === 'photo_received' ? (
                                <button
                                    onClick={handleFinalize}
                                    className="flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-black text-lg transition-all shadow-xl shadow-emerald-500/30 bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <CheckCircle2 size={24} />
                                    <span>Complete Registration</span>
                                </button>
                            ) : (
                                <button
                                    onClick={handleInitiate}
                                    disabled={status !== 'idle' && status !== 'error' && status !== 'waiting_for_mobile'}
                                    className={`flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-600/20
                        ${status === 'waiting_for_mobile'
                                            ? 'bg-amber-100 text-amber-700'
                                            : status === 'success'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98]'
                                        }`}
                                >
                                    {status === 'initiating' && <Loader2 className="animate-spin" />}
                                    {status === 'waiting_for_mobile' && <Smartphone className="animate-pulse" />}
                                    {status === 'success' && <CheckCircle2 />}

                                    <span>
                                        {status === 'idle' ? 'Request App Capture' :
                                            status === 'initiating' ? 'Sending Request...' :
                                                status === 'waiting_for_mobile' ? 'Check Mobile App...' :
                                                    status === 'success' ? 'Registered!' : 'Retry'}
                                    </span>
                                </button>
                            )}

                            <div className="relative">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={status === 'success' || status === 'photo_received'}
                                    className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all disabled:opacity-50"
                                    title="Upload from PC"
                                >
                                    <Upload size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Secondary Actions Row */}
                        {(status === 'waiting_for_mobile' || status === 'photo_received') && (
                            <div className="flex items-center justify-center gap-6 pt-2">
                                <button
                                    onClick={handleInitiate}
                                    className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-2"
                                >
                                    <Smartphone size={16} />
                                    {status === 'photo_received' ? 'Retake Photo (Resend)' : 'Resend Popup Request'}
                                </button>

                                <div className="w-1 h-1 bg-slate-300 rounded-full" />

                                <button
                                    onClick={handleCancel}
                                    className="text-sm font-bold text-red-400 hover:text-red-600 transition-colors flex items-center gap-2"
                                >
                                    <XCircle size={16} />
                                    Cancel Registration
                                </button>
                            </div>
                        )}
                    </div>

                    {status === 'error' && (
                        <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-xl text-sm font-bold whitespace-pre-wrap">
                            <AlertCircle size={16} className="flex-shrink-0" />
                            {message}
                        </div>
                    )}
                </div>

                {/* Status / Preview Section */}
                <div className={`w-full md:w-80 bg-slate-50 border-l border-slate-200 flex flex-col items-center justify-center p-8 transition-colors
            ${status === 'waiting_for_mobile' ? 'animate-pulse bg-amber-50' : ''}
            ${status === 'photo_received' ? 'bg-blue-50' : ''}
            ${status === 'success' ? 'bg-emerald-50' : ''}
         `}>
                    {capturedImage ? (
                        <div className="space-y-4 text-center">
                            <div className="relative inline-block">
                                <img src={capturedImage.startsWith('data:') ? capturedImage : `data:image/jpeg;base64,${capturedImage}`} className="w-48 h-48 rounded-2xl object-cover shadow-2xl border-4 border-white" />
                                {status === 'success' && (
                                    <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white ring-4 ring-white animate-in zoom-in">
                                        <CheckCircle2 size={24} />
                                    </div>
                                )}
                                {status === 'photo_received' && (
                                    <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white ring-4 ring-white animate-bounce pointer-events-none">
                                        <CheckCircle2 size={24} />
                                    </div>
                                )}
                            </div>
                            {status === 'photo_received' ? (
                                <p className="font-bold text-blue-700 text-lg">Photo Received!<br /><span className="text-sm font-normal opacity-80">Click submit to finish.</span></p>
                            ) : (
                                <p className="font-bold text-emerald-700 text-lg">Photo Captured!</p>
                            )}
                        </div>
                    ) : status === 'waiting_for_mobile' ? (
                        <div className="text-center space-y-6">
                            <div className="w-32 h-32 bg-amber-100 rounded-full flex items-center justify-center mx-auto relative">
                                <div className="absolute inset-0 border-4 border-amber-200 rounded-full animate-ping opacity-75"></div>
                                <Smartphone size={48} className="text-amber-600 relative z-10" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">Check Mobile</h3>
                                <p className="text-slate-500 font-medium">Accept the popup on your phone to capture face.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-4 opacity-50">
                            <div className="w-32 h-32 bg-slate-200 rounded-full flex items-center justify-center mx-auto">
                                <Camera size={48} className="text-slate-400" />
                            </div>
                            <p className="font-medium text-slate-400">No photo captured yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
