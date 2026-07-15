import { createFileRoute, redirect } from '@tanstack/react-router'
import { LoginForm } from '@/features/auth/LoginForm'
import { tokenStore } from '@/lib/auth'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: () => {
    // Already authed? Skip the form.
    if (tokenStore.isAuthenticated()) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginForm,
})
