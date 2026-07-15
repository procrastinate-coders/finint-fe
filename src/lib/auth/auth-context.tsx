import {
  createContext,
  use,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { login as loginReq, logout as logoutReq } from '@/lib/api/endpoints'
import { tokenStore } from './session'

interface AuthContextValue {
  isAuthenticated: boolean
  login: (email: string, password: string, remember?: boolean) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  // Re-render this subtree whenever the token state changes (login / refresh /
  // logout). The user IDENTITY is not here — it's the `useMe` query.
  useSyncExternalStore(tokenStore.subscribe, tokenStore.getSnapshot)

  const login = useCallback(
    async (email: string, password: string, remember = true) => {
      await loginReq(email, password, remember)
    },
    [],
  )

  const logout = useCallback(async () => {
    await logoutReq()
    queryClient.clear() // drop the cached /auth/me + any authed reads
  }, [queryClient])

  const value: AuthContextValue = {
    isAuthenticated: tokenStore.isAuthenticated(),
    login,
    logout,
  }

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
