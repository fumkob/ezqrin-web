# ezqrin Web管理ツール MVP 実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Next.js + React でezqrin APIと連携したイベント管理Web管理ツールを構築する

**Architecture:**
Next.js 15 App Routerを使い、認証済みユーザーがイベント・参加者・チェックインを管理できるSPAライクな管理画面を構築する。APIクライアントはfetchベースでJWTトークン自動更新を行い、TanStack QueryでサーバーステートをキャッシュしてUXを向上させる。

**Tech Stack:**
- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query v5 (サーバーステート管理)
- React Hook Form + Zod (フォームバリデーション)
- API: `http://localhost:8080/api/v1` (JWT認証)

---

## 前提知識

### API認証フロー
- `POST /api/v1/auth/login` でaccess_token (15分) + refresh_token (7日) を取得
- 全保護エンドポイントに `Authorization: Bearer <access_token>` ヘッダーを付与
- access_tokenが切れたら `POST /api/v1/auth/refresh` で更新

### 主要エンティティ
- **Event**: id, name, description, start_date, end_date, location, timezone, status (draft/published/ongoing/completed/cancelled)
- **Participant**: id, name, email, status (tentative/confirmed/cancelled/declined), payment_status, checked_in
- **CheckIn**: id, participant_id, checked_in_at, checkin_method (qrcode/manual)

### ユーザーロール
- `admin`: 全イベントにアクセス可
- `organizer`: 自分が作成したイベントのみ
- `staff`: アサインされたイベントのみ (参照・チェックインのみ)

---

## MVP スコープ

以下の画面を実装する:
1. ログイン画面
2. ダッシュボード（イベント一覧）
3. イベント作成・編集
4. 参加者管理（一覧・追加・編集・削除・CSVインポート・エクスポート）
5. チェックイン画面（手動チェックイン + 履歴）
6. イベント統計

---

## Task 1: Next.jsプロジェクト初期化

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`

**Step 1: Next.jsプロジェクトを作成**

```bash
cd /Users/fumkob/Documents/ezqrin/ezqrin-web/main
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

**Step 2: shadcn/uiを初期化**

```bash
npx shadcn@latest init
# スタイル: Default
# ベースカラー: Slate
# CSS変数: Yes
```

**Step 3: 必要な依存関係をインストール**

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
npm install react-hook-form @hookform/resolvers zod
npm install date-fns
npm install lucide-react
```

**Step 4: shadcn/uiコンポーネントを追加**

```bash
npx shadcn@latest add button card input label form table badge dialog select textarea toast sonner
```

**Step 5: 動作確認**

```bash
npm run dev
```
Expected: `http://localhost:3000` でNext.jsのデフォルト画面が表示される

**Step 6: コミット**

```bash
git add -A
git commit -m "feat: initialize Next.js project with shadcn/ui and dependencies"
```

---

## Task 2: 型定義とAPIクライアント

**Files:**
- Create: `src/types/api.ts`
- Create: `src/lib/api/client.ts`
- Create: `src/lib/api/auth.ts`
- Create: `src/lib/api/events.ts`
- Create: `src/lib/api/participants.ts`
- Create: `src/lib/api/checkins.ts`

### Step 1: 型定義を作成 (`src/types/api.ts`)

```typescript
// 認証
export interface LoginRequest {
  email: string;
  password: string;
  client_type?: 'web' | 'mobile';
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'organizer' | 'staff';
}

// イベント
export type EventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';

export interface Event {
  id: string;
  organizer_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  location?: string;
  timezone: string;
  status: EventStatus;
  participant_count?: number;
  checked_in_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateEventRequest {
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  location?: string;
  timezone?: string;
  status?: EventStatus;
}

// イベント統計
export interface EventStats {
  event_id: string;
  total_participants: number;
  checked_in_count: number;
  pending_count: number;
  check_in_rate: number;
  status_breakdown: {
    confirmed: number;
    tentative: number;
    cancelled: number;
  };
  checkin_timeline: Array<{ hour: string; count: number }>;
  checkin_methods: { qrcode: number; manual: number };
}

// 参加者
export type ParticipantStatus = 'tentative' | 'confirmed' | 'cancelled' | 'declined';
export type PaymentStatus = 'unpaid' | 'paid';

export interface Participant {
  id: string;
  event_id: string;
  name: string;
  email: string;
  qr_email?: string;
  employee_id?: string;
  phone?: string;
  status: ParticipantStatus;
  payment_status: PaymentStatus;
  payment_amount?: number;
  payment_date?: string;
  qr_code?: string;
  metadata?: Record<string, unknown>;
  checked_in: boolean;
  checked_in_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateParticipantRequest {
  name: string;
  email: string;
  qr_email?: string;
  employee_id?: string;
  phone?: string;
  status?: ParticipantStatus;
  payment_status?: PaymentStatus;
  payment_amount?: number;
  payment_date?: string;
  metadata?: Record<string, unknown>;
}

// チェックイン
export interface CheckIn {
  id: string;
  event_id: string;
  participant: { id: string; name: string; email: string };
  checked_in_at: string;
  checked_in_by: { id: string; name: string };
  checkin_method: 'qrcode' | 'manual';
}

export interface PerformCheckinRequest {
  qr_code?: string;
  participant_id?: string;
  checkin_method?: 'qrcode' | 'manual';
}

// ページネーション
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

// エラー
export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  errors?: Array<{ field: string; message: string }>;
}
```

