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

export async function getProfileApi(): Promise<{ user: UserProfile }> {
    const res = await http.get<{ user: UserProfile }>('/api/auth/profile');
    return res.data;
}
