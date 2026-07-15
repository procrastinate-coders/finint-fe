/**
 * FININT session store — ports apex-admin's proven pattern (FFE-001: FININT owns
 * its own auth, no APEX dependency).
 *   - access token  → in MEMORY only (~15-min TTL); never touches storage.
 *   - refresh token → localStorage `finint.refresh_token` (~30-day, survives reload).
 *
 * The USER IDENTITY is NOT stored here. FIN-157's `POST /auth/login` returns
 * ONLY tokens (no user), and the user comes from `GET /auth/me` — so the shell
 * reads identity from a query (`useMe`), which is the single source of truth and
 * rehydrates on every reload.
 *
 * A module singleton + subscribe/getSnapshot drives `useSyncExternalStore`, so
 * the route guard (`beforeLoad`) and the auth context read one source of truth.
 * The SINGLE-FLIGHT refresh promise lives in `@/lib/api/client`.
 */

const REFRESH_KEY = 'finint.refresh_token'

interface AuthState {
  accessToken: string | null
  expiresAt: string | null
}

// "Remember me" picks storage: localStorage (persists across restarts — default)
// or sessionStorage (cleared when the tab closes). Reads prefer localStorage,
// then sessionStorage, so either choice rehydrates.
function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function clearStored(key: string) {
  try {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

let state: AuthState = {
  accessToken: null,
  expiresAt: null,
}

const listeners = new Set<() => void>()
function emit() {
  for (const l of listeners) l()
}

export interface NewSession {
  accessToken: string
  expiresAt: string
  refreshToken: string
}

export const tokenStore = {
  getAccessToken: () => state.accessToken,
  getExpiresAt: () => state.expiresAt,
  getRefreshToken: () => readStored(REFRESH_KEY),
  /** Authenticated if we hold an access token OR a refresh token to mint one. */
  isAuthenticated(): boolean {
    return Boolean(state.accessToken) || Boolean(this.getRefreshToken())
  },
  setSession(s: NewSession, remember = true) {
    state = { accessToken: s.accessToken, expiresAt: s.expiresAt }
    try {
      clearStored(REFRESH_KEY) // keep the refresh token in exactly one storage
      const store = remember ? localStorage : sessionStorage
      store.setItem(REFRESH_KEY, s.refreshToken)
    } catch {
      /* storage unavailable — session degrades to memory-only */
    }
    emit()
  },
  setAccessToken(token: string, expiresAt: string) {
    state = { accessToken: token, expiresAt }
    emit()
  },
  clear() {
    state = { accessToken: null, expiresAt: null }
    clearStored(REFRESH_KEY)
    emit()
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot: (): AuthState => state,
}