### Step 2: APIクライアントを作成 (`src/lib/api/client.ts`)

```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  if (typeof window !== 'undefined') {
    localStorage.setItem('refresh_token', refresh);
  }
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('refresh_token');
  }
}

export function getStoredRefreshToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('refresh_token');
  }
  return null;
}

async function refreshAccessToken(): Promise<string | null> {
  const rt = refreshToken ?? getStoredRefreshToken();
  if (!rt) return null;

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: rt }),
  });

  if (!res.ok) {
    clearTokens();
    return null;
  }

  const data = await res.json();
  setTokens(data.access_token, data.refresh_token);
  return data.access_token;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(path, options, false);
    }
    // リダイレクトはReact側で処理
    throw new Error('UNAUTHORIZED');
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json();

  if (!res.ok) {
    throw data;
  }

  return data as T;
}
```

### Step 3: 各APIモジュールを作成

**`src/lib/api/auth.ts`:**
```typescript
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
```

**`src/lib/api/events.ts`:**
```typescript
import { apiFetch } from './client';
import type { Event, CreateEventRequest, EventStats, PaginatedResponse } from '@/types/api';

export async function listEvents(params?: {
  page?: number;
  per_page?: number;
  status?: string;
  search?: string;
}): Promise<PaginatedResponse<Event>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.per_page) qs.set('per_page', String(params.per_page));
  if (params?.status) qs.set('status', params.status);
  if (params?.search) qs.set('search', params.search);
  return apiFetch<PaginatedResponse<Event>>(`/events?${qs}`);
}

export async function getEvent(id: string): Promise<Event> {
  return apiFetch<Event>(`/events/${id}`);
}

export async function createEvent(req: CreateEventRequest): Promise<Event> {
  return apiFetch<Event>('/events', { method: 'POST', body: JSON.stringify(req) });
}

export async function updateEvent(id: string, req: Partial<CreateEventRequest>): Promise<Event> {
  return apiFetch<Event>(`/events/${id}`, { method: 'PUT', body: JSON.stringify(req) });
}

export async function deleteEvent(id: string): Promise<void> {
  return apiFetch<void>(`/events/${id}`, { method: 'DELETE' });
}

export async function getEventStats(id: string): Promise<EventStats> {
  return apiFetch<EventStats>(`/events/${id}/stats`);
}
```

