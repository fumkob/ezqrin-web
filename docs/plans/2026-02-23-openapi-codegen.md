# OpenAPI コード自動生成 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `ezqrin-server` を git submodule として追加し、orval で OpenAPI から TypeScript 型・API 関数・TanStack Query フックを自動生成し、既存の手書きコードを置き換える。

**Architecture:** `server/` に submodule を配置 → orval が `server/api/openapi.yaml` を読み込み → `src/lib/generated/` にタグ別ファイルを生成 → `src/lib/api/client.ts` の `orvalClient` を mutator として全 HTTP リクエストが認証付きで通過。

**Tech Stack:** orval 7.x、TanStack Query v5、Next.js 16

---

## 事前確認: スキーマ差異の注意点

生成コードに移行すると以下のフィールド名が変わる：

| 箇所 | 現在 (手書き) | 生成後 (OpenAPI準拠) |
|------|------------|-----------------|
| EventStats | `checked_in_count` | `checked_in_participants` |
| EventStats | `check_in_rate` | `checkin_rate` |
| EventStats | `pending_count` | なし（計算: `total - checked_in_participants`） |
| CheckIn list | `{ data: [], meta: {} }` | `{ checkins: [], pagination: {} }` |
| CheckIn request | `checkin_method` | `method` |

---

### Task 1: git submodule の追加

**Files:**
- Create: `.gitmodules` (自動生成)
- Create: `server/` (submodule ディレクトリ)

**Step 1: submodule を追加**

```bash
git submodule add https://github.com/fumkob/ezqrin-server.git server
```

Expected: `.gitmodules` が作成され、`server/` ディレクトリに ezqrin-server がクローンされる

**Step 2: 追加を確認**

```bash
ls server/api/
```

Expected: `openapi.yaml` が見えること

**Step 3: コミット**

```bash
git add .gitmodules server
git commit -m "chore: add ezqrin-server as git submodule at server/"
```

---

### Task 2: orval のインストールと package.json の更新

**Files:**
- Modify: `package.json`

**Step 1: orval をインストール**

```bash
npm install -D orval
```

**Step 2: package.json に generate スクリプトを追加**

`package.json` の `"scripts"` に以下を追加：

```json
"generate": "orval"
```

**Step 3: コミット**

```bash
git add package.json package-lock.json
git commit -m "chore: install orval for OpenAPI code generation"
```

---

### Task 3: orval の設定ファイルを作成

**Files:**
- Create: `orval.config.ts`

**Step 1: orval.config.ts を作成**

```typescript
import { defineConfig } from 'orval';

export default defineConfig({
  ezqrin: {
    input: './server/api/openapi.yaml',
    output: {
      mode: 'tags-split',
      target: './src/lib/generated',
      schemas: './src/lib/generated/model',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/lib/api/client.ts',
          name: 'orvalClient',
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
});
```

**Step 2: コミット**

```bash
git add orval.config.ts
git commit -m "chore: add orval config for OpenAPI code generation"
```

---

### Task 4: client.ts に orval 用 mutator を追加

**Files:**
- Modify: `src/lib/api/client.ts`

orval の mutator は `{ url, method, params, data, headers, signal }` を受け取る関数が必要。
既存の `apiFetch` はパス文字列を受け取る設計なので、変換アダプター `orvalClient` を追加する。

**Step 1: client.ts の末尾に orvalClient を追記**

既存の `apiFetch` 関数の後に追加：

```typescript
export type OrvalRequestConfig<T = unknown> = {
  url: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';
  params?: Record<string, unknown>;
  data?: T;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  responseType?: string;
};

export async function orvalClient<T>(config: OrvalRequestConfig): Promise<T> {
  const { url, method, params, data, headers, signal } = config;

  const qs =
    params && Object.keys(params).length > 0
      ? '?' +
        new URLSearchParams(
          Object.fromEntries(
            Object.entries(params)
              .filter(([, v]) => v != null)
              .map(([k, v]) => [k, String(v)]),
          ),
        ).toString()
      : '';

  const isFormData = data instanceof FormData;

  return apiFetch<T>(url + qs, {
    method: method.toUpperCase(),
    headers,
    body:
      data === undefined || data === null
        ? undefined
        : isFormData
          ? (data as FormData)
          : JSON.stringify(data),
    signal,
  });
}
```

