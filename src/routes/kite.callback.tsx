import { createFileRoute, Link } from '@tanstack/react-router'
import { Glass } from '@/design-system'

/**
 * PLACEHOLDER (FIN-149 Phase 2 wires the real exchange). Kite redirects the
 * browser here after login with `?request_token=…`; the eventual flow is
 * POST /kite/refresh { request_token }. This route MUST exist as a real deep
 * link — the `vercel.json` SPA rewrite makes /kite/callback resolve to the SPA
 * instead of a 404 (FFE-005). Public-ish so it loads regardless of auth state.
 *
 * NOTE: flipping the Kite console redirect to this URL is the LAST, one-way step
 * of the cutover — until then the CLI escape hatch owns the redirect.
 */
export const Route = createFileRoute('/kite/callback')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { request_token?: string; status?: string } => ({
    request_token:
      typeof search.request_token === 'string'
        ? search.request_token
        : undefined,
    status: typeof search.status === 'string' ? search.status : undefined,
  }),
  component: KiteCallback,
})

function KiteCallback() {
  const { request_token } = Route.useSearch()

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-apex-canvas p-6">
      <div className="apex-aura" aria-hidden>
        <span className="a-blue" />
        <span className="a-indigo" />
      </div>
      <Glass variant="modal" className="relative z-10 w-full max-w-[420px] p-8">
        <h1 className="text-[16px] font-medium text-apex-fg">Kite callback</h1>
        <p className="mt-2 text-[13px] text-apex-fg-secondary">
          {request_token
            ? 'A Kite request token was received. Exchanging it for the daily token lands with FIN-149 Phase 2.'
            : 'No request token in the URL. This route handles the Kite login redirect.'}
        </p>
        {request_token && (
          <p className="apex-tabular mt-3 truncate rounded-[8px] border-[0.5px] border-apex-border bg-apex-secondary px-3 py-2 text-[12px] text-apex-fg-tertiary">
            {request_token}
          </p>
        )}
        <Link
          to="/"
          className="mt-5 inline-flex h-8 items-center rounded-[8px] bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Back to the brief
        </Link>
      </Glass>
    </div>
  )
}
