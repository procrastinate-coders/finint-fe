import type { User } from '@/lib/api/contracts'

/**
 * FININT session store — ports apex-admin's proven pattern (FFE-001: FININT owns
 * its own auth, no APEX dependency).
 *   - access token  → in MEMORY only (~15-min TTL); never touches storage.
 *   - refresh token → localStorage `finint.refresh_token` (~30-day, survives reload).
 *   - user          → localStorage `finint.user` (non-sensitive; lets the shell
 *     render Father's name immediately after a reload without a round-trip).
 *
 * A module singleton + subscribe/getSnapshot drives `useSyncExternalStore`, so
 * the route guard (`beforeLoad`) and the auth context read one source of truth.
 *
 * The SINGLE-FLIGHT refresh promise lives in `@/lib/api/client` — this store
 * only holds tokens; it does not fetch.
 */

const REFRESH_KEY = 'finint.refresh_token'
const USER_KEY = 'finint.user'

interface AuthState {
  accessToken: string | null
  expiresAt: string | null
  user: User | null
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

function hydrateUser(): User | null {
  try {
    const raw = readStored(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

let state: AuthState = {
  accessToken: null,
  expiresAt: null,
  user: hydrateUser(),
}

const listeners = new Set<() => void>()
function emit() {
  for (const l of listeners) l()
}

export interface NewSession {
  accessToken: string
  expiresAt: string
  refreshToken: string
  user: User
}

export const tokenStore = {
  getAccessToken: () => state.accessToken,
  getExpiresAt: () => state.expiresAt,
  getUser: () => state.user,
  getRefreshToken: () => readStored(REFRESH_KEY),
  /** Authenticated if we hold an access token OR a refresh token to mint one. */
  isAuthenticated(): boolean {
    return Boolean(state.accessToken) || Boolean(this.getRefreshToken())
  },
  setSession(s: NewSession, remember = true) {
    state = {
      accessToken: s.accessToken,
      expiresAt: s.expiresAt,
      user: s.user,
    }
    try {
      // Keep each value in exactly one storage.
      clearStored(REFRESH_KEY)
      clearStored(USER_KEY)
      const store = remember ? localStorage : sessionStorage
      store.setItem(REFRESH_KEY, s.refreshToken)
      store.setItem(USER_KEY, JSON.stringify(s.user))
    } catch {
      /* storage unavailable — session degrades to memory-only */
    }
    emit()
  },
  setAccessToken(token: string, expiresAt: string) {
    state = { ...state, accessToken: token, expiresAt }
    emit()
  },
  clear() {
    state = { accessToken: null, expiresAt: null, user: null }
    clearStored(REFRESH_KEY)
    clearStored(USER_KEY)
    emit()
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot: (): AuthState => state,
}