**Step 2: コミット**

```bash
git add src/lib/api/client.ts
git commit -m "feat: add orvalClient mutator to client.ts"
```

---

### Task 5: .gitignore に生成ファイルを追加

**Files:**
- Modify: `.gitignore` (存在する場合)、なければ作成

**Step 1: .gitignore を確認して追記**

`.gitignore` に以下を追加（既存の next.js 用 gitignore に追記）：

```
# Generated API code
src/lib/generated/
```

**Step 2: コミット**

```bash
git add .gitignore
git commit -m "chore: gitignore generated API code"
```

---

### Task 6: コード生成の実行と出力確認

**Files:**
- Create: `src/lib/generated/` (自動生成)

**Step 1: コードを生成**

```bash
npm run generate
```

Expected: `src/lib/generated/` 以下にファイルが生成される。エラーが出た場合は原因を調査する。

**Step 2: 生成されたファイルの一覧を確認**

```bash
find src/lib/generated -type f -name "*.ts" | sort
```

Expected: タグ別のファイル（`auth.ts`, `events.ts`, `participants.ts`, `checkin.ts` など）と `model/` ディレクトリ

**Step 3: 生成された events.ts の関数名を確認**

```bash
grep "^export" src/lib/generated/events.ts | head -20
```

Expected: `getEvents`, `postEvents`, `getEventsId` などの関数名と対応する `useGetEvents` などのフック名。**実際の名前をメモしておくこと**（後のタスクで使用）。

**Step 4: 生成された checkin.ts の関数名を確認**

```bash
grep "^export" src/lib/generated/checkin.ts | head -20
```

---

### Task 7: auth.ts を薄いラッパーとして更新

**Files:**
- Modify: `src/lib/api/auth.ts`

生成された認証関数は `setTokens` を呼ばないため、`auth.ts` をラッパーとして維持する。

**Step 1: 生成された auth 関数名を確認**

```bash
grep "^export" src/lib/generated/auth.ts | head -20
```

ログイン関数（`loginUser` または `postAuthLogin` など）とログアウト関数名をメモする。

**Step 2: auth.ts を生成コードのラッパーに書き換える**

`src/lib/api/auth.ts` の内容を以下のように書き換える（`loginUser` は実際の関数名に合わせる）：

```typescript
import { setTokens, clearTokens } from './client';
import type { AuthResponse } from '@/lib/generated/model';

// 生成された関数をインポート（実際の関数名に合わせて変更）
export { loginUser, logoutUser } from '@/lib/generated/auth';

export async function login(email: string, password: string): Promise<AuthResponse> {
  // 生成された loginUser 関数を使用（実際の関数名に合わせて変更）
  const { loginUser } = await import('@/lib/generated/auth');
  const data = await loginUser({ email, password });
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function logout(currentRefreshToken: string): Promise<void> {
  // 生成された logoutUser 関数を使用（実際の関数名に合わせて変更）
  const { logoutUser } = await import('@/lib/generated/auth');
  await logoutUser({ refresh_token: currentRefreshToken });
  clearTokens();
}
```

**注意**: 実際の生成関数名（Task 6 Step 1 で確認）に合わせて import パスと関数名を変更すること。

**Step 3: コミット**

```bash
git add src/lib/api/auth.ts
git commit -m "refactor: update auth.ts to wrap generated auth functions"
```

---

### Task 8: use-events.ts を生成フックに切り替え

**Files:**
- Modify: `src/hooks/use-events.ts`
- Delete: `src/lib/api/events.ts`（このタスクの最後）

**Step 1: 生成された events フック名を確認（Task 6 Step 3 で確認済みのもの）**

