import { FileText, ShieldAlert } from 'lucide-react'
import type { ServedBrief } from '@/lib/api/contracts'
import { summarizeDegradation, isPositioningOnly } from '@/lib/brief/honesty'

/**
 * The honesty metrics — FIRST-CLASS (law 2/4), but SLIM. A brief can SUCCEED and
 * be DEGRADED; both are stated, up top, in one calm line — not a wall. Hiding a
 * degraded brief to look polished is the one unforgivable UI decision here.
 */
export function HonestyBanner({ brief }: { brief: ServedBrief }) {
  const d = summarizeDegradation(brief)
  const positioningOnly = isPositioningOnly(brief)
  if (!d.degraded && !positioningOnly) return null

  return (
    <div className="space-y-2">
      {d.degraded && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[10px] border-[0.5px] border-apex-orange/30 bg-apex-orange-tint px-3.5 py-2.5"
        >
          <ShieldAlert
            className="mt-px size-4 shrink-0 text-apex-orange"
            aria-hidden
          />
          <p className="text-[12.5px] leading-[18px] text-apex-fg-secondary">
            <span className="font-semibold text-apex-orange">
              Degraded brief
            </span>{' '}
            — a substance guard fired.
            {d.fabricatedClaims > 0 &&
              ` ${d.fabricatedClaims} text fields caught and withheld (degradation count).`}
            {d.withheldInstruments.length > 0 && (
              <>
                {' '}
                Reads held for{' '}
                <span className="font-medium text-apex-fg">
                  {d.withheldInstruments.join(', ')}
                </span>
                .
              </>
            )}
          </p>
        </div>
      )}

      {positioningOnly && (
        <div className="flex items-start gap-2.5 rounded-[10px] border-[0.5px] border-apex-border bg-apex-secondary/50 px-3.5 py-2.5">
          <FileText
            className="mt-px size-4 shrink-0 text-apex-fg-tertiary"
            aria-hidden
          />
          <p className="text-[12.5px] leading-[18px] text-apex-fg-secondary">
            <span className="font-medium text-apex-fg">
              Positioning-only read
            </span>{' '}
            — no material catalysts crossed the overnight window, so the morning
            is led by positioning, not headlines. A common, honest outcome.
          </p>
        </div>
      )}
    </div>
  )
}
