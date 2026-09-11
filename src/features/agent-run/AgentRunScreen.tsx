import type { AgentRunBoardRow, AgentRunStage } from '@/lib/api/contracts'
import { ApiError } from '@/lib/api/client'
import { ScreenError, ScreenLoading } from '@/components/common/ScreenState'
import { formatNumber, istDate } from '@/lib/format'
import { useAgentRun } from '@/lib/query/hooks'
import { AnalystReads, type AnalystSlot } from './AnalystReads'
import { BoardNotes } from './BoardNotes'
import { BoardTable } from './BoardTable'
import { GatePanel } from './GatePanel'
import { GuardPanel } from './GuardPanel'
import { QuarantinedStage } from './QuarantinedStage'
import { Section } from './Spine'
import { StageList } from './StageList'
import {
  analystReport,
  baseAgentName,
  isQuarantined,
  specsForRun,
  type AnalystReport,
  type AnalystSpec,
} from './report-shape'
import { buildVerdict, flagsFor } from './verdict'
import { VerdictBand } from './VerdictBand'

/**
 * FIN-227/228/231 Stream C — ONE harness run, at the right altitude.
 *
 * A second reasoning layer over the same board the morning brief reads, built
 * for COMPARISON. Reading order, and why:
 *
 *   1. VERDICT BAND — ~50 words counted off typed fields. The way in. Its
 *      TENSION row is the thing this page exists to surface, and it is visible
 *      without scrolling.
 *   2. GATE detail — only when refused, where the full reason and every check
 *      must be legible (SAD §5 gap 3).
 *   3. THE BOARD — five columns, figures at 15px; expand a row for that
 *      instrument's board facts in six groups and all four reads, stacked.
 *   4. EACH ANALYST ON THE WHOLE BOARD — collapsed behind its first sentence.
 *   5. GUARD · STAGES · RECEIPTS — the provenance, at floor weight.
 *
 * ⚠️ The band does not replace the prose. Nothing is summarised or hidden except
 * the four board notes, which say so and open on a click.
 */
