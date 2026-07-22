import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/test/mocks/server'
import {
  readinessBriefCompleteFixture,
  readinessColdFixture,
  readinessCriticalAmberFixture,
  readinessFixture,
  refreshAlreadyRunningFixture,
  refreshPartialFixture,
  refreshSpineFixture,
} from '@/test/mocks/fixtures'
import { ReadinessScreen } from './ReadinessScreen'

function renderReadiness() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ReadinessScreen />
    </QueryClientProvider>,
  )
}

// All sources green — the state where nothing is stale, yet the manual Refresh
// must STILL be offered (FIN-174: Father can always force a fetch).
const allGreenFixture = {
  ...readinessFixture,
  sources: readinessFixture.sources.map((s) => ({ ...s, status: 'green' })),
  fresh_count: '8/8',
}

// The standing "Refresh" CTA now opens a SCOPE modal (FIN-192); this drives it
// through to the bare "Refresh all" sweep — the old direct-refresh behavior.
async function refreshAllViaModal(
  user: ReturnType<typeof userEvent.setup> = userEvent.setup(),
) {
  await user.click(await screen.findByRole('button', { name: /^refresh$/i }))
  await user.click(await screen.findByRole('button', { name: /refresh all/i }))
}

describe('ReadinessScreen — registry-driven, honest, manual-refresh only (FIN-174)', () => {
  it('maps EVERY source from the array — no hardcoded list (8 sources)', async () => {
    renderReadiness()
    await screen.findByText('Sources')
    for (const label of [
      'Kite (price/OI)',
      'COMEX (overnight)',
      'USD/INR',
      'DXY',
      'CFTC COT',
      'Macro prev-continuity',
      'Board completeness',
      'News (GNews)',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('a NEW (9th) source appears with no code change (law 5)', async () => {
    const withNinth = {
      ...readinessFixture,
      sources: [
        ...readinessFixture.sources,
        {
          key: 'sentiment',
          label: 'X sentiment',
          status: 'green',
          note: 'a brand-new source the backend added',
          critical: false,
          human_refreshable: false,
          action: null,
          blocks_on_red: false,
        },
      ],
      fresh_count: '8/9',
    }
    server.use(http.get('*/readiness', () => HttpResponse.json(withNinth)))
    renderReadiness()
    expect(await screen.findByText('X sentiment')).toBeInTheDocument()
    // the decision bar's fresh count reflects the registry, not a hardcoded 8
    expect(screen.getByText('8/9')).toBeInTheDocument()
    expect(screen.getByText('9 inputs')).toBeInTheDocument()
  })

  it('a red blocks_on_red source blocks generate + shows blocked_reason', async () => {
    const boardBlocked = {
      ...readinessFixture,
      sources: readinessFixture.sources.map((s) =>
        s.key === 'board' ? { ...s, status: 'red' } : s,
      ),
      can_generate: false,
      blocked_reason: 'Board incomplete — a backfill is needed',
    }
    server.use(http.get('*/readiness', () => HttpResponse.json(boardBlocked)))
    renderReadiness()
    const btn = await screen.findByRole('button', { name: /^generate$/i })
    expect(btn).toBeDisabled()
    expect(
      screen.getByText('Board incomplete — a backfill is needed'),
    ).toBeInTheDocument()
  })

  it('⚠️ landing on the screen fires ZERO /refresh — no on-land auto-refresh, even on a cold red board (FIN-174)', async () => {
    // The cold board (red, refreshable comex/usdinr) is exactly what USED to
    // auto-fire on land. Now NOTHING fetches without a click — the whole point.
    let refreshCalls = 0
    server.use(
      http.get('*/readiness', () => HttpResponse.json(readinessColdFixture)),
      http.post('*/refresh', () => {
        refreshCalls += 1
        return HttpResponse.json(refreshSpineFixture)
      }),
    )
    renderReadiness()
    await screen.findByText('Sources')
    // the Refresh CTA is rendered — but it has NOT been clicked, so no fetch
    await screen.findByRole('button', { name: /^refresh$/i })
    expect(refreshCalls).toBe(0)
  })

  it('a CRITICAL AMBER source no longer self-heals on land (FIN-174); its row still renders', async () => {
    // 2026-07-16: USD/INR amber+critical. Pre-FIN-174 this auto-fired once on land.
    // Now it does NOT — Father decides — but the row and its per-source CTA remain.
    let refreshCalls = 0
    server.use(
      http.get('*/readiness', () =>
        HttpResponse.json(readinessCriticalAmberFixture),
      ),
      http.post('*/refresh', () => {
        refreshCalls += 1
        return HttpResponse.json(refreshSpineFixture)
      }),
    )
    renderReadiness()
    await screen.findByText('Sources')
    await screen.findByRole('button', { name: /^refresh$/i })
    expect(refreshCalls).toBe(0)
    expect(screen.getByRole('button', { name: /USD\/INR/i })).toBeInTheDocument()
  })

  it('the Refresh CTA is PRESENT and ENABLED at the pre-brief gate even when every source is green', async () => {
    // allGreenFixture spreads readinessFixture → brief.exists:false (no brief yet).
    server.use(http.get('*/readiness', () => HttpResponse.json(allGreenFixture)))
    renderReadiness()
    const btn = await screen.findByRole('button', { name: /^refresh$/i })
    expect(btn).toBeEnabled()
  })

  it('a COMPLETE brief HIDES the Refresh CTA — the read is final, View brief is the action', async () => {
    server.use(
      http.get('*/readiness', () =>
        HttpResponse.json(readinessBriefCompleteFixture),
      ),
    )
    renderReadiness()
    // View brief proves the complete-brief bar rendered…
    expect(
      await screen.findByRole('button', { name: /view brief/i }),
    ).toBeInTheDocument()
    // …and Refresh is not offered next to it (nothing to (re)generate).
    expect(
      screen.queryByRole('button', { name: /^refresh$/i }),
    ).not.toBeInTheDocument()
  })

  it('the Refresh-all sweep fires EXACTLY ONE /refresh; the CTA disables in-flight (no double-fire)', async () => {
    let refreshCalls = 0
    server.use(
      http.get('*/readiness', () => HttpResponse.json(allGreenFixture)),
      http.post('*/refresh', async () => {
        refreshCalls += 1
        await delay(200) // hold it in-flight so we can attempt a second click
        return HttpResponse.json(refreshSpineFixture)
      }),
    )
    // pointerEventsCheck off: attempt the 2nd click even over the disabled control.
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderReadiness()
    await refreshAllViaModal(user)
    await waitFor(() => expect(refreshCalls).toBe(1))
    // in-flight → the standing CTA disables, so it can't reopen the modal to re-fire
    const cta = screen.getByRole('button', { name: /refreshing/i })
    expect(cta).toBeDisabled()
    await user.click(cta)
    expect(refreshCalls).toBe(1)
  })

  it('the Refresh-all sweep surfaces a PARTIAL report that NAMES the failed source, not a generic failure', async () => {
    server.use(
      http.get('*/readiness', () => HttpResponse.json(readinessColdFixture)),
      http.post('*/refresh', () => HttpResponse.json(refreshPartialFixture)),
    )
    renderReadiness()
    await refreshAllViaModal()
    expect(await screen.findByText(/partial refresh/i)).toBeInTheDocument()
    expect(screen.getByText(/comex fetch timed out/i)).toBeInTheDocument()
    // COT "skipped" must NOT read as a failure.
    expect(screen.queryByText(/cot failed/i)).not.toBeInTheDocument()
  })

  it('the Refresh-all sweep, then already_running, shows a bounded wait keyed on started_at', async () => {
    server.use(
      http.get('*/readiness', () => HttpResponse.json(readinessColdFixture)),
      http.post('*/refresh', () =>
        HttpResponse.json(refreshAlreadyRunningFixture),
      ),
    )
    renderReadiness()
    await refreshAllViaModal()
    expect(await screen.findByText(/already running/i)).toBeInTheDocument()
  })

  it('the Kite source CTA opens the refresh modal (a login, not a spine fetch)', async () => {
    const kiteRed = {
      ...readinessFixture,
      sources: readinessFixture.sources.map((s) =>
        s.key === 'kite'
          ? {
              ...s,
              status: 'red',
              note: 'Token expired — daily login required',
            }
          : s,
      ),
      can_generate: false,
      blocked_reason: 'Kite token expired — refresh to generate',
    }
    server.use(http.get('*/readiness', () => HttpResponse.json(kiteRed)))
    renderReadiness()
    const cta = await screen.findByRole('button', {
      name: /refresh kite token/i,
    })
    await userEvent.click(cta)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByText(/Zerodha requires a manual login/i),
    ).toBeInTheDocument()
    // the honest broken-redirect warning
    expect(screen.getByText(/won't load/i)).toBeInTheDocument()
  })
})

describe('ReadinessScreen — filtered per-dot refresh (FIN-192)', () => {
  // readinessFixture + an actionable LME dot (amber + action:'refresh').
  const withLmeDot = {
    ...readinessFixture,
    sources: [
      ...readinessFixture.sources,
      {
        key: 'lme',
        label: 'LME (base-metal context)',
        status: 'amber',
        note: 'Stale · 2d',
        critical: false,
        human_refreshable: true,
        action: 'refresh',
        blocks_on_red: false,
      },
    ],
  }
  // news made actionable (amber; it already carries action:'refresh').
  const withStaleNews = {
    ...readinessFixture,
    sources: readinessFixture.sources.map((s) =>
      s.key === 'news' ? { ...s, status: 'amber' } : s,
    ),
  }
  // kite expired (red) → its dot CTA must route to the login modal, not /refresh.
  const withExpiredKite = {
    ...readinessFixture,
    sources: readinessFixture.sources.map((s) =>
      s.key === 'kite'
        ? { ...s, status: 'red', note: 'Token expired — daily login required' }
        : s,
    ),
  }

  // Capture every POST /refresh body (null = no JSON body = a bare refresh).
  function captureRefreshBodies(): unknown[] {
    const bodies: unknown[] = []
    server.use(
      http.post('*/refresh', async ({ request }) => {
        bodies.push(await request.json().catch(() => null))
        return HttpResponse.json(refreshSpineFixture)
      }),
    )
    return bodies
  }

  it('clicking the LME dot CTA → POST /refresh {"sources":["lme"]} (filtered, not bare)', async () => {
    server.use(http.get('*/readiness', () => HttpResponse.json(withLmeDot)))
    const bodies = captureRefreshBodies()
    renderReadiness()
    const row = await screen.findByRole('button', {
      name: /LME \(base-metal context\)/i,
    })
    await userEvent.click(row)
    await waitFor(() => expect(bodies).toEqual([{ sources: ['lme'] }]))
  })

  it('clicking the News dot CTA → POST /refresh {"sources":["news"]}', async () => {
    server.use(http.get('*/readiness', () => HttpResponse.json(withStaleNews)))
    const bodies = captureRefreshBodies()
    renderReadiness()
    const row = await screen.findByRole('button', { name: /News \(GNews\)/i })
    await userEvent.click(row)
    await waitFor(() => expect(bodies).toEqual([{ sources: ['news'] }]))
  })

  it('the kite dot CTA opens the LOGIN modal — never {"sources":["kite"]} (the backend 400s that)', async () => {
    server.use(http.get('*/readiness', () => HttpResponse.json(withExpiredKite)))
    const bodies = captureRefreshBodies()
    renderReadiness()
    const row = await screen.findByRole('button', {
      name: /Kite \(price\/OI\)/i,
    })
    await userEvent.click(row)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(bodies).toEqual([]) // the filtered /refresh is never called for kite
  })

  it('the standing Refresh CTA opens the SCOPE modal — no immediate fetch until a scope is chosen', async () => {
    const bodies = captureRefreshBodies()
    server.use(http.get('*/readiness', () => HttpResponse.json(allGreenFixture)))
    renderReadiness()
    await userEvent.click(await screen.findByRole('button', { name: /^refresh$/i }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/refresh sources/i)).toBeInTheDocument()
    expect(bodies).toEqual([]) // nothing fetched — the scope isn't chosen yet
  })

  it('choosing "Refresh all" in the modal → BARE POST /refresh with no body', async () => {
    server.use(http.get('*/readiness', () => HttpResponse.json(allGreenFixture)))
    const bodies = captureRefreshBodies()
    renderReadiness()
    await refreshAllViaModal()
    await waitFor(() => expect(bodies).toEqual([null])) // null = no JSON body
  })

  it('a filtered response with SKIPPED legs lands as success — skipped legs are not shown as failed', async () => {
    const filtered = {
      status: 'refreshed',
      guard: 'in_process',
      report: {
        date: '2026-07-22',
        macro: { ok: true, skipped: true, reason: 'not in this refresh' },
        cot: { ok: true, skipped: true, reason: 'not in this refresh' },
        news: { ok: true, count: 18 },
        board: { ok: true, skipped: true, reason: 'not in this refresh' },
        lme: { ok: true, skipped: true, reason: 'not in this refresh' },
        eia: { ok: true, skipped: true, reason: 'not in this refresh' },
        token: { valid: true, ttl_hours: 9.4 },
      },
    }
    server.use(
      http.get('*/readiness', () => HttpResponse.json(withStaleNews)),
      http.post('*/refresh', () => HttpResponse.json(filtered)),
    )
    renderReadiness()
    const row = await screen.findByRole('button', { name: /News \(GNews\)/i })
    await userEvent.click(row)
    expect(await screen.findByText(/data refreshed/i)).toBeInTheDocument()
    // skipped legs are neither a partial failure nor a "did not update"
    expect(screen.queryByText(/partial refresh/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/did not update/i)).not.toBeInTheDocument()
  })
})
