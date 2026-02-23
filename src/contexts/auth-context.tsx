'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  startTransition,
  type ReactNode,
} from 'react';
import type { User } from '@/lib/generated/model';
import { login as apiLogin, logout as apiLogout } from '@/lib/api/auth';
import { getStoredRefreshToken, refreshAccessToken, setOnUnauthorized } from '@/lib/api/client';

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

    setOnUnauthorized(() => {
      startTransition(() => {
        setUser(null);
        localStorage.removeItem('user');
      });
    });

    if (storedUser && rt) {
      refreshAccessToken().then((newToken) => {
        startTransition(() => {
          if (newToken) {
            setUser(JSON.parse(storedUser));
          } else {
            localStorage.removeItem('user');
          }
          setIsLoading(false);
        });
      });
    } else {
      startTransition(() => setIsLoading(false));
    }
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