**`src/lib/api/participants.ts`:**
```typescript
import { apiFetch } from './client';
import type {
  Participant, CreateParticipantRequest, PaginatedResponse
} from '@/types/api';

export async function listParticipants(
  eventId: string,
  params?: { page?: number; per_page?: number; status?: string; search?: string; checked_in?: boolean }
): Promise<PaginatedResponse<Participant>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.per_page) qs.set('per_page', String(params.per_page));
  if (params?.status) qs.set('status', params.status);
  if (params?.search) qs.set('search', params.search);
  if (params?.checked_in !== undefined) qs.set('checked_in', String(params.checked_in));
  return apiFetch<PaginatedResponse<Participant>>(`/events/${eventId}/participants?${qs}`);
}

export async function addParticipant(
  eventId: string, req: CreateParticipantRequest
): Promise<Participant> {
  return apiFetch<Participant>(`/events/${eventId}/participants`, {
    method: 'POST', body: JSON.stringify(req)
  });
}

export async function updateParticipant(
  eventId: string, participantId: string, req: Partial<CreateParticipantRequest>
): Promise<Participant> {
  return apiFetch<Participant>(`/events/${eventId}/participants/${participantId}`, {
    method: 'PATCH', body: JSON.stringify(req)
  });
}

export async function deleteParticipant(eventId: string, participantId: string): Promise<void> {
  return apiFetch<void>(`/events/${eventId}/participants/${participantId}`, { method: 'DELETE' });
}

export async function importParticipantsCSV(
  eventId: string, file: File, skipDuplicates = true
): Promise<{ imported_count: number; skipped_count: number; failed_count: number }> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch(`/events/${eventId}/participants/import?skip_duplicates=${skipDuplicates}`, {
    method: 'POST',
    body: formData,
    headers: {}, // Content-Typeはブラウザが自動設定
  });
}

export function exportParticipantsURL(eventId: string): string {
  return `/events/${eventId}/participants/export`;
}
```

**`src/lib/api/checkins.ts`:**
```typescript
import { apiFetch } from './client';
import type { CheckIn, PerformCheckinRequest, PaginatedResponse } from '@/types/api';

export async function performCheckin(
  eventId: string, req: PerformCheckinRequest
): Promise<CheckIn> {
  return apiFetch<CheckIn>(`/events/${eventId}/checkin`, {
    method: 'POST', body: JSON.stringify(req)
  });
}

export async function listCheckins(
  eventId: string,
  params?: { page?: number; per_page?: number; search?: string }
): Promise<PaginatedResponse<CheckIn>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.per_page) qs.set('per_page', String(params.per_page));
  if (params?.search) qs.set('search', params.search);
  return apiFetch<PaginatedResponse<CheckIn>>(`/events/${eventId}/checkins?${qs}`);
}
```

### Step 4: `.env.local`を作成

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### Step 5: コミット

```bash
git add -A
git commit -m "feat: add TypeScript types and API client"
```

---

## Task 3: 認証コンテキストとミドルウェア

**Files:**
- Create: `src/contexts/auth-context.tsx`
- Create: `src/middleware.ts`
- Modify: `src/app/layout.tsx`

### Step 1: 認証コンテキストを作成 (`src/contexts/auth-context.tsx`)

```typescript
'use client';

import {
  createContext, useContext, useState, useEffect, useCallback, type ReactNode
} from 'react';
import type { User } from '@/types/api';
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
    // localStorageからユーザー情報を復元
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
    const rt = getStoredRefreshToken();
    if (rt) {
      await apiLogout(rt).catch(() => {/* best effort */});
    }
    setUser(null);
    localStorage.removeItem('user');
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
```

### Step 2: TanStack QueryプロバイダーとAuthProviderをlayoutに追加

**`src/app/providers.tsx`:**
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000 } }
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**`src/app/layout.tsx`を更新:**
```typescript
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ezqrin 管理画面',
  description: 'イベント管理・チェックインシステム',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={geist.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Step 3: コミット

```bash
git add -A
git commit -m "feat: add auth context and TanStack Query provider"
```

---

## Task 4: ログイン画面

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/layout.tsx`

### Step 1: 認証レイアウトを作成 (`src/app/(auth)/layout.tsx`)

```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      {children}
    </div>
  );
}
```

