import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/lib/auth'
import { tokenStore } from '@/lib/auth/session'
import { LoginForm } from './LoginForm'

// LoginForm only reaches for useNavigate — stub it so we don't need a router.
const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }))
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<typeof import('@tanstack/react-router')>()),
  useNavigate: () => navigateSpy,
}))

function renderLogin() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  tokenStore.clear()
  navigateSpy.mockClear()
})

describe('LoginForm — auth against MSW', () => {
  it('logs in with valid credentials and navigates to the brief', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'naveen@apextrader.trade')
    await user.type(screen.getByLabelText('Password'), 'correct-secret')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(tokenStore.isAuthenticated()).toBe(true))
    expect(navigateSpy).toHaveBeenCalledWith({ to: '/' })
    expect(tokenStore.getUser()?.email).toBe('naveen@apextrader.trade')
  })

  it('shows ONE generic message on failure (never leaks email-vs-password)', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'naveen@apextrader.trade')
    // The MSW sentinel that forces a 401.
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Invalid email or password.')
    expect(tokenStore.isAuthenticated()).toBe(false)
    expect(navigateSpy).not.toHaveBeenCalled()
  })
})
