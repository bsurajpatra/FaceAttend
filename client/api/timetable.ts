import { http } from './http';

export type Session = {
  subject: string;
  sessionType: 'Lecture' | 'Tutorial' | 'Practical' | 'Skill';
  section: string;
  roomNumber: string;
  hours: number[];
};

export type TimetableDay = {
  day: string;
  sessions: Session[];
};

export type TimetableResponse = {
  timetable: TimetableDay[];
};

export async function getTimetableApi(facultyId: string): Promise<TimetableResponse> {
  const res = await http.get<TimetableResponse>(`/api/timetable/${facultyId}`);
  return res.data;
}

export async function updateTimetableApi(facultyId: string, timetable: TimetableDay[]): Promise<TimetableResponse> {
  const res = await http.put<TimetableResponse>(`/api/timetable/${facultyId}`, { timetable });
  return res.data;
}