### Step 2: ログインページを作成 (`src/app/(auth)/login/page.tsx`)

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch {
      toast.error('メールアドレスまたはパスワードが正しくありません');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>ezqrin</CardTitle>
        <CardDescription>管理画面にログイン</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

### Step 3: 動作確認

```bash
npm run dev
```
Expected: `http://localhost:3000/login` でログインフォームが表示される

### Step 4: コミット

```bash
git add -A
git commit -m "feat: add login page"
```

---

## Task 5: 管理画面レイアウトとナビゲーション

**Files:**
- Create: `src/app/(admin)/layout.tsx`
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/header.tsx`

### Step 1: サイドバーコンポーネントを作成 (`src/components/layout/sidebar.tsx`)

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Users, QrCode, BarChart2, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/events', label: 'イベント', icon: Calendar },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold">ezqrin</h1>
        <p className="text-sm text-slate-400 mt-1">{user?.name}</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              pathname.startsWith(href)
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-700">
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-3" />
          ログアウト
        </Button>
      </div>
    </aside>
  );
}
```

### Step 2: 管理画面レイアウトを作成 (`src/app/(admin)/layout.tsx`)

```typescript
'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  if (!user) return null;

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-64 flex-1 min-h-screen bg-slate-50 p-8">
        {children}
      </main>
    </div>
  );
}
```

### Step 3: ルートページをダッシュボードにリダイレクト (`src/app/page.tsx`)

```typescript
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
```

### Step 4: コミット

```bash
git add -A
git commit -m "feat: add admin layout with sidebar navigation"
```

---

## Task 6: ダッシュボード（イベント一覧）

**Files:**
- Create: `src/app/(admin)/dashboard/page.tsx`
- Create: `src/components/events/event-card.tsx`
- Create: `src/hooks/use-events.ts`

### Step 1: イベントフックを作成 (`src/hooks/use-events.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listEvents, getEvent, createEvent, updateEvent, deleteEvent, getEventStats } from '@/lib/api/events';
import type { CreateEventRequest } from '@/types/api';

export const eventKeys = {
  all: ['events'] as const,
  list: (params?: object) => [...eventKeys.all, 'list', params] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
  stats: (id: string) => [...eventKeys.all, 'stats', id] as const,
};

export function useEvents(params?: { page?: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: () => listEvents(params),
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => getEvent(id),
  });
}

export function useEventStats(id: string) {
  return useQuery({
    queryKey: eventKeys.stats(id),
    queryFn: () => getEventStats(id),
    refetchInterval: 30_000, // 30秒ごとに更新
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
  });
}

export function useUpdateEvent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: Partial<CreateEventRequest>) => updateEvent(id, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
  });
}
```

### Step 2: イベントカードコンポーネントを作成 (`src/components/events/event-card.tsx`)

```typescript
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users } from 'lucide-react';
import type { Event } from '@/types/api';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: '下書き', variant: 'secondary' },
  published: { label: '公開中', variant: 'default' },
  ongoing: { label: '開催中', variant: 'default' },
  completed: { label: '終了', variant: 'outline' },
  cancelled: { label: 'キャンセル', variant: 'destructive' },
};

