import {
  createContext,
  use,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { login as loginReq, logout as logoutReq } from '@/lib/api/endpoints'
import type { User } from '@/lib/api/contracts'
import { tokenStore } from './session'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string, remember?: boolean) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const snapshot = useSyncExternalStore(
    tokenStore.subscribe,
    tokenStore.getSnapshot,
  )

  const login = useCallback(
    async (email: string, password: string, remember = true) => {
      await loginReq(email, password, remember)
    },
    [],
  )

  const logout = useCallback(async () => {
    await logoutReq()
    queryClient.clear()
  }, [queryClient])

  const value: AuthContextValue = {
    user: snapshot.user,
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
