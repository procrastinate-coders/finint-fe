import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/test/mocks/server'
import { agentRunResponse } from '@/lib/api/contracts'
import served0911 from '@/test/fixtures/agent-run/served-0911.json'
import served0911Rerun from '@/test/fixtures/agent-run/served-0911-rerun.json'
import served0911ZeroDeny from '@/test/fixtures/agent-run/served-0911-zero-deny.json'
import servedCurrent from '@/test/fixtures/agent-run/served-current.json'
import servedRefused from '@/test/fixtures/agent-run/served-refused.json'
import { AgentRunScreen } from './AgentRunScreen'

/**
 * ⚠️ WHAT IS AND IS NOT REAL HERE — read before trusting a pass.
 *
 * REAL, assembled by the harness's OWN `push_agent_run.gather()` over the real
 * artifacts, nothing invented:
 *  - `served-0911` / `served-0911-rerun` — the two recorded runs of 2026-09-11.
 *    Both PASS the gate; 27 decisions/5 denies and 19/2 respectively.
 *  - `served-refused` — the real 2026-09-04 gate refusal.
 *  - `served-current` — the 2026-09-05 run with a quarantined stage.
 *
 * ⚠️ DERIVED, and the one thing here that is not a recorded run:
 *  - `served-0911-zero-deny` is `served-0911` with its five denies REMOVED. No
 *    recorded run is zero-deny, so the "ran, found nothing" branch cannot be
 *    tested against one. Removing rows from a real log is the smallest honest
 *    way to reach that state; it is NOT a run that happened.
 */
function mount(payload: unknown, date = '2026-09-11') {
  const parsed = agentRunResponse.parse(payload) // drift fails loudly, here first
  server.use(http.get('*/agent-run/*', () => HttpResponse.json(parsed)))
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AgentRunScreen date={date} />
    </QueryClientProvider>,
  )
}

async function openRow(name: string) {
  const r = screen.getAllByRole('button').find((b) => b.textContent?.includes(name))
  if (!r) throw new Error(`no row for ${name}`)
  await userEvent.click(r)
}

// ============================================================================
// THE VERDICT BAND — the way in, from structured fields only
// ============================================================================
describe('the verdict band says what the run found', () => {
  it('🔴 leads with the TENSION, without scrolling', async () => {
    mount(served0911)
    expect(
      await screen.findByText(/5 of 9 implied opens are not overnight/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/days of drift/)).toBeInTheDocument()
    expect(
      screen.getByText('COPPER · CRUDEOIL · GOLD · NATURALGAS · SILVER'),
    ).toBeInTheDocument()
  })

  it('counts divergence off the FIELD PRESENCE, never its wording', async () => {
    mount(served0911)
    expect(
      await screen.findByText(/3 instruments where positioning and the overnight move disagree/i),
    ).toBeInTheDocument()
  })

  it('⚠️ tracks a DIFFERENT run — the band is computed, not written', async () => {
    mount(served0911Rerun)
    expect(
      await screen.findByText(/2 instruments where positioning and the overnight move disagree/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/3 instruments where positioning/i)).toBeNull()
  })

  it('names the declined CAUSE once, with its structural reason', async () => {
    mount(served0911)
    await screen.findByText(/fields declined across/i)
    expect(screen.getByText('implied_open_pct')).toBeInTheDocument()
    expect(
      screen.getByText(/Tier B is LME-priced — no international reference leg, by design/),
    ).toBeInTheDocument()
  })

  it('states the gate and the analyst count', async () => {
    mount(served0911)
    expect(await screen.findByText('Gate passed')).toBeInTheDocument()
    expect(screen.getByText(/9 instruments · 4 of 4 analysts landed/)).toBeInTheDocument()
  })
})