export function EventCard({ event }: { event: Event }) {
  const status = statusConfig[event.status] ?? { label: event.status, variant: 'secondary' };

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{event.name}</CardTitle>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(event.start_date), 'yyyy年M月d日(E) HH:mm', { locale: ja })}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{event.location}</span>
            </div>
          )}
          {event.participant_count !== undefined && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>
                {event.checked_in_count ?? 0} / {event.participant_count} 名チェックイン
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
```

### Step 3: ダッシュボードページを作成 (`src/app/(admin)/dashboard/page.tsx`)

```typescript
'use client';

import { useState } from 'react';
import { useEvents } from '@/hooks/use-events';
import { EventCard } from '@/components/events/event-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const { data, isLoading } = useEvents({ search: search || undefined, status: status || undefined });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">イベント一覧</h1>
        <Button asChild>
          <Link href="/events/new">
            <Plus className="h-4 w-4 mr-2" />
            新規イベント作成
          </Link>
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="イベント名で検索..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">すべて</SelectItem>
            <SelectItem value="draft">下書き</SelectItem>
            <SelectItem value="published">公開中</SelectItem>
            <SelectItem value="ongoing">開催中</SelectItem>
            <SelectItem value="completed">終了</SelectItem>
            <SelectItem value="cancelled">キャンセル</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">読み込み中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.data.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
          {data?.data.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-12">
              イベントが見つかりません
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

### Step 4: コミット

```bash
git add -A
git commit -m "feat: add dashboard with event list"
```

---

## Task 7: イベント作成・編集フォーム

**Files:**
- Create: `src/app/(admin)/events/new/page.tsx`
- Create: `src/app/(admin)/events/[id]/edit/page.tsx`
- Create: `src/components/events/event-form.tsx`

### Step 1: イベントフォームコンポーネントを作成 (`src/components/events/event-form.tsx`)

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import type { CreateEventRequest, Event } from '@/types/api';

const schema = z.object({
  name: z.string().min(1, '必須').max(255),
  description: z.string().max(5000).optional(),
  start_date: z.string().min(1, '必須'),
  end_date: z.string().optional(),
  location: z.string().max(500).optional(),
  timezone: z.string().default('Asia/Tokyo'),
  status: z.enum(['draft', 'published', 'ongoing', 'completed', 'cancelled']).default('draft'),
});

type FormData = z.infer<typeof schema>;

interface EventFormProps {
  defaultValues?: Partial<Event>;
  onSubmit: (data: CreateEventRequest) => Promise<void>;
  isLoading: boolean;
}

export function EventForm({ defaultValues, onSubmit, isLoading }: EventFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      start_date: defaultValues?.start_date?.slice(0, 16) ?? '',
      end_date: defaultValues?.end_date?.slice(0, 16) ?? '',
      location: defaultValues?.location ?? '',
      timezone: defaultValues?.timezone ?? 'Asia/Tokyo',
      status: defaultValues?.status ?? 'draft',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="name">イベント名 *</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea id="description" {...register('description')} rows={4} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">開始日時 *</Label>
          <Input id="start_date" type="datetime-local" {...register('start_date')} />
          {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">終了日時</Label>
          <Input id="end_date" type="datetime-local" {...register('end_date')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">会場</Label>
        <Input id="location" {...register('location')} />
      </div>

      <div className="space-y-2">
        <Label>ステータス</Label>
        <Select defaultValue={watch('status')} onValueChange={(v) => setValue('status', v as FormData['status'])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">下書き</SelectItem>
            <SelectItem value="published">公開</SelectItem>
            <SelectItem value="ongoing">開催中</SelectItem>
            <SelectItem value="completed">終了</SelectItem>
            <SelectItem value="cancelled">キャンセル</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? '保存中...' : '保存'}
      </Button>
    </form>
  );
}
```

### Step 2: イベント新規作成ページ (`src/app/(admin)/events/new/page.tsx`)

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { EventForm } from '@/components/events/event-form';
import { useCreateEvent } from '@/hooks/use-events';
import { toast } from 'sonner';
import type { CreateEventRequest } from '@/types/api';

export default function NewEventPage() {
  const router = useRouter();
  const { mutateAsync, isPending } = useCreateEvent();

  async function handleSubmit(data: CreateEventRequest) {
    try {
      const event = await mutateAsync(data);
      toast.success('イベントを作成しました');
      router.push(`/events/${event.id}`);
    } catch {
      toast.error('イベントの作成に失敗しました');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">新規イベント作成</h1>
      <EventForm onSubmit={handleSubmit} isLoading={isPending} />
    </div>
  );
}
```

### Step 3: コミット

```bash
git add -A
git commit -m "feat: add event create/edit form"
```

---

## Task 8: イベント詳細ページ

**Files:**
- Create: `src/app/(admin)/events/[id]/page.tsx`
- Create: `src/components/events/event-stats-card.tsx`

### Step 1: 統計カードコンポーネント (`src/components/events/event-stats-card.tsx`)

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EventStats } from '@/types/api';
import { Users, UserCheck, Clock, TrendingUp } from 'lucide-react';

export function EventStatsCard({ stats }: { stats: EventStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" /> 参加者総数
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.total_participants}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> チェックイン済み
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.checked_in_count}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" /> 未チェックイン
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.pending_count}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> 達成率
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.check_in_rate.toFixed(1)}%</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 2: イベント詳細ページ (`src/app/(admin)/events/[id]/page.tsx`)

```typescript
'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEvent, useEventStats, useDeleteEvent } from '@/hooks/use-events';
import { EventStatsCard } from '@/components/events/event-stats-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Users, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { toast } from 'sonner';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: event, isLoading } = useEvent(id);
  const { data: stats } = useEventStats(id);
  const { mutateAsync: deleteEvent } = useDeleteEvent();

  async function handleDelete() {
    if (!confirm('このイベントを削除しますか？')) return;
    try {
      await deleteEvent(id);
      toast.success('イベントを削除しました');
      router.push('/dashboard');
    } catch {
      toast.error('削除に失敗しました');
    }
  }

  if (isLoading) return <div>読み込み中...</div>;
  if (!event) return <div>イベントが見つかりません</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(event.start_date), 'yyyy年M月d日(E) HH:mm', { locale: ja })}
            {event.location && ` | ${event.location}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/events/${id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />編集
            </Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />削除
          </Button>
        </div>
      </div>

      {stats && <EventStatsCard stats={stats} />}

      <div className="flex gap-3">
        <Button asChild>
          <Link href={`/events/${id}/participants`}>
            <Users className="h-4 w-4 mr-2" />参加者管理
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/events/${id}/checkin`}>
            <ClipboardCheck className="h-4 w-4 mr-2" />チェックイン
          </Link>
        </Button>
      </div>
    </div>
  );
}
```

### Step 3: コミット

```bash
git add -A
git commit -m "feat: add event detail page with stats"
```

---

## Task 9: 参加者管理画面

**Files:**
- Create: `src/hooks/use-participants.ts`
- Create: `src/app/(admin)/events/[id]/participants/page.tsx`
- Create: `src/components/participants/participant-table.tsx`
- Create: `src/components/participants/add-participant-dialog.tsx`
- Create: `src/components/participants/import-csv-dialog.tsx`

### Step 1: 参加者フックを作成 (`src/hooks/use-participants.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listParticipants, addParticipant, updateParticipant, deleteParticipant, importParticipantsCSV
} from '@/lib/api/participants';
import type { CreateParticipantRequest } from '@/types/api';

