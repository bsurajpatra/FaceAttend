import { http } from './http';

export interface Student {
    id: string;
    name: string;
    rollNumber: string;
    subject: string;
    section: string;
    sessionType: string;
    createdAt: string;
    attendancePercentage?: number;
}

export interface GetStudentsResponse {
    students: Student[];
}

export async function getStudentsApi(subject: string, section: string): Promise<GetStudentsResponse> {
    const res = await http.get<GetStudentsResponse>('/api/students', {
        params: { subject, section }
    });
    return res.data;
}

export async function deleteStudentApi(studentId: string): Promise<{ message: string }> {
    const res = await http.delete<{ message: string }>(`/api/students/${studentId}`);
    return res.data;
}

export async function updateStudentApi(studentId: string, data: { name?: string; rollNumber?: string; faceImageBase64?: string }): Promise<{ message: string }> {
    const res = await http.put<{ message: string }>(`/api/students/${studentId}`, data);
    return res.data;
}
