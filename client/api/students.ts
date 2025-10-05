import { http } from './http';

export type RegisterStudentInput = {
  name: string;
  rollNumber: string;
  subject: string;
  section: string;
  sessionType: 'Lecture' | 'Tutorial' | 'Practical' | 'Skill';
  faceDescriptor: number[];
};

export async function registerStudentApi(data: RegisterStudentInput): Promise<{ message: string; studentId: string }> {
  const res = await http.post<{ message: string; studentId: string }>(`/api/students/register`, data);
  return res.data;
}


