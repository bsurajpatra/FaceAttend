import { http } from './http';

export type LoginInput = { username: string; password: string };
export type LoginResponse = { token: string; user: { id: string; name: string; username: string } };

export async function loginApi(data: LoginInput): Promise<LoginResponse> {
  const res = await http.post<LoginResponse>('/api/auth/login', data);
  return res.data;
}

export type RegisterInput = { name: string; username: string; password: string };
export async function registerApi(data: RegisterInput): Promise<LoginResponse> {
  const res = await http.post<LoginResponse>('/api/auth/register', data);
  return res.data;
}


