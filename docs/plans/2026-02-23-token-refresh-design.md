# Token Refresh Design

**Date:** 2026-02-23
**Status:** Approved

## Problem

Page reloads redirect the user to the login screen, even when both `user` and `refresh_token` exist in localStorage. This happens due to a two-stage failure:

1. Refresh token expires during a session → `refreshAccessToken()` fails → `clearTokens()` removes `refresh_token` from localStorage → `user` remains in localStorage
2. Next page reload → `storedUser` exists but `rt` is null → `setUser()` is not called → `isLoading=false, user=null` → AdminLayout redirects to `/login`

Additional issues with the current implementation:
- **No concurrent deduplication**: Multiple simultaneous 401 responses each trigger their own `refreshAccessToken()` call, potentially causing multiple refresh requests
- **No mid-session logout**: When refresh fails during a session, the user appears logged in but all API calls fail silently

## Approach: Full Coverage (C)

### Architecture

Two files are modified:

1. **`src/lib/api/client.ts`** — Core token management
2. **`src/contexts/auth-context.tsx`** — Auth state management

### Changes to `client.ts`

**Concurrent refresh deduplication:**
```typescript
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise; // reuse in-flight promise

  refreshPromise = (async () => {
    try {
      // ... existing refresh logic ...
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
```

**Unauthorized callback:**
```typescript
let onUnauthorizedCallback: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  onUnauthorizedCallback = cb;
}
```

Called inside `refreshAccessToken()` when the refresh endpoint returns an error, before `clearTokens()`.

**Export change:** `refreshAccessToken` becomes a named export so `auth-context.tsx` can call it on initialization.

### Changes to `auth-context.tsx`

**Initialization flow:**
```typescript
useEffect(() => {
  const storedUser = localStorage.getItem('user');
  const rt = getStoredRefreshToken();

  // Register mid-session unauthorized handler
  setOnUnauthorized(() => {
    startTransition(() => {
      setUser(null);
      localStorage.removeItem('user');
    });
  });

  if (storedUser && rt) {
    // Proactive refresh: immediately get a new access token
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

### Data Flow

| Scenario | Result |
|---|---|
| Reload, refresh token valid | Proactive refresh succeeds → user restored |
| Reload, refresh token expired | Proactive refresh fails → immediate redirect to login |
| Mid-session refresh failure | Callback fires → user state cleared → AdminLayout redirects |
| Multiple concurrent 401s | `refreshPromise` deduplication → only one refresh request sent |

### Error Handling

- Refresh endpoint returns error → `clearTokens()` + `onUnauthorizedCallback?.()` + return `null`
- `apiFetch` receives `null` from refresh → throws `UNAUTHORIZED`
- `setOnUnauthorized` callback clears user state and localStorage `user` key
- AdminLayout's `useEffect` detects `!isLoading && !user` → pushes to `/login`

### Loading UX

During initialization with stored tokens, the app shows the existing loading spinner (`読み込み中...`) until the proactive refresh API call completes (~100–300ms). This is the same behavior as today.

## Files Changed

- `src/lib/api/client.ts`
- `src/contexts/auth-context.tsx`
