import { http } from './http';

import { getDeviceId, getDeviceName } from '@/utils/device';

export type LoginInput = { username: string; password: string };
export type LoginResponse = {
  token: string;
  user: { id: string; name: string; username: string };
  isTrusted?: boolean;
};

export async function loginApi(data: LoginInput): Promise<LoginResponse> {
  const deviceId = await getDeviceId();
  const deviceName = getDeviceName();
  const res = await http.post<LoginResponse>('/api/auth/login', {
    ...data,
    deviceId,
    deviceName
  });
  // Map server response 'currentDeviceTrusted' to 'isTrusted'
  const responseData: any = res.data;
  if (responseData.currentDeviceTrusted !== undefined) {
    responseData.isTrusted = responseData.currentDeviceTrusted;
  }
  return responseData;
}

export type RegisterInput = { name: string; email: string; username: string; password: string };
export async function registerApi(data: RegisterInput): Promise<LoginResponse> {
  const res = await http.post<LoginResponse>('/api/auth/register', data);
  return res.data;
}

export type UpdateProfileInput = { name: string; email: string; username: string };
export type UpdateProfileResponse = {
  user: { id: string; name: string; username: string; email?: string };
  emailVerificationRequired?: boolean;
  message?: string;
};

export async function updateProfileApi(data: UpdateProfileInput): Promise<UpdateProfileResponse> {
  const res = await http.put<UpdateProfileResponse>('/api/auth/profile', data);
  return res.data;
}

export async function getProfileApi(): Promise<UpdateProfileResponse> {
  const res = await http.get<UpdateProfileResponse>('/api/auth/profile');
  return res.data;
}

export type FacultySubjectsResponse = {
  subjects: string[];
  subjectSections: { [key: string]: string[] };
  subjectSessionTypes: { [key: string]: string[] };
};

export async function getFacultySubjectsApi(): Promise<FacultySubjectsResponse> {
  const res = await http.get<FacultySubjectsResponse>('/api/auth/subjects');
  return res.data;
}

export async function logoutApi(): Promise<void> {
  try {
    await http.post('/api/auth/logout');
  } catch (error) {
    console.warn('Logout API failed:', error);
  }
}



export type ChangePasswordInput = { oldPassword?: string; newPassword?: string; confirmPassword?: string };

export async function changePasswordApi(data: ChangePasswordInput): Promise<void> {
  await http.put('/api/auth/password', data);
}

export async function verifyEmailChangeApi(otp: string): Promise<UpdateProfileResponse> {
  const res = await http.post<UpdateProfileResponse>('/api/auth/verify-email-change', { otp });
  return res.data;
}

export async function getDevicesApi(): Promise<{ devices: any[] }> {
  const res = await http.get<{ devices: any[] }>('/api/auth/devices');
  return res.data;
}
