import type { RefreshSpineResponse } from '@/lib/api/contracts'

/**
 * A partial refresh is a 200 with `ok: false` INSIDE the report — NOT an error
 * path. This turns the raw report into honest per-source lines so the UI can say
 * "news refreshed · macro failed: comex fetch timed out" and NAME the failed
 * source, never flatten it into a generic "refresh failed" toast. The report is
 * the product's honesty in miniature.
 */
export interface RefreshLine {
  key: 'macro' | 'cot' | 'news' | 'lme' | 'token'
  label: string
  ok: boolean
  detail: string
}

export interface RefreshSummary {
  status: string
  /** already_running → bound the wait with startedAt, then re-read; don't poll. */
  alreadyRunning: boolean
  startedAt: string | null
  /** a data source (macro/cot/news) came back ok:false — a partial refresh. */
  anyFailed: boolean
  /** the Kite token is invalid (a STATUS, not a refresh failure → the modal). */
  tokenInvalid: boolean
  lines: RefreshLine[]
}

export function summarizeRefresh(res: RefreshSpineResponse): RefreshSummary {
  const alreadyRunning = res.status === 'already_running'
  const report = res.report ?? null

  if (!report) {
    return {
      status: res.status,
      alreadyRunning,
      startedAt: res.started_at ?? null,
      anyFailed: false,
      tokenInvalid: false,
      lines: [],
    }
  }

  const { macro, cot, news, lme, token } = report

  const macroLine: RefreshLine = {
    key: 'macro',
    label: 'Macro',
    ok: macro.ok,
    detail: macro.ok
      ? `updated${macro.rows != null ? ` · ${macro.rows} rows` : ''}`
      : `failed${macro.error ? ` — ${macro.error}` : ''}`,
  }

  // COT "skipped" is SUCCESS: the weekly release cadence means the stored COT is
  // current (no new Friday release). Never render a skip as a failure.
  const cotLine: RefreshLine = {
    key: 'cot',
    label: 'COT',
    ok: cot.ok,
    detail: cot.ok
      ? cot.action === 'skipped'
        ? 'current (weekly cadence)'
        : 'refetched'
      : `failed${cot.error ? ` — ${cot.error}` : ''}`,
  }

  const newsLine: RefreshLine = {
    key: 'news',
    label: 'News',
    ok: news.ok,
    detail: news.ok
      ? `${news.count ?? 0} articles`
      : `failed${news.error ? ` — ${news.error}` : ''}`,
  }

  // FIN-142/192: the LME base-metal context leg. A refreshable dot in its own
  // right, so a filtered `{"sources":["lme"]}` refresh shows its own result line.
  const lmeLine: RefreshLine = {
    key: 'lme',
    label: 'LME context',
    ok: lme.ok,
    detail: lme.ok
      ? `refreshed${lme.stored != null ? ` · ${lme.stored} metals` : ''}`
      : `failed${lme.error ? ` — ${lme.error}` : ''}`,
  }

  // The token is a STATUS check, not something refresh_spine can fix (Kite needs
  // a manual login). So an invalid token is NOT a "partial failure" — it's a
  // separate signal that routes to the Kite modal.
  const tokenLine: RefreshLine = {
    key: 'token',
    label: 'Kite token',
    ok: token.valid,
    detail: token.valid ? 'valid' : 'expired — daily login required',
  }

  // FIN-192: a filtered refresh returns the legs it did NOT run as `skipped`
  // (ok:true, skipped:true). A skipped leg is neither an update nor a failure —
  // it was not part of this refresh — so drop it from the report entirely (never
  // a false "updated", never counted as a failure). A bare refresh runs every
  // leg → nothing is skipped → the full report stands. `token` has no skipped
  // state (always a cheap status readout).
  const legs: Array<{ line: RefreshLine; skipped: boolean }> = [
    { line: macroLine, skipped: !!macro.skipped },
    { line: cotLine, skipped: !!cot.skipped },
    { line: newsLine, skipped: !!news.skipped },
    { line: lmeLine, skipped: !!lme.skipped },
  ]
  const ranLegs = legs.filter((l) => !l.skipped)

  return {
    status: res.status,
    alreadyRunning,
    startedAt: res.started_at ?? null,
    // only the legs that actually RAN can be a partial failure; a skipped leg is
    // ok:true anyway, so it can never flip this.
    anyFailed: ranLegs.some((l) => !l.line.ok),
    tokenInvalid: !token.valid,
    lines: [...ranLegs.map((l) => l.line), tokenLine],
  }
}
