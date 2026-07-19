import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/test/mocks/server'
import {
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

  it('the standing Refresh CTA is PRESENT and ENABLED even when every source is green', async () => {
    server.use(http.get('*/readiness', () => HttpResponse.json(allGreenFixture)))
    renderReadiness()
    const btn = await screen.findByRole('button', { name: /^refresh$/i })
    expect(btn).toBeEnabled()
  })

  it('clicking Refresh fires EXACTLY ONE /refresh; a second click while in-flight does not double-fire', async () => {
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
    const btn = await screen.findByRole('button', { name: /^refresh$/i })
    await user.click(btn)
    await waitFor(() => expect(refreshCalls).toBe(1))
    // in-flight → the CTA disables itself, so the FE cannot fire a second /refresh
    expect(btn).toBeDisabled()
    await user.click(btn)
    expect(refreshCalls).toBe(1)
  })

  it('clicking Refresh surfaces a PARTIAL report that NAMES the failed source, not a generic failure', async () => {
    server.use(
      http.get('*/readiness', () => HttpResponse.json(readinessColdFixture)),
      http.post('*/refresh', () => HttpResponse.json(refreshPartialFixture)),
    )
    renderReadiness()
    const btn = await screen.findByRole('button', { name: /^refresh$/i })
    await userEvent.click(btn)
    expect(await screen.findByText(/partial refresh/i)).toBeInTheDocument()
    expect(screen.getByText(/comex fetch timed out/i)).toBeInTheDocument()
    // COT "skipped" must NOT read as a failure.
    expect(screen.queryByText(/cot failed/i)).not.toBeInTheDocument()
  })

  it('clicking Refresh, then already_running, shows a bounded wait keyed on started_at', async () => {
    server.use(
      http.get('*/readiness', () => HttpResponse.json(readinessColdFixture)),
      http.post('*/refresh', () =>
        HttpResponse.json(refreshAlreadyRunningFixture),
      ),
    )
    renderReadiness()
    const btn = await screen.findByRole('button', { name: /^refresh$/i })
    await userEvent.click(btn)
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