export function AgentRunScreen({ date }: { date: string }) {
  const run = useAgentRun(date)

  if (run.isPending) return <ScreenLoading />
  if (run.isError) {
    // 🔴 THE STATUS-CODE RULE. A 404 means NO run was landed — a DIFFERENT PAGE
    // from a gate refusal, which is a 200 carrying its reason.
    if (run.error instanceof ApiError && run.error.status === 404) {
      return (
        <div className="mx-auto max-w-[900px] py-8">
          <h1 className="text-[20px] font-semibold text-apex-fg">
            No harness run for {istDate(date)}
          </h1>
          <p className="mt-1.5 max-w-[70ch] text-[13px] leading-[19px] text-apex-fg-secondary">
            Nothing was landed for this date — the harness did not run, or its push
            never reached the API. This is NOT a gate refusal: a refused run is
            still pushed, and would show its reason here instead of this page.
          </p>
        </div>
      )
    }
    return <ScreenError error={run.error} onRetry={() => run.refetch()} />
  }

  const data = run.data
  const stages: AgentRunStage[] = data.stages ?? []
  const analystStages = stages.filter((s) => s.stage === 'analyst')
  const specs = specsForRun(analystStages.map((s) => s.agent ?? ''))

  // --- read each analyst ONCE ------------------------------------------------
  const status = new Map<string, AnalystSlot['kind']>()
  const parsed = new Map<string, AnalystReport>()
  for (const s of analystStages) {
    const agent = baseAgentName(s.agent)
    // ⚠️ Quarantine decided BEFORE parsing. A rejected report never takes the
    // content path, not even briefly.
    if (isQuarantined(s)) {
      status.set(agent, 'rejected')
      continue
    }
    const body = analystReport.safeParse(s.report)
    if (!body.success) {
      status.set(agent, 'unreadable')
      continue
    }
    status.set(agent, 'read')
    parsed.set(agent, body.data)
  }

  const board: AgentRunBoardRow[] = (data.board ?? []).filter((b) => !!b.instrument)
  const positioning = parsed.get('analyst_positioning')
  const flags = flagsFor(board, positioning)
  const reports = specs
    .map((spec) => ({ spec, report: parsed.get(spec.agent) }))
    .filter((x): x is { spec: AnalystSpec; report: AnalystReport } => !!x.report)

  const verdict = buildVerdict({
    data,
    specs,
    landed: [...status.values()].filter((s) => s === 'read').length,
    reports,
    positioning,
  })

  const slotsFor = (instrument: string) => {
    const m = new Map<string, AnalystSlot>()
    for (const spec of specs) {
      const st = status.get(spec.agent)
      if (st === 'rejected') m.set(spec.agent, { kind: 'rejected' })
      else if (st === 'unreadable') m.set(spec.agent, { kind: 'unreadable' })
      else if (st === undefined) m.set(spec.agent, { kind: 'absent' })
      else {
        const ins = parsed
          .get(spec.agent)
          ?.instruments.find((i) => i.instrument === instrument)
        m.set(spec.agent, ins ? { kind: 'read', ins } : { kind: 'uncovered' })
      }
    }
    return m
  }

  // an instrument an analyst covered that the board did not carry — never drop
  // a read for want of its facts
  const extra = new Set<string>()
  for (const r of parsed.values()) {
    for (const ins of r.instruments) {
      if (!board.some((b) => b.instrument === ins.instrument)) extra.add(ins.instrument)
    }
  }
  const quarantined = analystStages.filter(isQuarantined)

  return (
    <div className="mx-auto max-w-[1120px] pb-12">
      <header className="mb-2 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <h1 className="text-[24px] font-semibold tracking-[-0.022em] text-apex-fg">
          Agent run · {istDate(data.run_date ?? date)}
        </h1>
        <p className="apex-tabular flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-apex-fg-tertiary">
          <span>{data.run_id ? `run ${data.run_id}` : 'run id not recorded'}</span>
          <span>
            {data.board_date
              ? `board ${istDate(data.board_date)}`
              : 'board date not recorded'}
          </span>
          {/* SAD §5 gap 5 — the key that joins the two pipelines */}
          <span>
            {data.api_brief_run_id
              ? `API brief ${data.api_brief_run_id}`
              : 'API brief run not recorded'}
          </span>
        </p>
      </header>
      <p className="mb-6 max-w-[70ch] text-[11px] leading-[1.55] text-apex-fg-tertiary">
        A second reasoning layer over the same deterministic board the morning brief
        reads. Paper only — it decides nothing.
      </p>

      <VerdictBand v={verdict} />

      <div className="mt-8 flex flex-col gap-8">
        {/* ⚠️ A REFUSAL KEEPS ITS FULL TREATMENT. The band states it; this states
            every check, the stale and unsettled lists, and when it was checked. */}
        {data.gate?.ok === false && (
          <GatePanel gate={data.gate} stagesLanded={stages.length} />
        )}

        {quarantined.length > 0 && (
          <Section
            title="Rejected reports"
            subtitle="quarantined by the provenance guard"
          >
            <div className="flex flex-col gap-3">
              {quarantined.map((s) => (
                <QuarantinedStage key={`${s.agent}-${s.seq}`} stage={s} />
              ))}
            </div>
          </Section>
        )}

        <Section
          title="The board"
          subtitle={`${formatNumber(board.length)} instruments · all ${specs.length} views of each`}
        >
          <BoardTable board={board} specs={specs} flags={flags} slotsFor={slotsFor} />
          {[...extra].map((name) => (
            <div
              key={name}
              className="mt-3 rounded-[12px] border-[0.5px] border-apex-border bg-apex-primary p-4"
            >
              <h3 className="text-[17px] font-semibold tracking-[-0.018em] text-apex-fg">
                {name}
              </h3>
              <p className="mb-4 mt-1 text-[11px] text-apex-yellow">
                covered by an analyst, but not carried on the board
              </p>
              <AnalystReads instrument={name} specs={specs} slots={slotsFor(name)} />
            </div>
          ))}
        </Section>

        <Section
          title="Each analyst on the whole board"
          subtitle="one line each — open for the full note"
        >
          <BoardNotes reports={reports} />
        </Section>

        <Section title="Guard" subtitle="every provenance decision" quiet>
          <GuardPanel guard={data.guard} />
        </Section>

        <Section title="Stages" subtitle={`${stages.length} landed`} quiet>
          <StageList stages={stages} />
        </Section>

        <Section title="Receipts" quiet>
          <ul className="apex-tabular flex flex-wrap gap-x-8 gap-y-1 text-[11px] text-apex-fg-tertiary">
            <li>
              guard_log — {plural(data.guard?.lines, 'decision')}
              {data.guard?.sha256 && ` · ${data.guard.sha256.slice(0, 12)}`}
            </li>
            <li>
              audit — {plural(data.audit?.lines, 'receipt')}
              {data.audit?.sha256 && ` · ${data.audit.sha256.slice(0, 12)}`}
            </li>
            <li>
              transcripts —{' '}
              {data.transcripts ? `${data.transcripts.length} copied` : 'not recorded'}
            </li>
          </ul>
        </Section>
      </div>
    </div>
  )
}

// A count the record does not carry is "not recorded" — never 0 (law 1).
function plural(n: number | null | undefined, noun: string): string {
  if (n == null) return 'not recorded'
  return `${n} ${noun}${n === 1 ? '' : 's'}`
}
