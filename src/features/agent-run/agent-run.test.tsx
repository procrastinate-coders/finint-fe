import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/test/mocks/server'
import { agentRunResponse } from '@/lib/api/contracts'
import servedCurrent from '@/test/fixtures/agent-run/served-current.json'
import servedFour from '@/test/fixtures/agent-run/served-four-analysts.json'
import servedFourNarrow from '@/test/fixtures/agent-run/served-four-narrow-board.json'
import servedFourOneBad from '@/test/fixtures/agent-run/served-four-one-rejected.json'
import servedGuardClaims from '@/test/fixtures/agent-run/served-guard-claims.json'
import servedHealthy from '@/test/fixtures/agent-run/served-healthy.json'
import servedRefused from '@/test/fixtures/agent-run/served-refused.json'
import { AgentRunScreen } from './AgentRunScreen'

/**
 * ⚠️ WHAT IS AND IS NOT REAL IN THESE FIXTURES — read this before trusting a pass.
 *
 * REAL, copied from harness artifacts, nothing invented:
 *  - `served-refused` / `served-healthy` / `served-current` — the 2026-09-04 and
 *    2026-09-05 runs, assembled by the harness's own `push_agent_run.gather()` and
 *    `read_agent_run()`.
 *  - `served-four-*` — the REAL four-analyst run at `runs/2026-09-08`: all four of
 *    `analyst_{positioning,technical,crossmarket,news}.json` verbatim, the real
 *    gate (which REFUSED — 9/9 closes unsettled — while the analysts ran anyway),
 *    the real guard log, and the real scan bundles.
 *
 * ⚠️ NOT YET REAL — the shape is proposed, and the page is only PROVISIONALLY
 * verified until a run lands carrying it:
 *  - `board[]` beyond nine fields. `push_agent_run.BOARD_FIELDS` ships nine keys;
 *    the four analysts collectively cite thirty-four. The wide `board[]` here was
 *    built by the SAME `board_from_scan` logic over the SAME real scan bundle with
 *    the field list widened — so the values and names are real, but the endpoint
 *    does not serve them yet.
 *  - top-level `ratios` — real values, straight out of the real scan.json, but the
 *    endpoint carries no `ratios` key at all today.
 *  `served-four-narrow-board` is the shape the endpoint ACTUALLY serves right now,
 *  and it is what keeps the honest "not served" paths under test.
 *
 * ⚠️ The four analysts ran against an earlier scan snapshot than the one on disk,
 * so some prose (e.g. "atr is null") describes an earlier board than the values
 * beside it. That mismatch is left in deliberately: the page renders board facts
 * and agent prose APART precisely so a divergence between them is visible rather
 * than smoothed over. No assertion here claims the two agree.
 *
 * When a real run lands with the wide board, this page is verified against it
 * before FIN-228 Stream C closes.
 */
function mount(payload: unknown, date = '2026-09-08') {
  const parsed = agentRunResponse.parse(payload) // drift fails loudly, here first
  server.use(http.get('*/agent-run/*', () => HttpResponse.json(parsed)))
  return renderAt(date)
}

function mountMissing(date = '2026-01-01') {
  server.use(
    http.get('*/agent-run/*', () =>
      HttpResponse.json({ detail: `no harness run landed for ${date}` }, { status: 404 }),
    ),
  )
  return renderAt(date)
}

function renderAt(date: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AgentRunScreen date={date} />
    </QueryClientProvider>,
  )
}

/** The rendered card for one instrument — the by-instrument grouping under test. */
function panel(instrument: string): HTMLElement {
  const el = document.getElementById(`instrument-${instrument}`)
  if (!el) throw new Error(`no panel rendered for ${instrument}`)
  return el
}

