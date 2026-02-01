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
    Upload
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
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
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
            const hint = err.response?.data?.hint;
            alert(hint ? `${msg}\n\n${hint}` : msg);
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

    // RENDER: Select Class State
    if (!hasSelectedClass) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] animate-in fade-in zoom-in duration-500 scrollbar-hide">
                <div className="bg-white px-12 py-10 rounded-[2.5rem] shadow-2xl border border-slate-200 text-center max-w-2xl w-full space-y-10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />

                    <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto text-blue-600 shadow-inner">
                        <Users size={40} />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-slate-800 uppercase italic">Select Class</h2>
                        <p className="text-slate-500 font-medium text-sm">Choose a course and section to manage students.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="relative text-left">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Course</label>
                            <select
                                value={selectedSubject}
                                onChange={(e) => {
                                    setSelectedSubject(e.target.value);
                                    setSelectedSection(''); // Reset section
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Select Course...</option>
                                {uniqueSubjects.map((sub: any) => <option key={sub} value={sub}>{sub}</option>)}
                            </select>
                            <Filter className="absolute right-4 bottom-3 text-slate-400 pointer-events-none" size={18} />
                        </div>

                        <div className="relative text-left">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Section</label>
                            <select
                                value={selectedSection}
                                onChange={(e) => setSelectedSection(e.target.value)}
                                disabled={!selectedSubject}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all appearance-none cursor-pointer disabled:opacity-50"
                            >
                                <option value="">Select Section...</option>
                                {availableSections.map((sec: any) => <option key={sec} value={sec}>{sec}</option>)}
                            </select>
                            <Filter className="absolute right-4 bottom-3 text-slate-400 pointer-events-none" size={18} />
                        </div>
                    </div>

                    <button
                        onClick={handleSelectClass}
                        disabled={!selectedSubject || !selectedSection || isLoading}
                        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                        <span>View Students</span>
                    </button>
                </div>
            </div>
        );
    }

    // RENDER: List View with Edit Modal
    return (
        <div className="flex flex-col h-full w-full animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden scrollbar-hide">
            {/* Header Section - Fixed/Non-scrolling part */}
            <div className="flex-none py-6 bg-inherit z-10 w-full">
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                    <div className="flex flex-col gap-1">
                        <button
                            onClick={() => setHasSelectedClass(false)}
                            className="group flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-bold text-xs mb-1 w-fit"
                        >
                            <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                                <ArrowLeft size={12} />
                            </div>
                            Change Class
                        </button>

                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase italic">
                                <Users size={28} className="text-blue-600 mr-1" />
                                {selectedSubject} <span className="text-slate-200 text-xl not-italic">/</span> {selectedSection}
                            </h2>
                            <p className="text-slate-500 font-bold text-xs mt-1">Managing {students.length} students</p>
                        </div>
                    </div>

                    {/* Search Bar - Larger Width */}
                    <div className="relative w-full md:w-[600px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search student..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Content Section - Scrollable */}
            <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden min-h-0 relative flex flex-col mb-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center flex-1 gap-4">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        <p className="text-slate-400 font-bold">Loading students...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-red-500">
                        <AlertCircle className="w-10 h-10" />
                        <p className="font-bold">{error}</p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-slate-400">
                        <Users className="w-16 h-16 opacity-20" />
                        <p className="font-bold text-lg">No students found</p>
                        <p className="text-sm">Add students via Registration tab.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Student Name</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Roll Number</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Attendance Status</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredStudents.map((student) => (
                                    <tr key={student.id} className="group hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 border border-blue-100 italic transition-transform group-hover:scale-110">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <span className="truncate max-w-[200px] text-sm font-bold text-slate-900">{student.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 font-bold text-slate-500 text-xs italic tracking-tight">{student.rollNumber}</td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4 w-60">
                                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${(student.attendancePercentage || 0) >= 75 ? 'bg-emerald-500' :
                                                            (student.attendancePercentage || 0) >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                                            }`}
                                                        style={{ width: `${student.attendancePercentage || 0}%` }}
                                                    />
                                                </div>
                                                <span className={`font-black text-[10px] w-12 text-right italic ${(student.attendancePercentage || 0) >= 75 ? 'text-emerald-600' :
                                                    (student.attendancePercentage || 0) >= 60 ? 'text-amber-600' : 'text-red-600'
                                                    }`}>
                                                    {student.attendancePercentage || 0}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEditClick(student)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Edit Student"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(student.id, student.name)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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

            {/* EDIT MODAL */}
            {editingStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
                            <h3 className="text-xl font-black text-slate-900 uppercase italic flex items-center gap-2">
                                <Edit size={24} className="text-blue-600" />
                                Edit Student
                            </h3>
                            <button
                                onClick={() => setEditingStudent(null)}
                                className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-all active:scale-90"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8 overflow-y-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Name</label>
                                    <input
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 shadow-sm rounded-xl px-4 py-3 font-bold text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Roll Number</label>
                                    <input
                                        value={editRollNumber}
                                        onChange={e => setEditRollNumber(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 shadow-sm rounded-xl px-4 py-3 font-bold text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all uppercase outline-none"
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-200 border-dashed text-center space-y-4">
                                <div className="mx-auto w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-600 border border-slate-100">
                                    <Smartphone size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900 uppercase italic tracking-tight">Update Student Image</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Capture via mobile app or upload manually</p>
                                </div>
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={handleRetakeMobile}
                                        disabled={photoUpdateStatus === 'waiting_mobile'}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase italic tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:scale-[1.02] transition-all disabled:opacity-50"
                                    >
                                        <Smartphone size={14} />
                                        {photoUpdateStatus === 'waiting_mobile' ? 'Checking Mobile...' : 'Use Mobile'}
                                    </button>
                                    <div className="relative">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleUpdatePhotoUpload}
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase italic tracking-widest hover:bg-slate-50 hover:border-blue-200 transition-all active:scale-95"
                                        >
                                            <Upload size={14} />
                                            Upload
                                        </button>
                                    </div>
                                </div>
                                {photoPreview && (
                                    <div className="mt-6 pt-6 border-t border-slate-100">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="relative">
                                                <img src={photoPreview} alt="Preview" className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-xl ring-1 ring-emerald-100" />
                                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white ring-4 ring-white shadow-lg animate-in zoom-in">
                                                    <CheckCircle2 size={16} />
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic flex items-center gap-1">
                                                Ready to update
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 flex-shrink-0">
                            <button
                                onClick={() => setEditingStudent(null)}
                                className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200/50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateDetails}
                                disabled={isUpdating}
                                className="px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isUpdating ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {studentToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-8 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 border border-red-100">
                            {isDeleting ? <Loader2 className="animate-spin" size={32} /> : <AlertCircle size={32} />}
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase italic">
                            {isDeleting ? 'Deleting...' : 'Delete Student?'}
                        </h3>
                        <p className="text-slate-500 font-medium mb-8">
                            {isDeleting
                                ? 'Please wait while we remove the student record.'
                                : <span>Are you sure you want to delete <span className="text-slate-800 font-bold">{studentToDelete.name}</span>? This action cannot be undone.</span>
                            }
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setStudentToDelete(null)}
                                disabled={isDeleting}
                                className="flex-1 py-4 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="flex-1 py-4 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                            >
                                {isDeleting ? <Loader2 className="animate-spin" size={20} /> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
