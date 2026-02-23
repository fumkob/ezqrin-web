# Token Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix page-reload redirect-to-login bug and ensure token refresh is robust across all scenarios.

**Architecture:** Modify `client.ts` to export `refreshAccessToken`, add concurrent deduplication via a shared promise, and add an `onUnauthorized` callback mechanism. Modify `auth-context.tsx` to proactively call the refresh endpoint on app initialization and register the callback to auto-logout when mid-session refresh fails.

**Tech Stack:** Next.js 16 (App Router), TypeScript, React 19, fetch API, localStorage

---

### Task 1: Add refresh deduplication and unauthorized callback to `client.ts`

**Files:**
- Modify: `src/lib/api/client.ts`

**Current state of the file (read before editing):**
```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

let accessToken: string | null = null;
let refreshToken: string | null = null;

// ... setTokens, clearTokens, getStoredRefreshToken ...

async function refreshAccessToken(): Promise<string | null> {
  const rt = refreshToken ?? getStoredRefreshToken();
  if (!rt) return null;
  // ... fetch /auth/refresh ...
  if (!res.ok) {
    clearTokens();
    return null;
  }
  // ...
}

export async function apiFetch<T>(...) {
  // ...
  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(path, options, false);
    }
    throw new Error('UNAUTHORIZED');
  }
  // ...
}
```

**Step 1: Add module-level variables for deduplication and callback**

Add these two variables right after the existing `let refreshToken` line:

```typescript
let refreshPromise: Promise<string | null> | null = null;
let onUnauthorizedCallback: (() => void) | null = null;
```

**Step 2: Add `setOnUnauthorized` export**

Add this function after `getStoredRefreshToken`:

```typescript
export function setOnUnauthorized(cb: () => void) {
  onUnauthorizedCallback = cb;
}
```

**Step 3: Replace `async function refreshAccessToken` with exported version**

Replace the existing `async function refreshAccessToken()` with:

```typescript
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const rt = refreshToken ?? getStoredRefreshToken();
      if (!rt) return null;

      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      });

      if (!res.ok) {
        clearTokens();
        onUnauthorizedCallback?.();
        return null;
      }

      const data = await res.json();
      setTokens(data.access_token, data.refresh_token);
      return data.access_token;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
```

**Step 4: Verify lint passes**

Run: `npm run lint`
Expected: No new errors related to `client.ts`

**Step 5: Commit**

```bash
git add src/lib/api/client.ts
git commit -m "♻️ Export refreshAccessToken with dedup promise and onUnauthorized callback"
```

---

### Task 2: Update `auth-context.tsx` initialization

**Files:**
- Modify: `src/contexts/auth-context.tsx`

**Current state of the initialization `useEffect`:**
```typescript
useEffect(() => {
  const storedUser = localStorage.getItem('user');
  const rt = getStoredRefreshToken();
  startTransition(() => {
    if (storedUser && rt) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  });
}, []);
```

**Current imports from `@/lib/api/client`:**
```typescript
import { getStoredRefreshToken } from '@/lib/api/client';
```

**Step 1: Update import in `auth-context.tsx`**

Replace the existing import line:
```typescript
import { getStoredRefreshToken } from '@/lib/api/client';
```

With:
```typescript
import { getStoredRefreshToken, refreshAccessToken, setOnUnauthorized } from '@/lib/api/client';
```

**Step 2: Replace the initialization `useEffect`**

Replace the entire `useEffect` block (the one with `[]` deps) with:

```typescript
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
```

**Step 3: Verify lint passes**

Run: `npm run lint`
Expected: No errors

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Manual smoke test**

1. Start dev server: `npm run dev`
2. Log in to the app
3. Open DevTools → Application → Local Storage → verify `refresh_token` and `user` keys exist
4. Hard-reload the page (Cmd+Shift+R)
5. **Expected**: Loading spinner appears briefly, then admin UI is shown (no redirect to login)
6. Open DevTools Console → no errors
7. Manually delete `refresh_token` from Local Storage in DevTools
8. Hard-reload the page
9. **Expected**: Redirected to login page immediately

**Step 6: Commit**

```bash
git add src/contexts/auth-context.tsx
git commit -m "🐛 Fix page-reload redirect by proactively refreshing token on init"
```

---

## Verification Checklist

- [ ] `npm run lint` passes with no new errors
- [ ] `npx tsc --noEmit` passes
- [ ] Login → reload → stay logged in (refresh token valid)
- [ ] Login → delete `refresh_token` from localStorage → reload → redirected to login
- [ ] Login → delete `refresh_token` from localStorage → make API call → callback fires → user logged out
