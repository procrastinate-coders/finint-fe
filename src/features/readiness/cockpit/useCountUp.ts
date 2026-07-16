import { useEffect, useRef, useState } from 'react'

/**
 * A subtle count-up for a hero stat — the "coming online" flourish, restrained
 * (one ease-out, ~600ms). Honours prefers-reduced-motion (returns the target
 * verbatim, no animation). Never used on prices Naveen verifies — those must
 * render stable and exact.
 */
export function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(0)
  const raf = useRef<number | null>(null)
  // Snap (no animation) when we can't safely animate: no window (SSR), no
  // matchMedia (jsdom/tests), or the user asked for reduced motion.
  const reduced =
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (reduced) return
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(target * eased)
      if (t < 1) raf.current = requestAnimationFrame(tick)
      else setValue(target)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [target, durationMs, reduced])

  return reduced ? target : value
}