// ============================================================================
// ⚠️ ABSENT IS NOT ZERO — three guard states, three sentences
// ============================================================================
describe('the guard distinguishes its three states', () => {
  it('🔴 a ZERO-DENY run reads as "ran, found nothing", not an empty section', async () => {
    mount(served0911ZeroDeny)
    const hits = await screen.findAllByText(/ran, found nothing/i)
    expect(hits.length).toBeGreaterThan(0)
    expect(screen.getAllByText(/22/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/decisions are not served/i)).toBeNull()
    expect(screen.queryByText(/guard not recorded/i)).toBeNull()
  })

  it('denies are shown with their reasons and counted', async () => {
    mount(served0911)
    await screen.findByText('The board')
    expect(screen.getAllByText(/5/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('deny').length).toBe(5)
  })

  it('decisions NOT served is a different sentence again', async () => {
    mount({ ...served0911, guard: { lines: 27, sha256: 'a'.repeat(64) } })
    expect(await screen.findByText(/decisions are not served/i)).toBeInTheDocument()
    expect(screen.queryByText(/ran, found nothing/i)).toBeNull()
  })
})

// ============================================================================
// THE BOARD
// ============================================================================
describe('the board table', () => {
  it('shows the five comparable figures, not a 48-column spreadsheet', async () => {
    mount(served0911)
    await screen.findByText('The board')
    expect(screen.getByRole('columnheader', { name: 'Total OI' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Δ OI' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /premium/i })).toBeNull()
    expect(screen.queryByRole('columnheader', { name: /^ATR$/i })).toBeNull()
  })

  it('flags the instruments the band named', async () => {
    mount(served0911)
    await screen.findByText('The board')
    expect(screen.getAllByText('span').length).toBe(5)
    expect(screen.getAllByText('div').length).toBe(3)
  })

  it('⚠️ opens the board facts in SIX labelled groups, not one flat wall', async () => {
    mount(served0911)
    await screen.findByText('The board')
    await openRow('GOLD')
    for (const g of ['Overnight', 'Structure', 'Premium', 'Levels']) {
      expect(screen.getAllByText(g).length).toBeGreaterThan(0)
    }
    // ⚠️ GOLD is Tier A bullion — no LME leg, no EIA print — so the External
    // group is OMITTED rather than rendered empty. An empty labelled group is a
    // claim that the group was measured and came back blank.
    expect(screen.queryByText('External')).toBeNull()
  })

  it('renders External only where the board actually carries it', async () => {
    mount(served0911)
    await screen.findByText('The board')
    await openRow('ZINC')          // Tier B — has an LME 3M reference
    expect(screen.getAllByText('External').length).toBeGreaterThan(0)
    expect(screen.getAllByText('LME 3M').length).toBeGreaterThan(0)
  })

  it('⚠️ carries the span caveat ON the implied open, where it is read', async () => {
    mount(served0911)
    await screen.findByText('The board')
    await openRow('GOLD')
    expect(
      screen.getAllByText(/over 2 calendar days — NOT overnight/).length,
    ).toBeGreaterThan(0)
  })

  it('⚠️ the premium z never renders without its window', async () => {
    const noWindow = {
      ...served0911,
      board: served0911.board.map((b) =>
        b.instrument === 'GOLD' ? { ...b, premium_window: null } : b,
      ),
    }
    mount(noWindow)
    await screen.findByText('The board')
    await openRow('GOLD')
    expect(screen.getByText(/withheld — no window for it/)).toBeInTheDocument()
  })
})

// ============================================================================
// ⚠️ THE FOUR READS STAY STACKED
// ============================================================================
describe('the four analysts, stacked', () => {
  it('🔴 shows all four for one instrument at once — never behind tabs', async () => {
    mount(served0911)
    await screen.findByText('The board')
    await openRow('GOLD')
    for (const a of ['Technical', 'Cross-market', 'News']) {
      expect(screen.getAllByText(a).length).toBeGreaterThan(0)
    }
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    expect(screen.queryAllByRole('tabpanel')).toHaveLength(0)
  })

  it('shows refused[] as honesty, per analyst', async () => {
    mount(served0911)
    await screen.findByText('The board')
    await openRow('ZINC')
    expect(
      screen.getAllByText(/that is the system being honest, not a failure/).length,
    ).toBeGreaterThan(0)
  })
})

// ============================================================================
// board notes — the ONE thing that collapses
// ============================================================================
describe('board notes collapse behind their own first sentence', () => {
  it('shows a word count and starts closed, with the full note in the DOM', async () => {
    mount(served0911)
    await screen.findByText('Each analyst on the whole board')
    expect(screen.getAllByText(/^\d+ words$/).length).toBeGreaterThan(0)
    const details = document.querySelectorAll('details')
    expect(details.length).toBeGreaterThan(0)
    expect((details[0] as HTMLDetailsElement).open).toBe(false)
  })
})

// ============================================================================
// the honesty rules that predate this redesign, still held
// ============================================================================
describe('a gate refusal is still the page', () => {
  it('renders the reason verbatim and the failing check', async () => {
    mount(servedRefused, '2026-09-04')
    expect(await screen.findAllByText(/gate refused/i)).toBeTruthy()
    expect(
      screen.getAllByText(/9\/9 continuous series stale by > 3 sessions — max 36/).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('any_fresh_continuous')).toBeInTheDocument()
  })

  it('a 404 is a different page from a refusal', async () => {
    server.use(
      http.get('*/agent-run/*', () =>
        HttpResponse.json({ detail: 'no harness run landed' }, { status: 404 }),
      ),
    )
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <AgentRunScreen date="2026-01-01" />
      </QueryClientProvider>,
    )
    expect(await screen.findByText(/no harness run for/i)).toBeInTheDocument()
    expect(screen.queryByText(/gate refused/i)).toBeNull()
  })
})

describe('a quarantined report is never content', () => {
  it('names the rejection and does not render the body', async () => {
    mount(servedCurrent, '2026-09-05')
    expect(
      await screen.findByText(/rejected — quarantined by the provenance guard/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/an ungrounded number the guard denied/)).toBeNull()
  })
})

describe('fields that are not served degrade honestly', () => {
  it('omits the board rather than inventing it', async () => {
    mount({ ...served0911, board: [] })
    await screen.findByText('The board')
    expect(screen.getByText(/No instruments were served with this run/)).toBeInTheDocument()
  })

  it('an absent gate is not a pass', async () => {
    mount({ ...served0911, gate: null })
    expect(await screen.findByText(/gate not recorded/i)).toBeInTheDocument()
  })
})

describe('the band recomputes for whatever is served', () => {
  it('says so plainly when there is no tension at all', async () => {
    const flat = {
      ...served0911,
      board: served0911.board.map((b) => ({
        ...b,
        implied_open_span_days: 1,
        usdinr_span_days: 1,
      })),
      stages: served0911.stages.map((s) =>
        s.agent === 'analyst_positioning'
          ? {
              ...s,
              report: {
                ...s.report,
                instruments: (
                  s.report as unknown as { instruments: Array<Record<string, unknown>> }
                ).instruments.map((i) => ({ ...i, divergence: null })),
              },
            }
          : s,
      ),
    }
    mount(flat)
    await waitFor(() =>
      expect(
        screen.getByText(/No span mislabelled, no divergence flagged/i),
      ).toBeInTheDocument(),
    )
  })
})
