import type { ServedBrief } from '@/lib/api/contracts'
import { Section } from './Section'

type SourceStatus = NonNullable<ServedBrief['sources']>[number]

const DOT: Record<string, string> = {
  green: 'bg-apex-green',
  amber: 'bg-apex-yellow',
  red: 'bg-apex-red',
}

/**
 * The inputs BEHIND the brief — provenance the reader can check (FIN-213). The
 * set went 6 → 13, now derived from `readiness.source_keys()`. Rendered by
 * MAPPING the payload array (law 5 — never a hand-kept second list, which is
 * exactly what let the 6-vs-13 drift hide for months). A source that can't be
 * evaluated from a stored snapshot stays VISIBLE with its note — omission was
 * the bug. Notes render VERBATIM so a weakest-link name (e.g. "· weakest:
 * EIA_NATGAS_STORAGE") survives untouched.
 */
export function BriefSources({ sources }: { sources: SourceStatus[] }) {
  if (sources.length === 0) return null
  return (
    <Section
      id="sources"
      title="Sources"
      subtitle={`${sources.length} inputs behind this brief`}
    >
      <ul className="grid max-w-[820px] gap-x-8 gap-y-2 sm:grid-cols-2">
        {sources.map((s) => (
          <li key={s.key} className="flex items-start gap-2.5">
            <span
              className={`mt-[5px] size-2 shrink-0 rounded-full ${DOT[s.status] ?? 'bg-apex-fg-tertiary'}`}
              aria-hidden
            />
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-apex-fg">
                {humanize(s.key)}
              </div>
              {s.note && (
                <div className="text-[11px] leading-[15px] text-apex-fg-tertiary">
                  {s.note}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/** Underscores → spaces. No key→label MAP on purpose: a hand-kept map is the
 * law-5 anti-pattern that silently drops a newly-added source. The note carries
 * the human explanation regardless. */
function humanize(key: string): string {
  return key.replace(/_/g, ' ')
}