生成ファイルの `useGetEvents`（リスト取得）、`useGetEventsId`（詳細取得）、`useGetEventsIdStats`（統計）等の名前を確認。

**Step 2: use-events.ts を書き換える**

`src/hooks/use-events.ts` を生成フックの re-export + カスタムオプション付きラッパーに書き換える：

```typescript
import { useQueryClient } from '@tanstack/react-query';
// ↓ 実際の生成関数名に合わせて変更
import {
  useGetEvents,
  useGetEventsId,
  useGetEventsIdStats,
  usePostEvents,
  usePutEventsId,
  useDeleteEventsId,
  getGetEventsQueryKey,
  getGetEventsIdQueryKey,
  getGetEventsIdStatsQueryKey,
} from '@/lib/generated/events';
import type { CreateEventRequest } from '@/lib/generated/model';

export const eventKeys = {
  all: ['events'] as const,
  list: (params?: object) => [...eventKeys.all, 'list', params] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
  stats: (id: string) => [...eventKeys.all, 'stats', id] as const,
};

export function useEvents(params?: { page?: number; status?: string; name?: string }) {
  return useGetEvents(params);
}

export function useEvent(id: string) {
  return useGetEventsId(id);
}

export function useEventStats(id: string) {
  return useGetEventsIdStats(id, {
    query: { refetchInterval: 30_000 },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return usePostEvents({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
    },
  });
}

export function useUpdateEvent(id: string) {
  const qc = useQueryClient();
  return usePutEventsId({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useDeleteEventsId({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
    },
  });
}
```

**注意**: 実際の生成フック名（例: `useGetEvents`）に合わせて調整すること。

**Step 3: events.ts を削除**

```bash
rm src/lib/api/events.ts
```

**Step 4: TypeScript エラーがないことを確認**

```bash
npx tsc --noEmit 2>&1 | head -30
```

**Step 5: コミット**

```bash
git add src/hooks/use-events.ts src/lib/api/events.ts
git commit -m "refactor: use-events.ts now wraps orval-generated event hooks"
```

---

### Task 9: use-participants.ts を生成フックに切り替え

**Files:**
- Modify: `src/hooks/use-participants.ts`
- Delete: `src/lib/api/participants.ts`

**Step 1: 生成された participants フック名を確認**

operationId が定義されている場合:
- `useListParticipants` (GET /events/{id}/participants)
- `useCreateParticipant` (POST /events/{id}/participants)
- `useUpdateParticipant` (PATCH /events/{id}/participants/{participantId})
- `useDeleteParticipant` (DELETE /events/{id}/participants/{participantId})

実際の名前を確認：

```bash
grep "^export const use" src/lib/generated/participants.ts
```

**Step 2: use-participants.ts を書き換える**

```typescript
import { useQueryClient } from '@tanstack/react-query';
// ↓ 実際の生成フック名に合わせて変更
import {
  useListParticipants,
  useCreateParticipant,
  useUpdateParticipant,
  useDeleteParticipant,
} from '@/lib/generated/participants';
import type { CreateParticipantRequest } from '@/lib/generated/model';

export const participantKeys = {
  all: (eventId: string) => ['participants', eventId] as const,
  list: (eventId: string, params?: object) =>
    [...participantKeys.all(eventId), params] as const,
};

export function useParticipants(
  eventId: string,
  params?: { page?: number; status?: string; search?: string; checked_in?: boolean },
) {
  return useListParticipants(eventId, params);
}

export function useAddParticipant(eventId: string) {
  const qc = useQueryClient();
  return useCreateParticipant({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: participantKeys.all(eventId) }),
    },
  });
}

export function useUpdateParticipant(eventId: string) {
  const qc = useQueryClient();
  return useUpdateParticipant({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: participantKeys.all(eventId) }),
    },
  });
}

export function useDeleteParticipant(eventId: string) {
  const qc = useQueryClient();
  return useDeleteParticipant({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: participantKeys.all(eventId) }),
    },
  });
}
```

**Step 3: participants.ts を削除**

```bash
rm src/lib/api/participants.ts
```

