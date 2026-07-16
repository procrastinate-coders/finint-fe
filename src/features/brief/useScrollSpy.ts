import { useEffect, useState } from 'react'

/**
 * Tracks which section is in view (for the sticky jump-nav). Plain
 * IntersectionObserver — the top-most section whose anchor has crossed the
 * offset line wins. Returns the active id.
 */
export function useScrollSpy(ids: string[], offset = 140): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const seen = new Map<string, boolean>()
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting)
        // first id (in DOM order) that's currently intersecting
        const current = ids.find((id) => seen.get(id))
        if (current) setActive(current)
      },
      { rootMargin: `-${offset}px 0px -55% 0px`, threshold: 0 },
    )
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((n): n is HTMLElement => !!n)
    nodes.forEach((n) => obs.observe(n))
    return () => obs.disconnect()
  }, [ids, offset])

  return active
}

/** Smooth-scroll to a section, accounting for the sticky header + nav. */
export function scrollToSection(id: string, offset = 132) {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({
    top,
    behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
  })
}
