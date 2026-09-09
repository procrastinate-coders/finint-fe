import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/test/mocks/server'
import { readinessResponse } from '@/lib/api/contracts'
import { getReadiness } from '@/lib/api/endpoints'
import { EvidenceCockpit } from './cockpit/EvidenceCockpit'
import withEvidence from '@/test/fixtures/readiness-with-evidence.json'

/**
 * FIN-237 — the evidence block moved behind `?evidence=true` (21 kB → 3.3 kB),
 * and the cockpit's Board / Macro / News tiles went empty against a response
 * that is still perfectly VALID. Nothing threw; the tiles just had nothing.
 *
 * ⚠️ THE SUITE COULD NOT SEE IT EITHER. The MSW readiness fixture has never
 * carried an `evidence` block, so every existing readiness test was already
 * exercising the degraded path and passing. That is why the tiles could empty in
 * production with the suite green — the same shape as the mock-is-a-claim rule
 * in CONTEXT. The fixture below is the REAL sample from the backend's own
 * `docs/api/samples/readiness.json`.
 */
const H = 'https://apifinint.apextrader.trade'
const full = readinessResponse.parse(withEvidence)

function mountCockpit(data: typeof full) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <EvidenceCockpit data={data} refreshing={false} />
    </QueryClientProvider>,
  )
}

describe('FIN-237 — the FE asks for the evidence it renders', () => {
  it('🔴 sends ?evidence=true when the cockpit needs it', async () => {
    let seen = ''
    server.use(
      http.get(`${H}/readiness`, ({ request }) => {
        seen = new URL(request.url).search
        return HttpResponse.json(withEvidence)
      }),
    )
    await getReadiness(true)
    expect(seen).toBe('?evidence=true')
  })

  it('⚠️ the DEFAULT stays slim — nobody gets 18 kB by accident', async () => {
    // Mirrors the API's own default. On a phone hotspot the evidence block is
    // ~10s of transfer, so asking for it has to be deliberate.
    let seen = 'unset'
    server.use(
      http.get(`${H}/readiness`, ({ request }) => {
        seen = new URL(request.url).search
        return HttpResponse.json(withEvidence)
      }),
    )
    await getReadiness()
    expect(seen).toBe('')
  })

  it('🔴 the tiles RENDER with the evidence present', async () => {
    mountCockpit(full)
    // the board tile's real instruments, from the backend's own sample
    await waitFor(() => expect(screen.getAllByText('GOLD').length).toBeGreaterThan(0))
    expect(screen.getAllByText(/SILVER|COPPER/).length).toBeGreaterThan(0)
  })
})

describe('FIN-237 — the absent-evidence path still degrades honestly', () => {
  // ⚠️ EVERY OTHER CONSUMER OF /readiness NOW GETS THIS BY DEFAULT, so it has to
  // keep working. EvidenceCockpit documents that it degrades; this holds it to it.
  const slim = readinessResponse.parse({ ...withEvidence, evidence: undefined })

  it('renders without evidence instead of throwing', () => {
    expect(() => mountCockpit(slim)).not.toThrow()
  })

  it('still renders the spine it does have', () => {
    mountCockpit(slim)
    // the sources rail and decision bar read the spine, not the evidence
    expect(screen.getAllByText(/Sources/i).length).toBeGreaterThan(0)
  })

  it('shows no fabricated board rows when the board is absent', () => {
    mountCockpit(slim)
    expect(screen.queryByText('GOLD')).toBeNull()
  })
})
