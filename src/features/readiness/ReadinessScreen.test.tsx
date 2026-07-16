import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/test/mocks/server'
import {
  readinessAllAmberFixture,
  readinessColdFixture,
  readinessCriticalAmberFixture,
  readinessFixture,
  refreshAlreadyRunningFixture,
  refreshPartialFixture,
  refreshSpineFixture,
} from '@/test/mocks/fixtures'
import { resetOnLandRefresh } from './on-land'
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

// The on-land guard is module state — reset it so each test lands fresh.
beforeEach(() => resetOnLandRefresh())
afterEach(() => resetOnLandRefresh())

describe('ReadinessScreen — registry-driven, honest, quota-safe', () => {
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

  it('⚠️ all-amber board triggers ZERO refresh calls (the GNews quota test)', async () => {
    let refreshCalls = 0
    server.use(
      http.get('*/readiness', () =>
        HttpResponse.json(readinessAllAmberFixture),
      ),
      http.post('*/refresh', () => {
        refreshCalls += 1
        return HttpResponse.json(refreshSpineFixture)
      }),
    )
    renderReadiness()
    await screen.findByText('Sources')
    // The on-land effect has run by the time the sources render; amber must NOT
    // fire it — a naive rule would exhaust the 100/day quota on every mount.
    expect(refreshCalls).toBe(0)
  })

  it('⚠️ a CRITICAL AMBER source fires EXACTLY ONE refresh + shows a CTA (FIN-170 replay)', async () => {
    // 2026-07-16: USD/INR amber+critical blocked generate with no button, no auto-fix.
    // Now it must auto-refresh on land (exactly once) AND render a Refresh CTA on its row.
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
    // auto-refresh fires — exactly once (the once-guard + single-flight prevent a storm).
    await waitFor(() => expect(refreshCalls).toBe(1))
    // USD/INR's row is present and, because the backend now marks it action:'refresh', it is an
    // actionable CTA in the cockpit (SourcesRail) — asserted directly in SourcesRail.test.tsx.
    expect(screen.getByRole('button', { name: /USD\/INR/i })).toBeInTheDocument()
  })

  it('a partial refresh NAMES the failed source, not a generic failure', async () => {
    // Cold board (red fixable sources) → on-land refresh fires → partial report.
    server.use(
      http.get('*/readiness', () => HttpResponse.json(readinessColdFixture)),
      http.post('*/refresh', () => HttpResponse.json(refreshPartialFixture)),
    )
    renderReadiness()
    expect(await screen.findByText(/partial refresh/i)).toBeInTheDocument()
    expect(screen.getByText(/comex fetch timed out/i)).toBeInTheDocument()
    // COT "skipped" must NOT read as a failure.
    expect(screen.queryByText(/cot failed/i)).not.toBeInTheDocument()
  })

  it('already_running shows a bounded wait keyed on started_at', async () => {
    server.use(
      http.get('*/readiness', () => HttpResponse.json(readinessColdFixture)),
      http.post('*/refresh', () =>
        HttpResponse.json(refreshAlreadyRunningFixture),
      ),
    )
    renderReadiness()
    expect(await screen.findByText(/already running/i)).toBeInTheDocument()
  })

  it('the Kite source CTA opens the refresh modal', async () => {
    // kite red but no fixable-5 red → the kite CTA shows and NO on-land refresh.
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
