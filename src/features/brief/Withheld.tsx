import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { DASH } from '@/lib/format'
import { cn } from '@/lib/utils'
import { isWithheld } from './sentinel'

/**
 * The held-back STATE for a withheld field — ONE clean amber treatment. A guard
 * caught something and held the field rather than ship it wrong; that work is
 * made visible, never a raw sentinel string in a paragraph.
 */
export function WithheldNote({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[7px] border-[0.5px] border-apex-orange/30 bg-apex-orange-tint px-2 py-1 text-[12px] text-apex-orange',
        className,
      )}
    >
      <ShieldAlert className="size-3.5 shrink-0" aria-hidden />
      Withheld — a guard caught something and held this back.
    </span>
  )
}

/**
 * Render a free-text field: the withheld STATE when a guard held it, `fallback`
 * (default "—", law 5) when null/empty, otherwise the prose. `block` picks `<p>`
 * vs inline `<span>`.
 */
export function Prose({
  value,
  className,
  fallback,
  block = true,
}: {
  value: string | null | undefined
  className?: string
  fallback?: ReactNode
  block?: boolean
}) {
  if (isWithheld(value)) return <WithheldNote />
  if (value == null || value.trim() === '') {
    return <>{fallback ?? <span className="text-apex-fg-tertiary">{DASH}</span>}</>
  }
  return block ? (
    <p className={className}>{value}</p>
  ) : (
    <span className={className}>{value}</span>
  )
}
