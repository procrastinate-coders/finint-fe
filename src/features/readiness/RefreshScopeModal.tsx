import { useEffect, useRef } from 'react'
import { RotateCw, X } from 'lucide-react'
import { Glass, StatusDot } from '@/design-system'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ReadinessSource } from '@/lib/api/contracts'

/**
 * The refresh SCOPE chooser (FIN-192). The standing "Refresh" CTA is a BARE
 * `POST /refresh` that re-fetches EVERY leg — it spends all the quota-limited
 * APIs (metals.dev · GNews · FRED). That is wasteful when only one dot is stale,
 * so this modal makes the scope an explicit, DATA-DRIVEN choice before anything
 * fetches:
 *  - it reads the readiness `sources` and shows only the ones POST /refresh can
 *    act on (`action === 'refresh'` — NOT kite, which is a login, NOT board /
 *    macro_continuity, which need a backfill),
 *  - it splits them into STALE (`status !== 'green'`) vs fresh, ordering stale
 *    first, and recommends refreshing just the stale set,
 *  - it still offers "Refresh all" for a deliberate full sweep.
 * Nothing fetches until Father picks a scope here.
 */
export function RefreshScopeModal({
  sources,
  onClose,
  onRefreshAll,
  onRefreshSources,
}: {
  sources: ReadinessSource[]
  onClose: () => void
  /** Bare POST /refresh — every leg. */
  onRefreshAll: () => void
  /** Filtered POST /refresh {"sources": keys}. */
  onRefreshSources: (keys: string[]) => void
}) {
  const primaryRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    primaryRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const refreshable = sources.filter((s) => s.action === 'refresh')
  const stale = refreshable.filter((s) => s.status !== 'green')
  const staleKeys = stale.map((s) => s.key)
  // Stale first — that is what actually needs a fetch.
  const ordered = [...stale, ...refreshable.filter((s) => s.status === 'green')]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <Glass
        variant="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="refresh-scope-title"
        className="w-full max-w-[440px] p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="refresh-scope-title"
              className="text-[18px] font-medium text-apex-fg"
            >
              Refresh sources
            </h2>
            <p className="mt-1 text-[13px] leading-[18px] text-apex-fg-secondary">
              <span className="font-medium text-apex-fg">Refresh all</span>{' '}
              re-fetches every source and spends the quota-limited APIs
              (metals.dev · GNews · FRED).{' '}
              {refreshable.length === 0
                ? 'No sources here can be refreshed.'
                : stale.length === 0
                  ? 'Everything below is already fresh — a refresh usually isn’t needed.'
                  : `Only ${stale.length} of ${refreshable.length} ${
                      stale.length === 1 ? 'is' : 'are'
                    } stale — refresh just ${
                      stale.length === 1 ? 'it' : 'those'
                    } to save quota.`}
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

        {ordered.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1">
            {ordered.map((s) => {
              const isStale = s.status !== 'green'
              return (
                <li
                  key={s.key}
                  className={cn(
                    'flex items-center gap-2.5 rounded-[8px] border-[0.5px] px-2.5 py-2',
                    isStale
                      ? 'border-apex-border bg-apex-secondary/50'
                      : 'border-transparent',
                  )}
                >
                  <StatusDot status={s.status} className="size-[7px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-apex-fg">
                      {s.label}
                    </span>
                    {s.note && (
                      <span className="block truncate text-[11px] text-apex-fg-tertiary">
                        {s.note}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[11px] text-apex-fg-tertiary">
                    {stateWord(s)}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant={isStale ? 'outline' : 'ghost'}
                    aria-label={`Refresh ${s.label} only`}
                    onClick={() => onRefreshSources([s.key])}
                  >
                    <RotateCw aria-hidden />
                    Refresh
                  </Button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {stale.length > 0 && (
              <Button
                ref={primaryRef}
                type="button"
                onClick={() => onRefreshSources(staleKeys)}
              >
                <RotateCw aria-hidden />
                Refresh {stale.length} stale
              </Button>
            )}
            <Button
              ref={stale.length === 0 ? primaryRef : undefined}
              type="button"
              variant="outline"
              disabled={refreshable.length === 0}
              onClick={onRefreshAll}
            >
              Refresh all · {refreshable.length}
            </Button>
          </div>
        </div>
      </Glass>
    </div>
  )
}

/** The freshness word behind the dot — plain language, matches the sources rail. */
function stateWord(s: ReadinessSource): string {
  if (s.status === 'green') return 'fresh'
  if (s.status === 'amber') return 'lagging'
  return s.key === 'kite' ? 'expired' : 'stale'
}