export const participantKeys = {
  all: (eventId: string) => ['participants', eventId] as const,
  list: (eventId: string, params?: object) => [...participantKeys.all(eventId), params] as const,
};

export function useParticipants(
  eventId: string,
  params?: { page?: number; status?: string; search?: string; checked_in?: boolean }
) {
  return useQuery({
    queryKey: participantKeys.list(eventId, params),
    queryFn: () => listParticipants(eventId, params),
  });
}

export function useAddParticipant(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateParticipantRequest) => addParticipant(eventId, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: participantKeys.all(eventId) }),
  });
}

export function useUpdateParticipant(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: Partial<CreateParticipantRequest> }) =>
      updateParticipant(eventId, id, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: participantKeys.all(eventId) }),
  });
}

export function useDeleteParticipant(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (participantId: string) => deleteParticipant(eventId, participantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: participantKeys.all(eventId) }),
  });
}

export function useImportParticipants(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => importParticipantsCSV(eventId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: participantKeys.all(eventId) }),
  });
}
```

### Step 2: 参加者テーブルコンポーネント (`src/components/participants/participant-table.tsx`)

```typescript
'use client';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, CheckCircle } from 'lucide-react';
import type { Participant } from '@/types/api';

const statusLabels: Record<string, string> = {
  tentative: '仮参加', confirmed: '参加確定', cancelled: 'キャンセル', declined: '不参加'
};

interface ParticipantTableProps {
  participants: Participant[];
  onDelete: (id: string) => void;
}