// ============================================================================
// FIN-228 — ALL FOUR ANALYSTS REACH THE READER
// ============================================================================
describe('FIN-228 — four analysts, grouped by instrument', () => {
  it('⚠️ renders all four views INSIDE one instrument card, not four sections', async () => {
    mount(servedFour)
    await screen.findByText('The board')
    const gold = panel('GOLD')
    // every analyst's label, in the same card
    for (const label of ['Positioning', 'Technical', 'Cross-market', 'News']) {
      expect(within(gold).getByText(label)).toBeInTheDocument()
    }
    // and each one's own prose, from the real reports
    expect(within(gold).getByText(/read as LONG_LIQUIDATION/)).toBeInTheDocument()
    expect(within(gold).getByText(/dist_to_support_atr and dist_to_resistance_atr are null/)).toBeInTheDocument()
    expect(within(gold).getByText(/COMEX\/international reference/)).toBeInTheDocument()
    expect(within(gold).getByText(/No material overnight catalyst/)).toBeInTheDocument()
  })

  it('renders every instrument on the board, each with all four views', async () => {
    mount(servedFour)
    await screen.findByText('The board')
    for (const name of ['GOLD', 'SILVER', 'COPPER', 'CRUDEOIL', 'NATURALGAS', 'ZINC', 'ALUMINIUM', 'LEAD', 'NICKEL']) {
      expect(within(panel(name)).getByText('Positioning')).toBeInTheDocument()
      expect(within(panel(name)).getByText('News')).toBeInTheDocument()
      expect(within(panel(name)).getByText('Cross-market')).toBeInTheDocument()
    }
  })

  it('shows each analyst on the WHOLE board separately from the instruments', async () => {
    mount(servedFour)
    expect(await screen.findByText('The board as a whole')).toBeInTheDocument()
    expect(
      screen.getByText(/dominant structural fact this morning is a total volatility blackout/),
    ).toBeInTheDocument() // technical's board_note
    expect(screen.getByText(/USD\/INR at 94.4604/)).toBeInTheDocument() // crossmarket backdrop
    expect(screen.getByText(/DXY is not present anywhere on this board/)).toBeInTheDocument()
    expect(screen.getByText(/No overnight catalysts were stored/)).toBeInTheDocument()
  })

  it('keeps refused[] per analyst — the technical refusals are its own', async () => {
    mount(servedFour)
    await screen.findByText('The board')
    const gold = within(panel('GOLD'))
    expect(
      gold.getByText(/atr · atr_avg · dist_to_support_atr · dist_to_resistance_atr · in_play/),
    ).toBeInTheDocument()
    expect(gold.getAllByText(/that is the system being honest/i).length).toBeGreaterThan(0)
  })
})

// ============================================================================
// ⚠️ A FAILED ANALYST IS UNMISTAKABLE
// ============================================================================
describe('FIN-228 — three reports must never pass for four', () => {
  it('⚠️ names the rejected analyst up front, before any prose', async () => {
    mount(servedFourOneBad)
    expect(await screen.findByText(/rejected by the guard/i)).toBeInTheDocument()
    expect(
      screen.getByText(/1 of 4 analysts produced no usable read this run — Technical/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/are 3 of 4 views of this board, not the whole of it/),
    ).toBeInTheDocument()
  })

  it('⚠️ marks the gap INSIDE every instrument card, not once at the top', async () => {
    mount(servedFourOneBad)
    await screen.findByText('The board')
    for (const name of ['GOLD', 'COPPER', 'NICKEL']) {
      expect(
        within(panel(name)).getByText(
          /no read — this analyst's report was rejected by the provenance guard/,
        ),
      ).toBeInTheDocument()
    }
    // the other three still render their reads in that same card
    expect(within(panel('GOLD')).getByText(/read as LONG_LIQUIDATION/)).toBeInTheDocument()
  })

  it('⚠️ does NOT render the rejected analyst’s prose as content anywhere', async () => {
    mount(servedFourOneBad)
    await screen.findByText('The board')
    // technical's real prose, present in the payload, must not be rendered
    expect(
      screen.queryByText(/dist_to_support_atr and dist_to_resistance_atr are null/),
    ).toBeNull()
    expect(
      screen.queryByText(/dominant structural fact this morning is a total volatility blackout/),
    ).toBeNull()
    // and its rejection receipt IS shown
    expect(screen.getAllByText('analyst_technical.bad').length).toBeGreaterThan(0)
  })

  it('an analyst that never landed reads as absent, not as silence', async () => {
    const threeOnly = {
      ...servedFour,
      stages: servedFour.stages.filter((s) => s.agent !== 'analyst_news'),
    }
    mount(threeOnly)
    await screen.findByText('The board')
    expect(screen.getByText('did not land').parentElement?.textContent).toMatch(
      /News/,
    )
    expect(
      within(panel('GOLD')).getByText(/did not land a report for this run/),
    ).toBeInTheDocument()
  })

  it('⚠️ a FIFTH analyst is not hidden by the roster', async () => {
    const withNew = {
      ...servedFour,
      stages: [
        ...servedFour.stages,
        {
          stage: 'analyst',
          agent: 'analyst_flows',
          seq: 9,
          status: 'ok',
          report: {
            agent: 'flows-analyst',
            board_note: 'a board note from an analyst this view has never seen',
            instruments: [{ instrument: 'GOLD', flow_read: 'a read nobody declared' }],
          },
        },
      ],
    }
    mount(withNew)
    await screen.findByText('The board')
    expect(screen.getAllByText('flows').length).toBeGreaterThan(0)
    expect(within(panel('GOLD')).getByText(/a read nobody declared/)).toBeInTheDocument()
    expect(screen.getAllByText(/not on the expected roster/).length).toBe(9)
  })
})

