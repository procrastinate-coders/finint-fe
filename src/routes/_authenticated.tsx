import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/AppShell'
import { checkAccess } from '@/lib/api/client'

export const Route = createFileRoute('/_authenticated')({
  // The gate. The access token is memory-only, so on a hard reload there is
  // none — ensureAccessToken() mints one from the refresh token BEFORE the
  // shell renders (rehydrate). No refresh token, or refresh 401s → /login.
  // ⚠️ THE REASON TRAVELS WITH THE REDIRECT. "Cannot reach the API" and "your
  // session ended" are different facts, and the login screen has to be able to
  // tell them apart — otherwise an outage reads as a sign-out and Father retypes
  // a password that was never wrong.
  beforeLoad: async ({ location }) => {
    const access = await checkAccess()
    if (!access.ok) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href, reason: access.reason },
      })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
