import { http } from './http';

export type LoginInput = { username: string; password: string };
export type LoginResponse = {
    token: string;
    isFirstLogin: boolean;
    user: { id: string; name: string; username: string };
    twoFactorRequired?: boolean;
    email?: string;
};

export type RegisterInput = { name: string; email: string; username: string; password: string };

export async function loginApi(data: LoginInput): Promise<LoginResponse> {
    const res = await http.post<LoginResponse>('/api/auth/login', data);
    return res.data;
}

export async function registerApi(data: RegisterInput): Promise<LoginResponse> {
    const res = await http.post<LoginResponse>('/api/auth/register', data);
    return res.data;
}

export type UserProfile = {
    id: string;
    name: string;
    username: string;
    email?: string;
    isFirstLogin?: boolean;
    twoFactorEnabled?: boolean;
};

export interface DeviceInfo {
    deviceId: string;
    deviceName: string;
    lastLogin: string;
    isTrusted: boolean;
}

export async function getProfileApi(): Promise<{ user: UserProfile }> {
    const res = await http.get<{ user: UserProfile }>('/api/auth/profile');
    return res.data;
}

export async function getDevicesApi(): Promise<{ devices: DeviceInfo[] }> {
    const res = await http.get<{ devices: DeviceInfo[] }>('/api/auth/devices');
    return res.data;
}

export async function revokeDeviceApi(deviceId: string): Promise<{ devices: DeviceInfo[] }> {
    const res = await http.delete<{ devices: DeviceInfo[] }>(`/api/auth/devices/${deviceId}`);
    return res.data;
}

export async function trustDeviceApi(deviceId: string): Promise<{ devices: DeviceInfo[] }> {
    const res = await http.post<{ devices: DeviceInfo[] }>('/api/auth/devices/trust', { deviceId });
    return res.data;
}

export async function logoutDeviceApi(deviceId: string): Promise<void> {
    await http.post('/api/auth/devices/logout', { deviceId });
}

export async function logoutApi(): Promise<void> {
    await http.post('/api/auth/logout');
}

export async function forgotPasswordApi(email: string): Promise<void> {
    await http.post('/api/auth/forgot-password', { email });
}

export async function resetPasswordApi(data: any): Promise<void> {
    await http.post('/api/auth/reset-password', data);
}

export async function verifyOtpApi(email: string, otp: string): Promise<LoginResponse> {
    const res = await http.post<LoginResponse>('/api/auth/verify-otp', { email, otp });
    return res.data;
}

export async function resendOtpApi(email: string): Promise<void> {
    await http.post('/api/auth/resend-otp', { email });
}

export async function verify2faApi(email: string, otp: string): Promise<LoginResponse> {
    const res = await http.post<LoginResponse>('/api/auth/verify-2fa', { email, otp });
    return res.data;
}

export async function toggle2faApi(enabled: boolean): Promise<void> {
    await http.post('/api/auth/toggle-2fa', { enabled });
}

export async function resend2faApi(email: string): Promise<void> {
    await http.post('/api/auth/resend-2fa', { email });
}
