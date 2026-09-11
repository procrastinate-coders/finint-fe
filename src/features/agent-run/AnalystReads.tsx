import { cn } from '@/lib/utils'
import { Spine } from './Spine'
import { unclaimedFields, type AnalystInstrument, type AnalystSpec } from './report-shape'

/** What one analyst had to say about one instrument — or why it said nothing. */
export type AnalystSlot =
  | { kind: 'read'; ins: AnalystInstrument }
  | { kind: 'rejected' }
  | { kind: 'absent' }
  | { kind: 'unreadable' }
  | { kind: 'uncovered' }

const FIELD_LABEL: Record<string, string> = {
  oi_read: 'OI',
  cot_read: 'COT',
  divergence: 'Divergence',
  level_read: 'Levels',
  volatility_read: 'Volatility',
  term_structure: 'Term structure',
  degraded: 'Could not size',
  reference_read: 'Reference',
  implied_open_read: 'Implied open',
  premium_read: 'Premium',
  news_read: 'Overnight',
}

/**
 * THE FOUR READS, STACKED — never tabbed, never collapsed.
 *
 * ⚠️ THIS IS THE POINT OF THE PAGE AND IT IS DELIBERATE. The value of a second
 * pipeline is where its four readers DISAGREE about the same instrument, and a
 * disagreement nobody can see is a disagreement nobody can use. Tabs would hide
 * exactly that — three of the four reads would be one click away and nobody
 * would ever compare them.
 *
 * The verdict band is the way in; it is not a substitute for this. Nothing here
 * is summarised, truncated or hidden.
 */
export function AnalystReads({
  instrument,
  specs,
  slots,
}: {
  instrument: string
  specs: AnalystSpec[]
  slots: Map<string, AnalystSlot>
}) {
  return (
    <div className="flex flex-col gap-4">
      {specs.map((spec) => (
        <Read
          key={spec.agent}
          spec={spec}
          slot={slots.get(spec.agent) ?? { kind: 'absent' }}
          instrument={instrument}
        />
      ))}
    </div>
  )
}

function Read({
  spec,
  slot,
  instrument,
}: {
  spec: AnalystSpec
  slot: AnalystSlot
  instrument: string
}) {
  const label = (
    <span className={cn('block font-medium', slot.kind !== 'read' ? 'text-apex-red' : 'text-apex-fg')}>
      {spec.label}
    </span>
  )

  if (slot.kind !== 'read') {
    return (
      <Spine
        label={
          <>
            {label}
            <span className="mt-[3px] hidden text-[11px] font-normal normal-case tracking-normal text-apex-fg-tertiary md:block">
              {spec.remit}
            </span>
          </>
        }
      >
        <p className="text-[11px] leading-[1.5] text-apex-red">
          {slot.kind === 'rejected' &&
            'no read — this analyst’s report was rejected by the provenance guard'}
          {slot.kind === 'absent' &&
            'no read — this analyst did not land a report for this run'}
          {slot.kind === 'unreadable' &&
            'no read — this analyst’s report is in a shape this view cannot render'}
          {slot.kind === 'uncovered' &&
            `no read — this analyst landed, but did not cover ${instrument}`}
        </p>
      </Spine>
    )
  }

  const ins = slot.ins
  const bag = ins as Record<string, unknown>
  const fields = spec.fields.length > 0 ? spec.fields : unclaimedFields(ins)
  const written = fields.filter((f) => typeof bag[f.key] === 'string' && bag[f.key])
  const refused = ins.refused ?? []

  return (
    <Spine
      label={
        <>
          {label}
          <span className="mt-[3px] hidden text-[11px] font-normal normal-case tracking-normal text-apex-fg-tertiary md:block">
            {spec.remit}
          </span>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        {written.length === 0 && refused.length === 0 && (
          <p className="text-[11px] text-apex-fg-tertiary">
            This analyst covered {instrument} but wrote nothing to any of its fields.
          </p>
        )}
        {written.map((f) =>
          f.emphasis ? (
            // the tension fields get the weighted treatment — they are the read
            <p
              key={f.key}
              className="max-w-[74ch] rounded-r-[8px] border-l-2 border-apex-yellow bg-apex-yellow-tint px-3 py-2 text-[13px] leading-[1.6] text-apex-fg-secondary"
            >
              <span className="mr-2 text-[11px] uppercase tracking-[0.07em] text-apex-yellow">
                {FIELD_LABEL[f.key] ?? f.label}
              </span>
              {bag[f.key] as string}
            </p>
          ) : (
            <p
              key={f.key}
              className="m-0 max-w-[74ch] text-[13px] leading-[1.6] text-apex-fg-secondary"
            >
              <span className="mr-2 text-[11px] uppercase tracking-[0.07em] text-apex-fg-tertiary">
                {FIELD_LABEL[f.key] ?? f.label}
              </span>
              {bag[f.key] as string}
            </p>
          ),
        )}
        {/* ⚠️ NOT an error list — the agent declining to speak to a field it
            could not ground. Shown as the honesty it is. */}
        {refused.length > 0 && (
          <p className="text-[11px] leading-[1.5] text-apex-fg-tertiary">
            Declined{' '}
            <span className="apex-tabular text-apex-fg-secondary">
              {refused.join(' · ')}
            </span>{' '}
            — the agent would not speak to these; that is the system being honest,
            not a failure.
          </p>
        )}
      </div>
    </Spine>
  )
}
