import { setTokens, clearTokens } from './client';
import { loginUser, logoutUser } from '@/lib/generated/auth/auth';
import type { AuthResponse } from '@/lib/generated/model';
import type { LoginRequest } from '@/lib/generated/model';

export async function login(req: LoginRequest): Promise<AuthResponse> {
  const data = await loginUser(req);
  setTokens(data.access_token, data.refresh_token);
  return data as AuthResponse;
}

export async function logout(): Promise<void> {
  await logoutUser();
  clearTokens();
}
