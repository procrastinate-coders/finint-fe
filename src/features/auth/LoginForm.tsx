import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Eye, EyeOff, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Glass, BrandMark, Wordmark } from '@/design-system'
import { ApiError } from '@/lib/api/client'
import { useAuth } from '@/lib/auth'

/** Why the guard sent you to this screen. Three different facts (see checkAccess). */
export type LoginReason = 'no-session' | 'rejected' | 'unreachable'

/**
 * ⚠️ `reason` arrives as a PROP, not via useSearch(). The route owns the search
 * params and passes them down, so this form still renders standalone — which is
 * how it is tested, and which keeps a presentation component from depending on
 * where in the router it happens to sit.
 */
export function LoginForm({ reason }: { reason?: LoginReason } = {}) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password, remember)
      await navigate({ to: '/' })
    } catch (err) {
      if (err instanceof ApiError) {
        // 401 is INTENTIONALLY generic — the backend returns the same body for a
        // wrong password AND an unknown email (no enumeration), and the UI must
        // not leak which. 429 is the rate limiter (5 failed logins / 5 min).
        setError(
          err.status === 429
            ? 'Too many attempts. Please wait a minute and try again.'
            : 'Invalid email or password.',
        )
      } else {
        setError('Could not reach the server.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-apex-canvas p-6">
      <div className="apex-aura" aria-hidden>
        <span className="a-blue" />
        <span className="a-green" />
        <span className="a-red" />
        <span className="a-indigo" />
      </div>

      <Glass variant="modal" className="relative z-10 w-full max-w-[380px] p-8">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-3">
            <BrandMark size={30} />
            <Wordmark className="text-[22px]" />
          </span>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-apex-fg-tertiary">
            Pre-market intelligence
          </p>
        </div>

        {/* ⚠️ THE OUTAGE BANNER. An unreachable API is NOT a sign-out, and this
            screen must not imply one — "your session expired" is a lie the
            reader acts on by re-entering a password that was never wrong,
            against a server that cannot hear them. The refresh token is
            deliberately still on the device (see doRefresh), so the honest thing
            to say is that they are still signed in and the network is not. */}
        {reason === 'unreachable' && (
          <div
            role="status"
            className="mb-5 flex items-start gap-2.5 rounded-[10px] border-[0.5px] border-apex-yellow/40 bg-apex-yellow-tint px-3.5 py-3"
          >
            <WifiOff className="mt-px size-4 shrink-0 text-apex-yellow" aria-hidden />
            <p className="text-[12.5px] leading-[18px] text-apex-fg-secondary">
              <span className="font-medium text-apex-fg">Cannot reach the API.</span>{' '}
              You are still signed in — this is a connection problem, not a session
              that ended. The brief is unaffected. Retry when the connection is
              back; signing in again is not required, and will not work until it is.
            </p>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center rounded-r-[8px] px-3 text-apex-fg-tertiary transition-colors hover:text-apex-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-apex-blue"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </button>
            </div>
          </div>

          <label className="flex w-fit cursor-pointer select-none items-center gap-2 text-[13px] text-apex-fg-secondary">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4 cursor-pointer rounded-[4px] border-apex-border accent-apex-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apex-blue focus-visible:ring-offset-2 focus-visible:ring-offset-apex-bg"
            />
            Remember me on this device
          </label>

          {error && (
            <p className="text-[13px] text-apex-red" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Glass>
    </div>
  )
}