export function ParticipantTable({ participants, onDelete }: ParticipantTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>名前</TableHead>
          <TableHead>メールアドレス</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead>チェックイン</TableHead>
          <TableHead className="w-16"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {participants.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="font-medium">{p.name}</TableCell>
            <TableCell className="text-muted-foreground">{p.email}</TableCell>
            <TableCell>
              <Badge variant="secondary">{statusLabels[p.status] ?? p.status}</Badge>
            </TableCell>
            <TableCell>
              {p.checked_in ? (
                <span className="flex items-center gap-1 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />済み
                </span>
              ) : (
                <span className="text-muted-foreground text-sm">未</span>
              )}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(p.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### Step 3: 参加者追加ダイアログ (`src/components/participants/add-participant-dialog.tsx`)

```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import type { CreateParticipantRequest } from '@/types/api';

const schema = z.object({
  name: z.string().min(1, '必須'),
  email: z.string().email('有効なメールアドレスを入力してください'),
});

type FormData = z.infer<typeof schema>;

interface AddParticipantDialogProps {
  onAdd: (data: CreateParticipantRequest) => Promise<void>;
}

export function AddParticipantDialog({ onAdd }: AddParticipantDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    try {
      await onAdd(data);
      reset();
      setOpen(false);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />参加者を追加</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>参加者を追加</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>名前 *</Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>メールアドレス *</Label>
            <Input type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>キャンセル</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '追加中...' : '追加'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Step 4: 参加者管理ページ (`src/app/(admin)/events/[id]/participants/page.tsx`)

```typescript
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useParticipants, useAddParticipant, useDeleteParticipant, useImportParticipants } from '@/hooks/use-participants';
import { ParticipantTable } from '@/components/participants/participant-table';
import { AddParticipantDialog } from '@/components/participants/add-participant-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useEvent } from '@/hooks/use-events';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ParticipantsPage() {
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState('');
  const { data: event } = useEvent(id);
  const { data, isLoading } = useParticipants(id, { search: search || undefined });
  const { mutateAsync: addParticipant } = useAddParticipant(id);
  const { mutateAsync: deleteParticipant } = useDeleteParticipant(id);
  const { mutateAsync: importCSV } = useImportParticipants(id);

  async function handleAdd(data: Parameters<typeof addParticipant>[0]) {
    try {
      await addParticipant(data);
      toast.success('参加者を追加しました');
    } catch {
      toast.error('追加に失敗しました');
    }
  }

  async function handleDelete(participantId: string) {
    if (!confirm('この参加者を削除しますか？')) return;
    try {
      await deleteParticipant(participantId);
      toast.success('参加者を削除しました');
    } catch {
      toast.error('削除に失敗しました');
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importCSV(file);
      toast.success(`${result.imported_count}名をインポートしました（スキップ: ${result.skipped_count}名）`);
    } catch {
      toast.error('CSVインポートに失敗しました');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/events/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">
          {event?.name} - 参加者管理
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="名前・メールで検索..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <AddParticipantDialog onAdd={handleAdd} />
        <Button variant="outline" asChild>
          <label className="cursor-pointer">
            <Upload className="h-4 w-4 mr-2" />CSV インポート
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
          </label>
        </Button>
        <Button variant="outline" asChild>
          <a href={`${process.env.NEXT_PUBLIC_API_URL}/events/${id}/participants/export`} download>
            <Download className="h-4 w-4 mr-2" />CSV エクスポート
          </a>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">読み込み中...</div>
      ) : (
        <>
          <ParticipantTable
            participants={data?.data ?? []}
            onDelete={handleDelete}
          />
          <p className="text-sm text-muted-foreground">
            全 {data?.meta.total ?? 0} 名
          </p>
        </>
      )}
    </div>
  );
}
```

### Step 5: コミット

```bash
git add -A
git commit -m "feat: add participant management page"
```

---

## Task 10: チェックイン画面

**Files:**
- Create: `src/hooks/use-checkins.ts`
- Create: `src/app/(admin)/events/[id]/checkin/page.tsx`

### Step 1: チェックインフックを作成 (`src/hooks/use-checkins.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { performCheckin, listCheckins } from '@/lib/api/checkins';
import { eventKeys } from './use-events';
import { participantKeys } from './use-participants';
import type { PerformCheckinRequest } from '@/types/api';

export const checkinKeys = {
  list: (eventId: string) => ['checkins', eventId] as const,
};

export function useCheckins(eventId: string) {
  return useQuery({
    queryKey: checkinKeys.list(eventId),
    queryFn: () => listCheckins(eventId, { per_page: 50 }),
    refetchInterval: 15_000,
  });
}