// ============================================================================
// ⚠️ THE NEW STREAM A FIELDS — never without their window or basis
// ============================================================================
describe('FIN-228 Stream A fields — a figure never outruns its basis', () => {
  it('⚠️ the premium z renders ONLY with its window, and the window is per instrument', async () => {
    mount(servedFour)
    await screen.findByText('The board')
    // GOLD: premium_z -0.3525 over 196 sessions
    expect(within(panel('GOLD')).getByText(/z −0\.35 over 196 sessions/)).toBeInTheDocument()
    // SILVER's window differs — which is exactly why the z cannot travel alone
    expect(
      within(panel('SILVER')).getAllByText(/over 216 sessions/).length,
    ).toBeGreaterThan(0)
    // and the basis is rendered verbatim, not summarised away
    expect(
      within(panel('GOLD')).getByText(/reference x USD\/INR x \(1 \+ 15% import duty\)/),
    ).toBeInTheDocument()
  })

  it('⚠️ a z with NO window is withheld, not printed', async () => {
    const noWindow = {
      ...servedFour,
      board: servedFour.board.map((b) =>
        b.instrument === 'GOLD' ? { ...b, premium_window: null } : b,
      ),
    }
    mount(noWindow)
    await screen.findByText('The board')
    const gold = within(panel('GOLD'))
    expect(gold.getByText(/z withheld/)).toBeInTheDocument()
    expect(gold.getByText(/without its sample size states more than it knows/)).toBeInTheDocument()
    expect(gold.queryByText(/z −0\.35/)).toBeNull()
    // the percentage itself needs no window and is still shown
    expect(gold.getByText(/−2\.28% to import parity/)).toBeInTheDocument()
  })

  it('renders term structure, the spread and the roll with their bases', async () => {
    mount(servedFour)
    await screen.findByText('The board')
    const gold = within(panel('GOLD'))
    expect(gold.getByText('contango')).toBeInTheDocument()
    expect(gold.getByText(/near\/next \+1,527/)).toBeInTheDocument()
    expect(gold.getByText(/18 sessions to expiry/)).toBeInTheDocument()
    expect(gold.getByText(/next contract holds 45.0% of OI/)).toBeInTheDocument()
    expect(
      gold.getByText(/GOLD26DECFUT minus GOLD26OCTFUT · GOLD26DECFUT OI over/),
    ).toBeInTheDocument()
  })

  it('⚠️ a ratio’s VALUE and its PERCENTILE are told apart, with the basis', async () => {
    mount(servedFour)
    await screen.findByText('The board as a whole')
    expect(screen.getByText('GOLD / SILVER')).toBeInTheDocument()
    expect(screen.getAllByText(/\(today’s actual contracts\)/)).toHaveLength(2)
    expect(screen.getAllByText(/over 250 continuous sessions/)).toHaveLength(2)
    expect(screen.getByText(/units: per_gram/)).toBeInTheDocument()
    // the backend's own sentence about the two bases differing, verbatim
    expect(
      screen.getByText(/normalised to rupees per gram.*the two bases differ slightly in level/),
    ).toBeInTheDocument()
  })

  it('labels a raw-points distance as NOT ATR-normalised when no ATR multiple exists', async () => {
    const noAtr = {
      ...servedFour,
      board: servedFour.board.map((b) =>
        b.instrument === 'GOLD'
          ? { ...b, dist_to_support_atr: null, dist_to_resistance_atr: null }
          : b,
      ),
    }
    mount(noAtr)
    await screen.findByText('The board')
    expect(within(panel('GOLD')).getByText(/points below — no ATR multiple/)).toBeInTheDocument()
  })
})

