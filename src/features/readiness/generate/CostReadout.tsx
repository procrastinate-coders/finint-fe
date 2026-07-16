import type { CostReport } from '@/lib/api/contracts'
import { formatNumber, formatUsd } from '@/lib/format'

/**
 * The real cost of a run, shown on EVERY terminal state — especially error. A
 * failed run still SPENT money (FIN-164: a run once reported cost:null while
 * spending $0.115); a screen that shows no cost is a lie. The number is verbatim
 * from the API's `cost` object, never rounded to look cheaper.
 */
export function CostReadout({ cost }: { cost: CostReport | null | undefined }) {
  if (!cost) return null
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-[10px] border-[0.5px] border-apex-border bg-apex-secondary/40 px-3 py-2.5">
      <span className="text-[12px] text-apex-fg-secondary">
        Spent on this run
      </span>
      <span className="flex items-baseline gap-2">
        <span className="apex-tabular text-[15px] font-semibold text-apex-fg">
          {formatUsd(cost.cost_usd)}
        </span>
        <span className="apex-tabular text-[11px] text-apex-fg-tertiary">
          {formatNumber(cost.total_tokens)} tok
          {cost.retries > 0 && ` · ${cost.retries} retries`}
        </span>
      </span>
    </div>
  )
}
