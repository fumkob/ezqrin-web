'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User } from '@/lib/generated/model';
import { login as apiLogin, logout as apiLogout } from '@/lib/api/auth';
import { setTokens, getStoredRefreshToken } from '@/lib/api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const rt = getStoredRefreshToken();
    if (storedUser && rt) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin({ email, password });
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
  }, []);

  const logout = useCallback(async () => {
    await apiLogout().catch(() => {});
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('refresh_token');
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
