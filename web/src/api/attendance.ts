import { http } from './http';

export type AttendanceReportsResponse = {
    sessions: Array<{
        id: string;
        subject: string;
        section: string;
        sessionType: string;
        hours: number[];
        date: string;
        totalStudents: number;
        presentStudents: number;
        absentStudents: number;
        attendancePercentage: number;
        createdAt: string;
        location?: {
            latitude: number;
            longitude: number;
            address?: string;
        };
        isMissed?: boolean;
        missedReason?: string;
        missedNote?: string;
        missedAt?: string;
    }>;
};

export type AttendanceSessionResponse = {
    session: {
        id: string;
        subject: string;
        section: string;
        sessionType: string;
        hours: number[];
        date: string;
        totalStudents: number;
        presentStudents: number;
        absentStudents: number;
        createdAt: string;
        updatedAt: string;
        location?: {
            latitude: number;
            longitude: number;
            address?: string;
        };
    };
    presentStudentsList?: Array<{
        id: string;
        name: string;
        rollNumber: string;
        markedAt: string;
        confidence?: number;
        markedVia?: string;
    }>;
    absentStudentsList?: Array<{
        id: string;
        name: string;
        rollNumber: string;
    }>;
};

export async function getAttendanceReportsApi(params?: {
    subject?: string;
    section?: string;
    startDate?: string;
    endDate?: string;
}): Promise<AttendanceReportsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.subject) queryParams.append('subject', params.subject);
    if (params?.section) queryParams.append('section', params.section);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const url = `/api/attendance/reports${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const res = await http.get<AttendanceReportsResponse>(url);
    return res.data;
}

export async function getAttendanceSessionApi(sessionId: string): Promise<AttendanceSessionResponse> {
    const res = await http.get<AttendanceSessionResponse>(`/api/attendance/session/${sessionId}`);
    return res.data;
}

export async function markSessionMissedApi(data: {
    subject: string;
    section: string;
    sessionType: string;
    hours: number[];
    date: string;
    reason: string;
    note?: string;
}): Promise<any> {
    const res = await http.post('/api/attendance/missed', data);
    return res.data;
}
