import { RotateCw, TriangleAlert, WifiOff } from 'lucide-react'
import { ApiError, NetworkError } from '@/lib/api/client'

/**
 * The last-resort error screen, wired to `__root.tsx` as `errorComponent`.
 *
 * ⚠️ IT EXISTS BECAUSE THE DEFAULT ONE LIED BY OMISSION. Without an
 * `errorComponent`, TanStack Router renders "Something went wrong!" with the real
 * cause folded behind a "Hide Error" toggle. On 2026-09-09 that sentence was the
 * whole of what a dead DNS resolver looked like — on every route, root included.
 * For a system whose entire value is being honest about what it does not know,
 * a generic apology over a hidden fact is the wrong failure mode by a wide
 * margin (law 1, law 4).
 *
 * So: NAME THE FAILURE. The cause is on the screen, not behind a control, and an
 * unreachable API says so in words rather than as a stack trace.
 */
export function RootErrorScreen({
  error,
  reset,
}: {
  error: unknown
  reset?: () => void
}) {
  const unreachable = error instanceof NetworkError
  const api = error instanceof ApiError ? error : null
  // ⚠️ For a NetworkError the headline ALREADY says "cannot reach the API", so the
  // detail line shows the UNDERLYING cause instead — the browser's own words
  // ("Failed to fetch", "NetworkError when attempting to fetch resource"), which
  // are what someone would actually search for. Repeating the headline here
  // would fill the one slot reserved for a fact with a restatement.
  const cause = unreachable ? (error as NetworkError).cause : undefined
  const detail =
    (cause instanceof Error ? cause.message : undefined) ??
    (error instanceof Error ? error.message : String(error ?? 'unknown error'))

  return (
    <div className="flex min-h-svh items-center justify-center bg-apex-canvas p-6">
      <div
        role="alert"
        className="w-full max-w-[520px] rounded-[14px] border-[0.5px] border-apex-border bg-apex-primary p-6"
      >
        <div className="flex items-center gap-2.5">
          {unreachable ? (
            <WifiOff className="size-5 shrink-0 text-apex-yellow" aria-hidden />
          ) : (
            <TriangleAlert className="size-5 shrink-0 text-apex-red" aria-hidden />
          )}
          <h1
            className={
              unreachable
                ? 'text-[17px] font-semibold text-apex-yellow'
                : 'text-[17px] font-semibold text-apex-red'
            }
          >
            {unreachable
              ? 'Cannot reach the API'
              : api
                ? `The API returned ${api.status}`
                : 'This screen failed to render'}
          </h1>
        </div>

        <p className="mt-2.5 max-w-[60ch] text-[13px] leading-[20px] text-apex-fg-secondary">
          {unreachable ? (
            <>
              The request never reached the server — no response came back at all.
              That is a connection or DNS problem on this machine or network, not a
              fault in the brief and not a sign-out. Nothing has been lost; retry
              once the connection is back.
            </>
          ) : (
            <>
              FININT stopped rather than show you a screen it could not stand
              behind. The cause is below, in full — it is not hidden, and it is not
              summarised.
            </>
          )}
        </p>

        {/* ⚠️ ALWAYS VISIBLE. A cause behind a toggle is a cause nobody reads. */}
        <p className="apex-tabular mt-3 max-w-[60ch] break-words rounded-[8px] border-[0.5px] border-apex-border-subtle bg-apex-secondary/40 px-3 py-2 text-[12px] leading-[17px] text-apex-fg-tertiary">
          {detail}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {reset && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-[8px] border-[0.5px] border-apex-border px-3 py-1.5 text-[12.5px] font-medium text-apex-fg-secondary transition-colors hover:bg-white/[0.04] hover:text-apex-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apex-blue"
            >
              <RotateCw className="size-3.5" aria-hidden />
              Try again
            </button>
          )}
          <a
            href="/"
            className="inline-flex items-center rounded-[8px] border-[0.5px] border-apex-border px-3 py-1.5 text-[12.5px] font-medium text-apex-fg-secondary transition-colors hover:bg-white/[0.04] hover:text-apex-fg"
          >
            Reload the morning brief
          </a>
        </div>
      </div>
    </div>
  )
}
