import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/**
 * FININT brand — a MONOCHROME, wordmark-derived lockup (FFE decision, this
 * scaffold): the apex "Delta" pictorial mark is dropped, not reskinned. Colour
 * is reserved for state/signal and MUST NOT encode branding (CLAUDE.md law 8),
 * so the mark carries no accent. A proper pictorial mark, if ever wanted, is a
 * later design decision — it does not block the build.
 */

/** The FININT wordmark — JetBrains Mono 600, +0.16em, no ligatures. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-mono font-semibold uppercase tracking-[0.16em] text-apex-fg',
        className,
      )}
      style={{ fontVariantLigatures: 'none' } as CSSProperties}
    >
      FININT
    </span>
  )
}

/**
 * The "F" monogram tile — the wordmark's initial, monochrome, for tight/compact
 * contexts (a collapsed sidebar, the favicon). Reads `--apex-logo-ink` so one
 * glyph serves light + dark. Not a pictorial logo — a compressed wordmark.
 */
export function BrandMark({
  size = 26,
  className,
  title = 'FININT',
}: {
  size?: number
  className?: string
  title?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
    >
      <rect
        width="48"
        height="48"
        rx="11"
        fill="var(--apex-logo-ink, #ffffff)"
        opacity="0.06"
      />
      <path
        d="M17 13h15M17 13v22M17 24h11"
        stroke="var(--apex-logo-ink, #ffffff)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Mark + wordmark lockup, left-aligned on one baseline. */
export function BrandLockup({
  markSize = 26,
  className,
}: {
  markSize?: number
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <BrandMark size={markSize} />
      <Wordmark className="text-[16px]" />
    </span>
  )
}
