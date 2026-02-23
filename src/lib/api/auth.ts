import { apiFetch, setTokens, clearTokens } from './client';
import type { AuthResponse, LoginRequest } from '@/types/api';

export async function login(req: LoginRequest): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ ...req, client_type: 'web' }),
  });
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function logout(currentRefreshToken: string): Promise<void> {
  await apiFetch<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: currentRefreshToken }),
  });
  clearTokens();
}
