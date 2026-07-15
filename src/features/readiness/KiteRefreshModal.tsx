import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, ExternalLink, Loader2, TriangleAlert, X } from 'lucide-react'
import { Glass } from '@/design-system'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api/client'
import { useKiteLoginUrl, useKiteRefresh } from '@/lib/query/hooks'
import { extractRequestToken } from './request-token'

/**
 * The daily Kite token refresh. Zerodha MANDATES a manual login once per day —
 * full automation is prohibited, so this is normal, not an error state. Father
 * does it every morning before his brief.
 *
 * The honest part: Kite redirects to http://localhost:8080?request_token=… — a
 * page that WON'T LOAD today (connection refused). The modal says so up front,
 * so a trader who hits a dead page doesn't assume the whole system is broken.
 * The token is still in the address bar; he copies it here.
 */
export function KiteRefreshModal({
  onClose,
  onComplete,
}: {
  onClose: () => void
  onComplete: () => void
}) {
  const [raw, setRaw] = useState('')
  const loginUrl = useKiteLoginUrl(true)
  const refresh = useKiteRefresh()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const token = extractRequestToken(raw)
  const succeeded = refresh.isSuccess && refresh.data.ok === true

  // The honest failure line — the exchange failed (data.ok === false, e.g. a
  // stale/used token) OR the request itself errored. Never a blank, never a
  // generic toast: name what happened.
  const failure = refresh.isError
    ? refresh.error instanceof ApiError
      ? refresh.error.message
      : 'Could not reach the server.'
    : refresh.isSuccess && !refresh.data.ok
      ? (refresh.data.reason ?? 'Token exchange failed — try the login again.')
      : null

  function openKiteLogin() {
    if (loginUrl.data?.url) {
      window.open(loginUrl.data.url, '_blank', 'noopener,noreferrer')
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (token.length < 4) return
    refresh.mutate(token)
  }

  return (
    // Scrim is a non-interactive backdrop; close via X / Cancel / Escape.
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <Glass
        variant="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kite-modal-title"
        className="w-full max-w-[460px] p-6"
      >
        {succeeded ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-apex-green-tint text-apex-green">
                <Check className="size-5" aria-hidden />
              </span>
              <div>
                <div
                  id="kite-modal-title"
                  className="text-[16px] font-medium text-apex-fg"
                >
                  Kite token refreshed
                </div>
                {/* The backend hands back the refreshed kite source dot — show its
                    honest note (e.g. "Fresh · ~12h left"). */}
                <div className="text-[13px] text-apex-fg-secondary">
                  {refresh.data.source?.note ??
                    'Price & open-interest are live.'}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={onComplete}>Back to readiness</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="kite-modal-title"
                  className="text-[18px] font-medium text-apex-fg"
                >
                  Refresh Kite token
                </h2>
                <p className="mt-1 text-[13px] leading-[18px] text-apex-fg-secondary">
                  Zerodha requires a manual login once per day — this is normal.
                  Two quick steps.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 -mt-1 shrink-0 rounded-[8px] p-1 text-apex-fg-tertiary transition-colors hover:text-apex-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apex-blue"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            {/* Step 1 */}
            <div className="flex gap-3">
              <StepNum n={1} />
              <div className="flex-1 space-y-2">
                <div className="text-[14px] font-medium text-apex-fg">
                  Open the Kite login
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={openKiteLogin}
                  disabled={loginUrl.isPending || Boolean(loginUrl.error)}
                >
                  {loginUrl.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <ExternalLink className="size-3.5" aria-hidden />
                  )}
                  Open Kite login
                </Button>
                {loginUrl.error && (
                  <p className="text-[12px] text-apex-red" role="alert">
                    Could not load the Kite login URL. Retry, or refresh the
                    page.
                  </p>
                )}
              </div>
            </div>

            {/* The honest broken-redirect warning */}
            <div className="flex gap-2.5 rounded-[8px] border-[0.5px] border-apex-yellow/40 bg-apex-yellow-tint px-3 py-2.5">
              <TriangleAlert
                className="mt-0.5 size-4 shrink-0 text-apex-yellow"
                aria-hidden
              />
              <p className="text-[12px] leading-[17px] text-apex-fg-secondary">
                After you sign in, Kite redirects to a page that{' '}
                <span className="font-medium text-apex-fg">
                  won&apos;t load
                </span>{' '}
                (<span className="apex-tabular">localhost:8080</span>) — that is
                expected, not a failure. The token is in the address bar. Copy
                the{' '}
                <span className="apex-tabular text-apex-yellow">
                  request_token
                </span>{' '}
                value and paste it below.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3">
              <StepNum n={2} />
              <div className="flex-1 space-y-2">
                <Label
                  htmlFor="kite-token"
                  className="text-[14px] font-medium text-apex-fg"
                >
                  Paste the request_token (or the whole redirect URL)
                </Label>
                <Input
                  id="kite-token"
                  ref={inputRef}
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder="request_token=…"
                  className="apex-tabular"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>

            {failure && (
              <p className="text-[13px] text-apex-red" role="alert">
                {failure}
              </p>
            )}

            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={token.length < 4 || refresh.isPending}
              >
                {refresh.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Refreshing…
                  </>
                ) : (
                  'Complete refresh'
                )}
              </Button>
            </div>
          </form>
        )}
      </Glass>
    </div>
  )
}

function StepNum({ n }: { n: number }) {
  return (
    <span className="apex-tabular inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-apex-tertiary text-[11px] font-semibold text-apex-fg-secondary">
      {n}
    </span>
  )
}
