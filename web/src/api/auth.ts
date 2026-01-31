import { http } from './http';

export type LoginInput = { username: string; password: string };
export type LoginResponse = { token: string; user: { id: string; name: string; username: string } };

export type RegisterInput = { name: string; email: string; username: string; password: string };

export async function loginApi(data: LoginInput): Promise<LoginResponse> {
    const res = await http.post<LoginResponse>('/api/auth/login', data);
    return res.data;
}

export async function registerApi(data: RegisterInput): Promise<LoginResponse> {
    const res = await http.post<LoginResponse>('/api/auth/register', data);
    return res.data;
}

export type UserProfile = { id: string; name: string; username: string; email?: string };

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