// ============================================================================
// ⚠️ fail-closed: the wide board is NOT served yet
// ============================================================================
describe('FIN-228 — the fields the endpoint does not serve yet', () => {
  it('⚠️ omits every Stream A figure when the board carries only its nine fields', async () => {
    mount(servedFourNarrow)
    await screen.findByText('The board')
    const gold = within(panel('GOLD'))
    // the nine served fields still render
    expect(gold.getByText(/OI 10,461/)).toBeInTheDocument()
    // ⚠️ The analysts' PROSE quotes these figures too, so the negative assertions
    // target what ONLY the board strip renders: its own section labels and its
    // own formatting. "not in the strip" is the claim, not "not on the page".
    expect(gold.queryByText('structure')).toBeNull()
    expect(gold.queryByText('premium')).toBeNull()
    expect(gold.queryByText('levels')).toBeNull()
    expect(gold.queryByText('contango')).toBeNull() // exact match = the strip's span
    expect(gold.queryByText(/z −0\.35 over 196 sessions/)).toBeNull()
    // the analysts' prose STILL renders — the numbers are just never mined from it
    expect(gold.getByText(/read as LONG_LIQUIDATION/)).toBeInTheDocument()
  })

  it('omits the ratio section entirely when ratios are not served', async () => {
    mount(servedFourNarrow)
    await screen.findByText('The board as a whole')
    expect(screen.queryByText('Cross-instrument ratios')).toBeNull()
    expect(screen.queryByText('GOLD / SILVER')).toBeNull()
  })

  it('says so per instrument when the board row itself is missing', async () => {
    mount({ ...servedFour, board: [] })
    await screen.findByText('The board')
    expect(
      within(panel('GOLD')).getByText(/board facts for this instrument are not served/i),
    ).toBeInTheDocument()
    expect(within(panel('GOLD')).queryByText(/OI 10,461/)).toBeNull()
  })
})

// ============================================================================
// 🔴 THE STATUS-CODE RULE — a 404 and a refusal are DIFFERENT PAGES
// ============================================================================
describe('FIN-231 — 404 and a gate refusal are not the same page', () => {
  it('⚠️ a 200 with gate.ok:false is the full refusal treatment', async () => {
    mount(servedRefused, '2026-09-04')
    expect(await screen.findByText(/gate refused/i)).toBeInTheDocument()
    expect(screen.queryByText(/no harness run for/i)).not.toBeInTheDocument()
  })

  it('⚠️ a 404 says no run was landed, and never claims a refusal', async () => {
    mountMissing('2026-01-01')
    expect(await screen.findByText(/no harness run for/i)).toBeInTheDocument()
    expect(screen.getByText(/this is NOT a gate refusal/i)).toBeInTheDocument()
    expect(screen.queryByText(/gate refused/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/gate not recorded/i)).not.toBeInTheDocument()
  })
})

describe('FIN-227 — a GATE REFUSAL is the page, never a blank one', () => {
  it('⚠️ renders the refusal reason verbatim, with the check that failed', async () => {
    mount(servedRefused, '2026-09-04')
    expect(await screen.findByText(/gate refused — no agents ran/i)).toBeInTheDocument()
    expect(
      screen.getAllByText(/9\/9 continuous series stale by > 3 sessions — max 36/).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('any_fresh_continuous')).toBeInTheDocument()
    expect(screen.getByText('instrument_count')).toBeInTheDocument()
    expect(screen.getByText(/ALUMINIUM · COPPER · CRUDEOIL/)).toBeInTheDocument()
  })

  it('says WHY there is no analyst report, rather than showing nothing', async () => {
    mount(servedRefused, '2026-09-04')
    expect(
      await screen.findByText(/no analyst report for this date by design/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/no stage rows were landed/i)).toBeInTheDocument()
  })

  it('⚠️ never claims "no agents ran" when a refused run DID run agents', async () => {
    // The real 2026-09-08 run: gate refused (9/9 closes unsettled), four analysts
    // landed anyway. Printing "no agents ran" over four visible reads is a lie.
    mount(servedFour)
    expect(
      await screen.findByText(/gate refused — but agents ran anyway/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/4 stages landed regardless/)).toBeInTheDocument()
    expect(screen.getByText(/read it against this refusal, not instead of it/)).toBeInTheDocument()
    expect(screen.queryByText(/gate refused — no agents ran/i)).toBeNull()
  })
})

// ============================================================================
// quarantine, guard and honest degradation (FIN-231, still enforced)
// ============================================================================
describe('FIN-231 G3 — a quarantined stage renders as REJECTED, not as a read', () => {
  it('⚠️ names it rejected, keeps the .bad suffix, and marks the row quarantined', async () => {
    mount(servedCurrent, '2026-09-05')
    expect(
      await screen.findByText(/rejected — quarantined by the provenance guard/i),
    ).toBeInTheDocument()
    expect(screen.getAllByText('analyst_bear.bad').length).toBeGreaterThan(0)
    expect(screen.getByText('quarantined')).toBeInTheDocument()
  })

  it('⚠️ does NOT render the rejected report body as content', async () => {
    mount(servedCurrent, '2026-09-05')
    await screen.findByText(/rejected — quarantined by the provenance guard/i)
    expect(screen.queryByText(/an ungrounded number the guard denied/)).toBeNull()
    expect(screen.queryByText(/COT sits at the 97th percentile/)).toBeNull()
    expect(
      screen.getByText(/the largest OI build on the ranked board/),
    ).toBeInTheDocument()
  })
})