**Step 4: コミット**

```bash
git add src/hooks/use-participants.ts src/lib/api/participants.ts
git commit -m "refactor: use-participants.ts now wraps orval-generated participant hooks"
```

---

### Task 10: use-checkins.ts を生成フックに切り替え + checkin/page.tsx の修正

**Files:**
- Modify: `src/hooks/use-checkins.ts`
- Modify: `src/app/(admin)/events/[id]/checkin/page.tsx`
- Delete: `src/lib/api/checkins.ts`

**重要**: `CheckInListResponse` の構造は `{ checkins: [], pagination: {} }` であり、
現在の `checkins?.data?.map(...)` を `checkins?.checkins?.map(...)` に変更する必要がある。

**Step 1: 生成された checkin フック名を確認**

```bash
grep "^export const use" src/lib/generated/checkin.ts
```

operationId `checkInParticipant` から `useCheckInParticipant` が生成される。

**Step 2: use-checkins.ts を書き換える**

```typescript
import { useQueryClient } from '@tanstack/react-query';
// ↓ 実際の生成フック名に合わせて変更
import {
  useCheckInParticipant,
  useGetEventsIdCheckins,
} from '@/lib/generated/checkin';

export const checkinKeys = {
  list: (eventId: string) => ['checkins', eventId] as const,
};

export function useCheckins(eventId: string) {
  return useGetEventsIdCheckins(eventId, { per_page: 50 }, {
    query: { refetchInterval: 15_000 },
  });
}

export function usePerformCheckin(eventId: string) {
  const qc = useQueryClient();
  return useCheckInParticipant({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: checkinKeys.list(eventId) });
        qc.invalidateQueries({ queryKey: ['participants', eventId] });
        qc.invalidateQueries({ queryKey: ['events', 'stats', eventId] });
      },
    },
  });
}
```

**Step 3: checkin/page.tsx のデータアクセスを修正**

`src/app/(admin)/events/[id]/checkin/page.tsx` を修正：

変更前:
```typescript
checkins?.data?.map((ci) => (
```

変更後:
```typescript
checkins?.checkins?.map((ci) => (
```

変更前 (空チェック):
```typescript
{(checkins?.data?.length ?? 0) === 0 && (
```

変更後:
```typescript
{(checkins?.checkins?.length ?? 0) === 0 && (
```

**Step 4: チェックインリクエストのフィールド名修正**

`checkin/page.tsx` のフォーム送信部分を修正：

変更前:
```typescript
const result = await performCheckin({
  participant_id: participantId.trim(),
  checkin_method: 'manual',
});
```

変更後:
```typescript
const result = await performCheckin({
  participant_id: participantId.trim(),
  method: 'manual',
});
```

**Step 5: checkins.ts を削除**

```bash
rm src/lib/api/checkins.ts
```

**Step 6: コミット**

```bash
git add src/hooks/use-checkins.ts src/lib/api/checkins.ts src/app/(admin)/events/[id]/checkin/page.tsx
git commit -m "refactor: use-checkins.ts wraps generated hooks; fix checkin request/response field names"
```

---

### Task 11: EventStatsCard の型フィールド名修正

**Files:**
- Modify: `src/components/events/event-stats-card.tsx`

**重要**: `EventStatsResponse` のフィールド名が変わる：
- `checked_in_count` → `checked_in_participants`
- `check_in_rate` → `checkin_rate`
- `pending_count` → なし（計算式 `total_participants - checked_in_participants`）

**Step 1: event-stats-card.tsx を修正**

`src/components/events/event-stats-card.tsx` を以下のように更新：

変更前:
```typescript
import type { EventStats } from '@/types/api';

export function EventStatsCard({ stats }: { stats: EventStats }) {
```

変更後:
```typescript
import type { EventStatsResponse } from '@/lib/generated/model';

export function EventStatsCard({ stats }: { stats: EventStatsResponse }) {
```

