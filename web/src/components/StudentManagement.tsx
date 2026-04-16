import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
    Search,
    Trash2,
    Users,
    Filter,
    Loader2,
    Edit,
    X,
    Save,
    Smartphone,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    Upload,
    ChevronRight
} from 'lucide-react';
import { getStudentsApi, deleteStudentApi, updateStudentApi, type Student } from '../api/students';
import { http } from '../api/http';

interface StudentManagementProps {
    user: any;
    timetable: any[];
}

export function StudentManagement({ user, timetable }: StudentManagementProps) {
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Selection State
    const uniqueSubjects = Array.from(new Set(timetable.flatMap(d => d.sessions.map((s: any) => s.subject))));
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [hasSelectedClass, setHasSelectedClass] = useState(false);

    // Edit State
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [editName, setEditName] = useState('');
    const [editRollNumber, setEditRollNumber] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [photoUpdateStatus, setPhotoUpdateStatus] = useState<'idle' | 'waiting_mobile' | 'uploading' | 'success'>('idle');
    const [deviceOfflineError, setDeviceOfflineError] = useState<{ message: string; hint: string } | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    // Delete State
    const [studentToDelete, setStudentToDelete] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Search and Filter State for List
    const [searchQuery, setSearchQuery] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const editingStudentRef = useRef<Student | null>(null);

    // Keep ref in sync
    useEffect(() => {
        editingStudentRef.current = editingStudent;
    }, [editingStudent]);

    // Initialize Socket
    useEffect(() => {
        const apiUrl = import.meta.env.VITE_API_URL;
        const socketUrl = apiUrl.split(',')[0].trim();

        const newSocket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            auth: { token: localStorage.getItem('token') }
        });

        newSocket.on('connect', () => {
            console.log('Socket connected (Management)');
            newSocket.emit('join_room', `faculty_${user.id}`);
        });

        newSocket.on('capture_complete', (data: any) => {
            const currentEditing = editingStudentRef.current;
            // Use rollNumber matching as fallback if ID isn't exactly matching or for robust check
            if (currentEditing && (data.studentId === currentEditing.id || data.rollNumber === currentEditing.rollNumber)) {
                setPhotoUpdateStatus('success');
                if (data.photoBase64) {
                    setPhotoPreview(data.photoBase64);
                }
                setTimeout(() => setPhotoUpdateStatus('idle'), 3000);
            }
        });

        return () => {
            newSocket.disconnect();
        };
    }, [user.id]);

    // Derived Sections based on Subject
    const availableSections = Array.from(new Set(timetable
        .flatMap(d => d.sessions)
        .filter((s: any) => s.subject === selectedSubject)
        .map((s: any) => s.section)
    ));

    const fetchStudents = async () => {
        if (!selectedSubject || !selectedSection) return;

        setIsLoading(true);
        setError(null);
        try {
            const data = await getStudentsApi(selectedSubject, selectedSection);
            setStudents(data.students);
            setHasSelectedClass(true);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch students');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectClass = () => {
        if (selectedSubject && selectedSection) {
            fetchStudents();
        }
    };

    const handleEditClick = (student: Student) => {
        setEditingStudent(student);
        setEditName(student.name);
        setEditRollNumber(student.rollNumber);
        setPhotoUpdateStatus('idle');
        setDeviceOfflineError(null);
        setPhotoPreview(null);
    };

    const handleUpdateDetails = async () => {
        if (!editingStudent) return;
        setIsUpdating(true);
        try {
            await updateStudentApi(editingStudent.id, {
                name: editName,
                rollNumber: editRollNumber
            });

            // Update local list
            setStudents(prev => prev.map(s =>
                s.id === editingStudent.id
                    ? { ...s, name: editName, rollNumber: editRollNumber }
                    : s
            ));

            setEditingStudent(null); // Close modal
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.message || 'Failed to update student details';
            alert(msg);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRetakeMobile = async () => {
        if (!editingStudent) return;
        setPhotoUpdateStatus('waiting_mobile');
        try {
            // Re-initiate registration flow with forceCapture=true
            await http.post('/api/students/initiate', {
                name: editingStudent.name,
                rollNumber: editingStudent.rollNumber,
                subject: editingStudent.subject,
                section: editingStudent.section,
                sessionType: editingStudent.sessionType || 'Lecture', // Default if missing
                forceCapture: true
            });
        } catch (err: any) {
            console.error(err);
            setPhotoUpdateStatus('idle');
            const msg = err.response?.data?.message || 'Failed to send capture request';
            const hint = err.response?.data?.hint || '';
            setDeviceOfflineError({ message: msg, hint });
        }
    };

    const handleUpdatePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editingStudent) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('File too large');
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result as string;
            setPhotoPreview(base64); // Show immediate preview

            setPhotoUpdateStatus('uploading');
            try {
                const base64Data = base64.split(',')[1];
                await updateStudentApi(editingStudent.id, {
                    faceImageBase64: base64Data
                });
                setPhotoUpdateStatus('success');
                setTimeout(() => setPhotoUpdateStatus('idle'), 3000);
            } catch (err: any) {
                console.error(err);
                setPhotoUpdateStatus('idle');
                const msg = err.response?.data?.message || 'Failed to upload photo';
                const hint = err.response?.data?.hint;
                alert(hint ? `${msg}\n\n${hint}` : msg);
                setPhotoPreview(null); // Revert on fail
            }
        };
        reader.readAsDataURL(file);
    };

    const handleDelete = (studentId: string, studentName: string) => {
        setStudentToDelete({ id: studentId, name: studentName });
    };

    const confirmDelete = async () => {
        if (!studentToDelete) return;

        setIsDeleting(true);
        try {
            await deleteStudentApi(studentToDelete.id);
            setStudents(prev => prev.filter(s => s.id !== studentToDelete.id));
            setStudentToDelete(null);
        } catch (err) {
            console.error(err);
            alert('Failed to delete student');
            // Keep modal open on error so user can retry or cancel
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredStudents = students.filter(student => {
        const query = searchQuery.toLowerCase();
        return (
            student.name.toLowerCase().includes(query) ||
            student.rollNumber.toLowerCase().includes(query)
        );
    });

    // RENDER: Main Component
    return (
        <div className="space-y-6 scrollbar-hide animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
                    <Users size={28} className="text-blue-600" />
                    Student Management
                </h2>
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mt-1 ml-10">
                    Maintain electronic student records and biometric credentials
                </p>
            </div>

            {/* Selection Bar */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-end animate-in slide-in-from-top-4 duration-500">
                <div className="relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">University Course</label>
                    <div className="relative group">
                        <select
                            value={selectedSubject}
                            onChange={(e) => {
                                setSelectedSubject(e.target.value);
                                setSelectedSection(''); // Reset section
                                if (hasSelectedClass) setHasSelectedClass(false);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 font-bold text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer hover:bg-white"
                        >
                            <option value="">Select Course...</option>
                            {uniqueSubjects.map((sub: any) => <option key={sub} value={sub}>{sub}</option>)}
                        </select>
                        <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" />
                    </div>
                </div>

                <div className="relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Assigned Section</label>
                    <div className="relative group">
                        <select
                            value={selectedSection}
                            onChange={(e) => {
                                setSelectedSection(e.target.value);
                                if (hasSelectedClass) setHasSelectedClass(false);
                            }}
                            disabled={!selectedSubject}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 font-bold text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all appearance-none cursor-pointer disabled:opacity-50 hover:bg-white"
                        >
                            <option value="">Select Section...</option>
                            {availableSections.map((sec: any) => <option key={sec} value={sec}>{sec}</option>)}
                        </select>
                        <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" />
                    </div>
                </div>

                <button
                    onClick={handleSelectClass}
                    disabled={!selectedSubject || !selectedSection || isLoading}
                    className="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-xl shadow-slate-200 hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3 uppercase tracking-widest text-xs h-[48px]"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                    {hasSelectedClass ? 'Refresh Records' : 'Sync Student Data'}
                </button>
            </div>

            {hasSelectedClass ? (
                /* SCREEN 2: Student List */
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    {/* Action Bar: Search & Info */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 flex-shrink-0 animate-pulse">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Records Synchronized</p>
                                <p className="text-sm font-black text-slate-900 uppercase">Managing {students.length} Total Students</p>
                            </div>
                        </div>

                        <div className="relative w-full md:w-[500px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Filter records by name or CID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none"
                            />
                        </div>
                    </div>

                    {/* Table Container */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden min-h-[400px] flex flex-col">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20">
                                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Handshake in progress...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center flex-1 gap-4 text-red-500 py-20">
                                <AlertCircle className="w-10 h-10" />
                                <p className="font-bold">{error}</p>
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center flex-1 gap-4 text-slate-400 py-20">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                                    <Users className="w-10 h-10 opacity-20" />
                                </div>
                                <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">No Results</h3>
                                <p className="text-sm font-medium">Clear your search parameters to see all records.</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Information</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Identity Key</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance Status</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Admin Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredStudents.map((student) => (
                                            <tr key={student.id} className="group hover:bg-slate-50/80 transition-all duration-200">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 font-black">
                                                            {student.name.charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="truncate max-w-[200px] text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase">{student.name}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{student.subject}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-black tracking-tight border border-slate-200 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                                        {student.rollNumber}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4 w-56">
                                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-700 ${(student.attendancePercentage || 0) >= 75 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' :
                                                                    (student.attendancePercentage || 0) >= 60 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                                                                    }`}
                                                                style={{ width: `${student.attendancePercentage || 0}%` }}
                                                            />
                                                        </div>
                                                        <span className={`font-black text-[11px] w-10 text-right ${(student.attendancePercentage || 0) >= 75 ? 'text-emerald-600' :
                                                            (student.attendancePercentage || 0) >= 60 ? 'text-amber-600' : 'text-red-600'
                                                            }`}>
                                                            {student.attendancePercentage || 0}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEditClick(student)}
                                                            className="p-2.5 bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm border border-slate-100"
                                                            title="Edit Student"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(student.id, student.name)}
                                                            className="p-2.5 bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm border border-slate-100"
                                                            title="Delete Student"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* EMPTY STATE: Please Select Selection */
                <div className="bg-white rounded-[3rem] border-2 border-dashed border-slate-200 p-20 text-center animate-in fade-in duration-700">
                    <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner border border-slate-100">
                        <Filter size={40} className="text-slate-300" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Initialize Records</h3>
                    <p className="text-slate-500 font-medium max-w-md mx-auto">Select a university course and section above to synchronize and manage student credentials.</p>
                </div>
            )}

            {/* EDIT MODAL */}
            {editingStudent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
                                    <Edit size={24} className="text-blue-600" />
                                    Security Profile Update
                                </h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Modifying identity credentials</p>
                            </div>
                            <button
                                onClick={() => setEditingStudent(null)}
                                className="p-2.5 hover:bg-slate-200 rounded-full text-slate-500 transition-all active:scale-90"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8 overflow-y-auto scrollbar-hide">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Name</label>
                                    <input
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 shadow-sm rounded-xl px-4 py-3.5 font-bold text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Roll Identifier</label>
                                    <input
                                        value={editRollNumber}
                                        onChange={e => setEditRollNumber(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 shadow-sm rounded-xl px-4 py-3.5 font-bold text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all uppercase outline-none"
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-200 border-dashed text-center space-y-6">
                                <div className="mx-auto w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md text-blue-600 border border-slate-100">
                                    <Smartphone size={28} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Biometric Image Update</h4>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Capture via app or manual upload</p>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <button
                                        onClick={() => {
                                            setDeviceOfflineError(null);
                                            handleRetakeMobile();
                                        }}
                                        disabled={photoUpdateStatus === 'waiting_mobile'}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:scale-[1.02] transition-all disabled:opacity-50"
                                    >
                                        <Smartphone size={16} />
                                        {photoUpdateStatus === 'waiting_mobile' ? 'Syncing...' : 'Remote Capture'}
                                    </button>
                                    
                                    <div className="flex-1 flex relative">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleUpdatePhotoUpload}
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
                                        >
                                            <Upload size={16} />
                                            Manual Upload
                                        </button>
                                    </div>
                                </div>

                                {deviceOfflineError && (
                                    <div className="mt-4 p-5 bg-red-50 border border-red-100 border-dashed rounded-2xl animate-in fade-in slide-in-from-top-2 duration-400">
                                        <div className="flex items-start gap-4 text-left">
                                            <div className="mt-0.5 p-1.5 bg-white rounded-xl text-red-500 shadow-sm border border-red-50">
                                                <AlertCircle size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-red-600 uppercase tracking-tight">Handshake Failed</p>
                                                <p className="text-[10px] text-red-500 font-bold mt-1 leading-relaxed">{deviceOfflineError.message}</p>
                                                {deviceOfflineError.hint && (
                                                    <p className="text-[9px] text-red-400 font-medium mt-1.5 uppercase tracking-widest">{deviceOfflineError.hint}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {photoPreview && (
                                    <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col items-center">
                                        <div className="relative group">
                                            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                                            <img src={photoPreview} alt="Preview" className="relative w-32 h-32 rounded-[1.8rem] object-cover border-4 border-white shadow-2xl" />
                                            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white ring-4 ring-white shadow-xl animate-in zoom-in rotate-12 transition-transform group-hover:rotate-0">
                                                <CheckCircle2 size={20} />
                                            </div>
                                        </div>
                                        <span className="mt-5 text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            New Data Ready
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4 flex-shrink-0">
                            <button
                                onClick={() => setEditingStudent(null)}
                                className="px-8 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-200/50 transition-colors uppercase tracking-widest text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateDetails}
                                disabled={isUpdating}
                                className="px-8 py-4 rounded-xl font-black text-white bg-slate-900 hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center gap-3 uppercase tracking-widest text-xs"
                            >
                                {isUpdating ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                Synchronize Updates
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {studentToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 p-10 text-center">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 text-red-500 border border-red-100 shadow-inner">
                            {isDeleting ? <Loader2 className="animate-spin" size={32} /> : <Trash2 size={32} />}
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 mb-3 uppercase tracking-tight">
                            {isDeleting ? 'Deleting...' : 'Permanent Erasure?'}
                        </h3>
                        <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                            {isDeleting
                                ? 'Executing secure deletion protocol for record removal.'
                                : <span>Are you sure you want to delete <strong className="text-slate-900 underline decoration-red-200 decoration-4">{studentToDelete.name}</strong>? This action cannot be undone.</span>
                            }
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setStudentToDelete(null)}
                                disabled={isDeleting}
                                className="flex-1 py-4 rounded-xl font-extrabold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:pointer-events-none uppercase tracking-widest text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="flex-1 py-4 rounded-xl font-black text-white bg-red-500 hover:bg-red-600 transition-all shadow-xl shadow-red-200 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                            >
                                {isDeleting ? <Loader2 className="animate-spin" size={20} /> : 'Delete Record'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