describe('FIN-227 — the guard is visible, denials included', () => {
  it('⚠️ renders every decision with its reason and agent_id', async () => {
    mount(servedCurrent, '2026-09-05')
    expect(await screen.findByText('deny')).toBeInTheDocument()
    expect(screen.getAllByText('allow').length).toBe(2)
    expect(screen.getByText(/ungrounded 0\.0757 in `cot_read`/)).toBeInTheDocument()
    expect(screen.getByText('denied').parentElement?.textContent).toMatch(/1\s*denied/)
    expect(screen.getByText('allowed').parentElement?.textContent).toMatch(/2\s*allowed/)
  })

  it('⚠️ counts CLAIMS as well as decisions — one deny can carry four', async () => {
    // ⚠️ The claims are real (the four ungrounded numbers named in the real
    // 2026-09-05 deny reason); only their STRUCTURE is new — the guard writer
    // does not emit `claims` yet, so this shape is proposed, not observed.
    mount(servedGuardClaims, '2026-09-05')
    await screen.findByText('deny')
    expect(screen.getByText('denied').parentElement?.textContent).toMatch(
      /1\s*denied\s*\(\s*4\s*claims\s*\)/,
    )
    // each claim on its own line, naming the instrument and the field
    expect(screen.getByText('CRUDEOIL · cot_read')).toBeInTheDocument()
    expect(screen.getByText('ALUMINIUM · cot_read')).toBeInTheDocument()
    expect(
      screen.getByText(/no scan level for ZINC matches it/),
    ).toBeInTheDocument()
  })

  it('⚠️ never prints "(0 claims)" beside a real denial', async () => {
    // The real 2026-09-08 run: a genuine deny, but the writer emits no claims, so
    // claim_count is 0. "1 denied (0 claims)" would say the denial rested on
    // nothing. The prose reason stands alone instead.
    mount(servedFour)
    await screen.findByText('deny')
    const counts = screen.getByText('denied').parentElement?.textContent ?? ''
    expect(counts).toMatch(/1\s*denied/)
    expect(counts).not.toMatch(/claim/)
  })

  it('when the decisions are NOT served, says so instead of showing a count as the log', async () => {
    mount({ ...servedCurrent, guard: { lines: 3, sha256: 'b'.repeat(64) } }, '2026-09-05')
    expect(
      await screen.findByText(/guard decisions are not served/i),
    ).toBeInTheDocument()
    expect(screen.queryByText('deny')).not.toBeInTheDocument()
  })
})

describe('FIN-231 — a field that is not served degrades honestly', () => {
  it('the real 09-05 run predates model/api_brief_run_id — and says so', async () => {
    mount(servedHealthy, '2026-09-05')
    expect(await screen.findByText(/API brief run not recorded/i)).toBeInTheDocument()
    expect(screen.getByText(/model not recorded/i)).toBeInTheDocument()
  })

  it('renders the model and labels the token count an ESTIMATE', async () => {
    mount(servedFour)
    expect(await screen.findAllByText(/model claude-sonnet-4-6/)).toHaveLength(4)
    expect(screen.getByText(/~3,546 tokens \(estimate\)/)).toBeInTheDocument()
  })

  it('an absent gate is not a pass', async () => {
    mount({ ...servedFour, gate: null })
    expect(await screen.findByText(/gate not recorded/i)).toBeInTheDocument()
    expect(screen.getByText(/not being treated as a pass/i)).toBeInTheDocument()
  })

  it('an unreadable report body is declared, not half-shown', async () => {
    const broken = {
      ...servedFour,
      stages: servedFour.stages.map((s) =>
        s.agent === 'analyst_news' ? { ...s, report: { something: 'else' } } : s,
      ),
    }
    mount(broken)
    await screen.findByText('The board')
    expect(
      screen.getByText('report unreadable').parentElement?.textContent,
    ).toMatch(/News/)
    expect(
      within(panel('GOLD')).getByText(/in a shape this view cannot render/),
    ).toBeInTheDocument()
  })
})
