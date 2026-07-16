import type { ServedBrief } from '@/lib/api/contracts'
import { istDateTime } from '@/lib/format'
import { BriefNav, type NavSection } from './BriefNav'
import { HonestyBanner } from './HonestyBanner'
import { InstrumentCard, MissingInstrumentCard } from './InstrumentCard'
import { MarketLayer } from './MarketLayer'
import { Reveal } from './Reveal'
import { ScanBoard } from './ScanBoard'

const anchorId = (instrument: string) => `ins-${instrument.toLowerCase()}`

/**
 * THE PRODUCT — the layered morning brief, as a research NOTE: a single reading
 * column, one honesty line up top, a sticky spine to jump between sections, and a
 * calm staggered assembly. Market backdrop → the whole board (all 9) → the deep
 * reads. Dense and numbers-first, density managed by HIERARCHY, never by hiding.
 * One renderer for today and any past date.
 */
export function BriefRenderer({ brief }: { brief: ServedBrief }) {
  const byName = new Map((brief.instruments ?? []).map((i) => [i.instrument, i]))
  const present = new Set(byName.keys())
  const deepSet = brief.meta?.deep_set ?? []
  const extras = (brief.instruments ?? []).filter(
    (i) => !deepSet.includes(i.instrument),
  )
  const orderedNames = [...deepSet, ...extras.map((e) => e.instrument)]

  const sections: NavSection[] = [
    { id: 'market', label: 'Market' },
    { id: 'board', label: 'Board' },
    ...orderedNames.map((n) => ({
      id: anchorId(n),
      label: n,
      withheld: byName.get(n)?.ai_read?.guard_failed ?? false,
    })),
  ]

  return (
    <div className="mx-auto max-w-[1160px] pb-6">
      <Reveal>
        <header className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-apex-fg">
              {brief.label}
            </h1>
            <p className="apex-tabular mt-0.5 text-[12px] text-apex-fg-tertiary">
              Market opens {brief.market_open} · generated{' '}
              {istDateTime(brief.generated_at)}
            </p>
          </div>
          <p className="max-w-[300px] text-[11px] leading-[15px] text-apex-fg-tertiary">
            Reads T-1 and earlier — yesterday’s close pre-open is by design, not
            stale. An MCX futures premium over spot is normal.
          </p>
        </header>
      </Reveal>

      <Reveal delay={40}>
        <div className="mb-4">
          <HonestyBanner brief={brief} />
        </div>
      </Reveal>

      <BriefNav sections={sections} />

      <div className="space-y-9">
        <Reveal delay={80}>
          <MarketLayer market={brief.market} />
        </Reveal>

        <Reveal delay={120}>
          <ScanBoard
            rows={brief.scan ?? []}
            deepRead={present}
            anchorId={anchorId}
          />
        </Reveal>

        <div className="scroll-mt-[140px]">
          <div className="mb-3 flex items-baseline gap-2.5">
            <h2 className="text-[15px] font-semibold tracking-tight text-apex-fg">
              Deep reads
            </h2>
            <span className="text-[12px] text-apex-fg-tertiary">
              the top movers, in words
              {deepSet.length > 0 &&
                ` · ${present.size}/${deepSet.length} written`}
            </span>
          </div>
          <div className="space-y-5">
            {deepSet.map((name, i) => {
              const ins = byName.get(name)
              return (
                <Reveal key={name} delay={160 + i * 40}>
                  {ins ? (
                    <InstrumentCard ins={ins} id={anchorId(name)} />
                  ) : (
                    <MissingInstrumentCard name={name} id={anchorId(name)} />
                  )}
                </Reveal>
              )
            })}
            {extras.map((ins, i) => (
              <Reveal key={ins.instrument} delay={160 + (deepSet.length + i) * 40}>
                <InstrumentCard ins={ins} id={anchorId(ins.instrument)} />
              </Reveal>
            ))}
            {deepSet.length === 0 && extras.length === 0 && (
              <p className="text-[12.5px] text-apex-fg-secondary">
                No instrument reads in this brief — the board above is the full
                picture for this morning.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
