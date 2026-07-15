import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/AppShell'
import { ensureAccessToken } from '@/lib/api/client'

export const Route = createFileRoute('/_authenticated')({
  // The gate. The access token is memory-only, so on a hard reload there is
  // none — ensureAccessToken() mints one from the refresh token BEFORE the
  // shell renders (rehydrate). No refresh token, or refresh 401s → /login.
  beforeLoad: async ({ location }) => {
    const ok = await ensureAccessToken()
    if (!ok) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
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
