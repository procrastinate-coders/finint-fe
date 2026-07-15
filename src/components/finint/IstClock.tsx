import { useEffect, useState } from 'react'
import { istClock } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * The live IST clock (HH:MM:SS) for the header. Mono + tabular so the digits
 * don't jitter. IST regardless of the viewer's timezone — the MCX board runs on
 * IST. Formatting goes through lib/format (FFE-002), never an inline Intl call.
 */
export function IstClock({ className }: { className?: string }) {
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <span
      className={cn(
        'apex-tabular text-[13px] text-apex-fg-secondary',
        className,
      )}
      aria-label="Current time (IST)"
    >
      {istClock(now)}
      <span className="ml-1 text-[10px] text-apex-fg-tertiary">IST</span>
    </span>
  )
}
