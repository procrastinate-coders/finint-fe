import type { AgentRunBoardRow, AgentRunStage } from '@/lib/api/contracts'
import { ApiError } from '@/lib/api/client'
import { ScreenError, ScreenLoading } from '@/components/common/ScreenState'
import { istDate } from '@/lib/format'
import { useAgentRun } from '@/lib/query/hooks'
import { AnalystCoverage, type AnalystStatus } from './AnalystCoverage'
import { BoardLevel } from './BoardLevel'
import { GatePanel } from './GatePanel'
import { GuardPanel } from './GuardPanel'
import { InstrumentPanel, type AnalystSlot } from './InstrumentPanel'
import { QuarantinedStage } from './QuarantinedStage'
import { Section } from './Section'
import { StageList } from './StageList'
import {
  analystReport,
  baseAgentName,
  isQuarantined,
  specsForRun,
  type AnalystReport,
  type AnalystSpec,
} from './report-shape'

/**
 * FIN-227/228/231 Stream C — ONE harness run. A second read on the same board
 * Father already reads in the API brief, produced by a different pipeline, so the
 * page is built for COMPARISON: what the board said, what the four analysts said
 * about it, and what the guard allowed or blocked in between.
 *
 * READING ORDER, and why:
 *   1. GATE      — a refusal is the whole story that morning; it leads.
 *   2. STAGES    — what ran, with model and token estimate.
 *   3. ANALYSTS  — the ROSTER and its outcome. A missing analyst is named here
 *                  before any prose, so three reads never pass for four.
 *   4. THE BOARD — nine instruments, each with its facts and ALL four views.
 *                  The substance; grouped by instrument (see InstrumentPanel).
 *   5. BOARD-LEVEL — each analyst on the whole board, and the ratios. Below the
 *                  instruments because a trader comes here for an instrument.
 *   6. GUARD / RECEIPTS — the provenance.
 *
 * ⚠️ Every field of the response is optional by contract. That is a licence to say
 * "not recorded"; it is never a licence to default (law 1).
 */
export function AgentRunScreen({ date }: { date: string }) {
  const run = useAgentRun(date)

  if (run.isPending) return <ScreenLoading />
  if (run.isError) {
    // 🔴 THE STATUS-CODE RULE. A 404 means NO run was landed for this date — the
    // harness did not run at all. That is a DIFFERENT PAGE from a gate refusal,
    // which is a 200 carrying gate.ok:false and its reason. Conflating them would
    // turn the single most important thing this view shows into a blank page.
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

  // --- read each analyst ONCE, then index it by instrument ------------------
  const statuses = new Map<string, AnalystStatus>()
  const parsed = new Map<string, AnalystReport>()
  for (const s of analystStages) {
    const agent = baseAgentName(s.agent)
    // ⚠️ Quarantine is decided BEFORE the report is parsed. A rejected report must
    // never take the content path — not even briefly.
    if (isQuarantined(s)) {
      statuses.set(agent, 'rejected')
      continue
    }
    const body = analystReport.safeParse(s.report)
    if (!body.success) {
      statuses.set(agent, 'unreadable')
      continue
    }
    statuses.set(agent, 'ok')
    parsed.set(agent, body.data)
  }

  const board = new Map<string, AgentRunBoardRow>(
    (data.board ?? []).flatMap((b) => (b.instrument ? [[b.instrument, b]] : [])),
  )

  // The instruments to render: the board's, plus any an analyst covered that the
  // board did not carry — never drop a read for want of its facts.
  const instruments = [...board.keys()]
  for (const report of parsed.values()) {
    for (const ins of report.instruments) {
      if (!instruments.includes(ins.instrument)) instruments.push(ins.instrument)
    }
  }

  const slotsFor = (instrument: string) => {
    const m = new Map<string, AnalystSlot>()
    for (const spec of specs) {
      const st = statuses.get(spec.agent)
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

  const quarantined = analystStages.filter(isQuarantined)
  const landed = [...statuses.values()].filter((s) => s === 'ok').length
  const boardLevel = specs
    .map((spec) => ({ spec, report: parsed.get(spec.agent) }))
    .filter((x): x is { spec: AnalystSpec; report: AnalystReport } => !!x.report)
  // `ratios` is a typed top-level key now — read straight off the contract.
  const ratios = Object.entries(data.ratios ?? {}).map(([key, ratio]) => ({
    key,
    ratio,
  }))

  return (
    <div className="mx-auto max-w-[1000px] pb-10">
      <header className="mb-4">
        <h1 className="text-[22px] font-semibold tracking-tight text-apex-fg">
          Agent run · {istDate(data.run_date ?? date)}
        </h1>
        <p className="apex-tabular mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-apex-fg-tertiary">
          <span>{data.run_id ? `run ${data.run_id}` : 'run id not recorded'}</span>
          <span>
            {data.board_date
              ? `board ${istDate(data.board_date)}`
              : 'board date not recorded'}
          </span>
          {/* SAD §5 gap 5 — the join key. Without it the two pipelines cannot be
              lined up, which is the entire point of running a second one. */}
          <span>
            {data.api_brief_run_id
              ? `API brief ${data.api_brief_run_id}`
              : 'API brief run not recorded'}
          </span>
        </p>
        <p className="mt-1.5 max-w-[70ch] text-[11.5px] leading-[16px] text-apex-fg-tertiary">
          A second reasoning layer over the same deterministic board the morning
          brief reads. Paper only — it decides nothing.
        </p>
      </header>

      <div className="flex flex-col gap-7">
        <GatePanel gate={data.gate} stagesLanded={stages.length} />

        <Section title="Stages" subtitle={`${stages.length} landed`}>
          <StageList stages={stages} />
        </Section>

        <Section
          title="Analysts"
          subtitle={`${specs.length} expected · ${landed} landed a read`}
        >
          <div className="flex flex-col gap-3">
            <AnalystCoverage statuses={statuses} />
            {/* The receipt for each rejection, kept out of the instrument flow. */}
            {quarantined.map((s) => (
              <QuarantinedStage key={`${s.agent}-${s.seq}`} stage={s} />
            ))}
          </div>
        </Section>

        <Section
          title="The board"
          subtitle={`${instruments.length} instruments · all ${specs.length} views of each`}
        >
          {instruments.length === 0 ? (
            <p className="text-[12.5px] text-apex-fg-secondary">
              No instruments were served with this run, and no analyst covered one.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {instruments.map((name) => (
                <InstrumentPanel
                  key={name}
                  instrument={name}
                  row={board.get(name)}
                  specs={specs}
                  slots={slotsFor(name)}
                />
              ))}
            </div>
          )}
        </Section>

        <Section
          title="The board as a whole"
          subtitle="each analyst on all nine, and the cross-instrument ratios"
        >
          <BoardLevel reports={boardLevel} ratios={ratios} />
        </Section>

        <Section
          title="Guard"
          subtitle="every provenance decision — allow and deny"
        >
          <GuardPanel guard={data.guard} />
        </Section>

        <Section title="Receipts" subtitle="what can be proved later">
          <ul className="apex-tabular flex flex-col gap-1 text-[11.5px] text-apex-fg-tertiary">
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
              {data.transcripts
                ? `${data.transcripts.length} copied`
                : 'not recorded'}
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