`stats.checked_in_count` → `stats.checked_in_participants`
`stats.check_in_rate` → `stats.checkin_rate`
`stats.pending_count` → `(stats.total_participants ?? 0) - (stats.checked_in_participants ?? 0)`

修正後の完全なコード：

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EventStatsResponse } from '@/lib/generated/model';
import { Users, UserCheck, Clock, TrendingUp } from 'lucide-react';

export function EventStatsCard({ stats }: { stats: EventStatsResponse }) {
  const pendingCount =
    (stats.total_participants ?? 0) - (stats.checked_in_participants ?? 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" /> 参加者総数
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.total_participants ?? 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> チェックイン済み
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.checked_in_participants ?? 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" /> 未チェックイン
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{pendingCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> 達成率
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {((stats.checkin_rate ?? 0) * 100).toFixed(1)}%
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**注意**: `checkin_rate` はサーバーが `0.0〜1.0` の小数で返すため `* 100` する。

**Step 2: コミット**

```bash
git add src/components/events/event-stats-card.tsx
git commit -m "refactor: event-stats-card uses generated EventStatsResponse type"
```

---

### Task 12: 残りの @/types/api import を更新

**Files:**
- Modify: `src/contexts/auth-context.tsx`
- Modify: `src/app/(admin)/events/new/page.tsx`
- Modify: `src/app/(admin)/events/[id]/participants/page.tsx`
- Modify: `src/app/(admin)/events/[id]/edit/page.tsx`
- Modify: `src/components/participants/add-participant-dialog.tsx`
- Modify: `src/components/participants/participant-table.tsx`
- Modify: `src/components/events/event-card.tsx`
- Modify: `src/components/events/event-form.tsx`

**Step 1: 残存する @/types/api import を確認**

```bash
grep -r "from '@/types/api'" src --include="*.ts" --include="*.tsx"
```

**Step 2: 各ファイルの import を更新**

各ファイルの `from '@/types/api'` を `from '@/lib/generated/model'` に変更する。

ただし型名が変わっている場合があるので注意：

| 旧型名 | 新型名（生成後） |
|--------|----------------|
| `Event` | `Event`（同じ） |
| `EventStats` | `EventStatsResponse` |
| `Participant` | `Participant`（同じ） |
| `CreateParticipantRequest` | `CreateParticipantRequest`（同じ） |
| `PaginatedResponse<T>` | `EventListResponse` / `ParticipantListResponse` 等 |
| `User` | `User`（同じ） |
| `AuthResponse` | `AuthResponse`（同じ） |
| `CheckIn` | 生成後の型名を確認 |

**Step 3: TypeScript コンパイルエラーを確認**

```bash
npx tsc --noEmit 2>&1 | head -50
```

エラーが出た場合は型名の不一致を修正する。

**Step 4: コミット**

```bash
git add src/
git commit -m "refactor: update all @/types/api imports to generated model types"
```

---

### Task 13: src/types/api.ts を削除

**Files:**
- Delete: `src/types/api.ts`

**Step 1: 参照が残っていないことを最終確認**

```bash
grep -r "from '@/types/api'" src --include="*.ts" --include="*.tsx"
```

Expected: 出力なし（0件）

**Step 2: ファイルを削除**

```bash
rm src/types/api.ts
```

**Step 3: TypeScript コンパイルを確認**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: エラーなし

**Step 4: コミット**

```bash
git add src/types/api.ts
git commit -m "refactor: remove manual api.ts, now using generated types"
```

---

### Task 14: ビルド最終確認

**Step 1: TypeScript 全チェック**

```bash
npx tsc --noEmit
```

Expected: エラーなし

**Step 2: lint チェック**

```bash
npm run lint
```

Expected: エラーなし

**Step 3: next build（オプション・時間があれば）**

```bash
npm run build
```

Expected: ビルド成功

**Step 4: README や docs にコード生成の使い方を追記（任意）**

`server/` の submodule を初期化するには：
```bash
git submodule update --init
npm run generate
```

**Step 5: 最終コミット**

```bash
git add -A
git commit -m "chore: final cleanup after OpenAPI codegen migration"
```
