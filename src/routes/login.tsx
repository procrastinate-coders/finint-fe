import { createFileRoute, redirect } from '@tanstack/react-router'
import type { LoginReason } from '@/features/auth/LoginForm'
import { LoginForm } from '@/features/auth/LoginForm'
import { tokenStore } from '@/lib/auth'

const REASONS: LoginReason[] = ['no-session', 'rejected', 'unreachable']

export const Route = createFileRoute('/login')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirect?: string; reason?: LoginReason } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
    // Why the guard sent you here. Unknown values are dropped rather than shown.
    reason: REASONS.includes(search.reason as LoginReason)
      ? (search.reason as LoginReason)
      : undefined,
  }),
  // ⚠️ NEVER BOUNCE BACK WHEN THE GUARD JUST SENT US HERE. `isAuthenticated()` is
  // true whenever a refresh token exists — and on an unreachable API we
  // deliberately KEEP that token (the session was never rejected). Without this
  // guard the two redirects chase each other forever: _authenticated says
  // "cannot reach the API, go to /login", /login says "you have a token, go to
  // /", round and round, pinning the CPU. A `reason` in the search params means
  // the gate has already decided we cannot get in; believe it.
  beforeLoad: ({ search }) => {
    if (search.reason) return
    // Already authed? Skip the form.
    if (tokenStore.isAuthenticated()) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginRoute,
})

function LoginRoute() {
  const { reason } = Route.useSearch()
  return <LoginForm reason={reason} />
}
