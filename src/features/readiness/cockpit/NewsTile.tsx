import { useState } from 'react'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import type { NewsArticleEvidence, NewsEvidence } from '@/lib/api/contracts'
import { DASH, formatNumber, istDateTime, istTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Tile } from './Tile'

/**
 * The NEWS tile (Bento Cockpit). Fresh (the signal) is always shown, prominent.
 * Stale (the EVIDENCE for the pending filter) is one click away — not hidden,
 * revealed in place, as a tight age+headline list. The "before the window" reason
 * is stated ONCE (the header, from the live window), never 14 times. The AGE is
 * the datum Naveen audits.
 */

function age(hours: number | null | undefined): string {
  if (hours == null) return DASH
  return hours < 100
    ? `${formatNumber(hours, { decimals: 1 })}h`
    : `${formatNumber(hours / 24, { decimals: 1 })}d`
}

export function NewsTile({
  news,
  lit,
  delayMs,
}: {
  news: NewsEvidence
  lit: boolean
  delayMs?: number
}) {
  const [open, setOpen] = useState(false)
  const fresh = news.articles.filter((a) => a.status === 'fresh')
  const stale = news.articles.filter((a) => a.status !== 'fresh')
  const opened = news.window?.threshold ? istDateTime(news.window.threshold) : null
  const fetched = news.fetched_at ? istTime(news.fetched_at) : null

  return (
    <Tile
      title="News"
      meta={
        <span>
          <span className="text-apex-green">{news.fresh_count ?? 0} fresh</span>{' '}
          · {news.count} read
        </span>
      }
      lit={lit}
      litLabel="GNews"
      delayMs={delayMs}
      bodyClassName="flex flex-col"
    >
      <p
        title={news.window?.rule ?? undefined}
        className="px-4 pb-2 text-[11px] leading-[14px] text-apex-fg-tertiary"
      >
        Fresh = published after the overnight window
        {opened && opened !== DASH ? ` opened ${opened}` : ''}.
        {fetched && fetched !== DASH && (
          <span className="text-apex-fg-tertiary/70"> · fetched {fetched}</span>
        )}
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        <ul>
          {fresh.length === 0 ? (
            <li className="px-2 py-3 text-[12px] text-apex-fg-secondary">
              Nothing inside the window — positioning-only.
            </li>
          ) : (
            fresh.map((a, i) => <Row key={i} a={a} fresh />)
          )}
        </ul>

        {stale.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-1 flex w-full items-center gap-2 rounded-[8px] px-2 py-2 text-left text-[11px] uppercase tracking-[0.04em] text-apex-fg-tertiary transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apex-blue"
            >
              <ChevronDown
                className={cn(
                  'size-3.5 transition-transform',
                  open && 'rotate-180',
                )}
                aria-hidden
              />
              {stale.length} earlier · outside the window
            </button>
            {open && (
              <ul className="animate-in pb-1 fade-in slide-in-from-top-1 duration-300">
                {stale.map((a, i) => (
                  <Row key={i} a={a} fresh={false} />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Tile>
  )
}

function Row({ a, fresh }: { a: NewsArticleEvidence; fresh: boolean }) {
  return (
    <li>
      <a
        href={a.url ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="group grid grid-cols-[42px_minmax(0,1fr)_14px] items-baseline gap-2.5 rounded-[8px] px-2 py-2 transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apex-blue"
      >
        <span
          className={cn(
            'apex-tabular text-right text-[11.5px]',
            fresh ? 'text-apex-green' : 'text-apex-fg-tertiary',
          )}
        >
          {age(a.age_hours)}
        </span>
        <span className="min-w-0">
          <span
            className={cn(
              'line-clamp-2 text-[12.5px] leading-[16px]',
              fresh ? 'text-apex-fg' : 'text-apex-fg-secondary',
            )}
          >
            {a.headline ?? DASH}
          </span>
          <span className="text-[10.5px] text-apex-fg-tertiary">
            {a.source_name ?? ''}
          </span>
        </span>
        {fresh && (
          <ArrowUpRight
            className="size-3.5 translate-y-0.5 text-apex-fg-tertiary transition-colors group-hover:text-apex-blue"
            aria-hidden
          />
        )}
      </a>
    </li>
  )
}