export function usePerformCheckin(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: PerformCheckinRequest) => performCheckin(eventId, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: checkinKeys.list(eventId) });
      qc.invalidateQueries({ queryKey: participantKeys.all(eventId) });
      qc.invalidateQueries({ queryKey: eventKeys.stats(eventId) });
    },
  });
}
```

### Step 2: チェックインページ (`src/app/(admin)/events/[id]/checkin/page.tsx`)

```typescript
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useCheckins, usePerformCheckin } from '@/hooks/use-checkins';
import { useEvent } from '@/hooks/use-events';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CheckinPage() {
  const { id } = useParams<{ id: string }>();
  const [participantId, setParticipantId] = useState('');
  const { data: event } = useEvent(id);
  const { data: checkins, isLoading } = useCheckins(id);
  const { mutateAsync: performCheckin, isPending } = usePerformCheckin(id);

  async function handleCheckin(e: React.FormEvent) {
    e.preventDefault();
    if (!participantId.trim()) return;
    try {
      const result = await performCheckin({
        participant_id: participantId.trim(),
        checkin_method: 'manual',
      });
      toast.success(`${result.participant.name} さんのチェックインが完了しました`);
      setParticipantId('');
    } catch (err: unknown) {
      const apiErr = err as { code?: string };
      if (apiErr.code === 'CHECKIN_ALREADY_CHECKED_IN') {
        toast.error('この参加者はすでにチェックイン済みです');
      } else {
        toast.error('チェックインに失敗しました');
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/events/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">{event?.name} - チェックイン</h1>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>手動チェックイン</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCheckin} className="space-y-4">
            <div className="space-y-2">
              <Label>参加者ID または QRコード</Label>
              <Input
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                placeholder="参加者IDを入力..."
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending || !participantId.trim()}>
              {isPending ? 'チェックイン中...' : 'チェックイン'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">チェックイン履歴</h2>
        {isLoading ? (
          <p className="text-muted-foreground">読み込み中...</p>
        ) : (
          <div className="space-y-2">
            {checkins?.data.map((ci) => (
              <div key={ci.id} className="flex items-center justify-between p-3 bg-white rounded-md border">
                <div>
                  <p className="font-medium">{ci.participant.name}</p>
                  <p className="text-sm text-muted-foreground">{ci.participant.email}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline">{ci.checkin_method === 'qrcode' ? 'QR' : '手動'}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(ci.checked_in_at), 'HH:mm', { locale: ja })}
                  </p>
                </div>
              </div>
            ))}
            {checkins?.data.length === 0 && (
              <p className="text-muted-foreground">まだチェックインがありません</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 3: コミット

```bash
git add -A
git commit -m "feat: add check-in page with manual check-in and history"
```

---

## Task 11: エラーハンドリングと未認証リダイレクト

**Files:**
- Modify: `src/lib/api/client.ts`
- Create: `src/app/(admin)/events/[id]/edit/page.tsx`

### Step 1: イベント編集ページを作成 (`src/app/(admin)/events/[id]/edit/page.tsx`)

```typescript
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEvent, useUpdateEvent } from '@/hooks/use-events';
import { EventForm } from '@/components/events/event-form';
import { toast } from 'sonner';
import type { CreateEventRequest } from '@/types/api';

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: event, isLoading } = useEvent(id);
  const { mutateAsync, isPending } = useUpdateEvent(id);

  async function handleSubmit(data: CreateEventRequest) {
    try {
      await mutateAsync(data);
      toast.success('イベントを更新しました');
      router.push(`/events/${id}`);
    } catch {
      toast.error('更新に失敗しました');
    }
  }

  if (isLoading) return <div>読み込み中...</div>;
  if (!event) return <div>イベントが見つかりません</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">イベント編集</h1>
      <EventForm defaultValues={event} onSubmit={handleSubmit} isLoading={isPending} />
    </div>
  );
}
```

### Step 2: 未認証時のグローバルリダイレクト処理

`src/lib/api/client.ts`の`apiFetch`関数で`UNAUTHORIZED`エラーをthrowするだけで、
各コンポーネントの`useEffect`でuserがnullならloginへリダイレクトするAdmin layoutが対応する。
追加対応不要。

### Step 3: 最終動作確認

```bash
npm run dev
npm run build
```
Expected: ビルドエラーなし

### Step 4: 最終コミット

```bash
git add -A
git commit -m "feat: add event edit page and complete MVP admin tool"
```

---

## 完成したページ一覧

| URL | ページ |
|-----|--------|
| `/login` | ログイン画面 |
| `/dashboard` | イベント一覧ダッシュボード |
| `/events/new` | イベント新規作成 |
| `/events/:id` | イベント詳細・統計 |
| `/events/:id/edit` | イベント編集 |
| `/events/:id/participants` | 参加者管理（追加・削除・CSV） |
| `/events/:id/checkin` | チェックイン（手動・履歴） |

## APIエンドポイント対応表

| 機能 | エンドポイント |
|------|----------------|
| ログイン | `POST /auth/login` |
| ログアウト | `POST /auth/logout` |
| トークン更新 | `POST /auth/refresh` |
| イベント一覧 | `GET /events` |
| イベント詳細 | `GET /events/:id` |
| イベント作成 | `POST /events` |
| イベント更新 | `PUT /events/:id` |
| イベント削除 | `DELETE /events/:id` |
| イベント統計 | `GET /events/:id/stats` |
| 参加者一覧 | `GET /events/:id/participants` |
| 参加者追加 | `POST /events/:id/participants` |
| 参加者更新 | `PATCH /events/:id/participants/:pid` |
| 参加者削除 | `DELETE /events/:id/participants/:pid` |
| CSVインポート | `POST /events/:id/participants/import` |
| CSVエクスポート | `GET /events/:id/participants/export` |
| チェックイン実施 | `POST /events/:id/checkin` |
| チェックイン履歴 | `GET /events/:id/checkins` |
