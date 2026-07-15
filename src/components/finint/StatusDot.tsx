import { cn } from '@/lib/utils'

// Status → one of the SIX locked colours (CLAUDE.md law 8). Readiness statuses
// are green/amber/red; amber maps to yellow (the caution colour). An UNKNOWN
// status (the registry may add one) renders a neutral dot, never a crash and
// never a fabricated verdict.
const STATUS_COLOR: Record<string, string> = {
  green: 'bg-apex-green',
  amber: 'bg-apex-yellow',
  red: 'bg-apex-red',
}

/**
 * A flat, signal-pure status dot (never glass). Colour encodes STATE only. A red
 * source pulses to pull the eye — the one place motion is a signal here.
 */
export function StatusDot({
  status,
  pulse = false,
  className,
}: {
  status: string
  pulse?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        STATUS_COLOR[status] ?? 'bg-apex-fg-tertiary',
        pulse && 'animate-apex-pulse',
        className,
      )}
      aria-hidden
    />
  )
}
