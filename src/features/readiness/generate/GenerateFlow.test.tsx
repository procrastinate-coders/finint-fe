import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/test/mocks/server'
import {
  generateAlreadyCompleteFixture,
  generateRunFixture,
  generateRunPositioningOnlyFixture,
  generateStatusDoneFixture,
  generateStatusErrorFixture,
  generateStatusRunningFixture,
  briefTodayDegradedFixture,
} from '@/test/mocks/fixtures'
import { GenerateFlow } from './GenerateFlow'

function renderFlow(positioningOnly = false) {
  const onClose = vi.fn()
  const onViewBrief = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <GenerateFlow
        positioningOnly={positioningOnly}
        onClose={onClose}
        onViewBrief={onViewBrief}
      />
    </QueryClientProvider>,
  )
  return { onClose, onViewBrief }
}

beforeEach(() => {
  // Default: a fresh run that immediately reports done (terminal on first poll).
  server.use(
    http.post('*/generate', () => HttpResponse.json(generateRunFixture)),
    http.get('*/generate/status', () =>
      HttpResponse.json(generateStatusDoneFixture),
    ),
    http.get('*/brief/today', () =>
      HttpResponse.json(briefTodayDegradedFixture),
    ),
  )
})
afterEach(() => server.resetHandlers())

describe('GenerateFlow — it costs money; frame honestly, never hide a degraded run', () => {
  it('CONFIRM states the real cost before any spend (law 1)', () => {
    renderFlow()
    expect(
      screen.getByRole('button', { name: /generate · \$0\.11/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/costs money/i)).toBeInTheDocument()
  })

  it('CONFIRM names a positioning-only run with dignity, not as a warning', () => {
    renderFlow(true)
    expect(screen.getByText(/positioning-only/i)).toBeInTheDocument()
  })

  it('RUNNING renders the 4 real steps with the live detail', async () => {
    server.use(
      http.get('*/generate/status', () =>
        HttpResponse.json(generateStatusRunningFixture),
      ),
    )
    renderFlow()
    await userEvent.click(screen.getByRole('button', { name: /generate/i }))
    expect(await screen.findByText('Fetch sources')).toBeInTheDocument()
    expect(screen.getByText('Scan the board')).toBeInTheDocument()
    expect(screen.getByText('Read overnight news')).toBeInTheDocument()
    expect(screen.getByText('Write the brief')).toBeInTheDocument()
    // the API's live detail is shown verbatim
    expect(screen.getByText(/9 instruments/)).toBeInTheDocument()
  })

  it('COMPLETE flags a DEGRADED brief BEFORE handoff, then View brief routes (law 2/4)', async () => {
    const { onViewBrief } = renderFlow()
    await userEvent.click(screen.getByRole('button', { name: /generate/i }))
    // reaches the terminal complete state — no eternal spinner
    expect(await screen.findByText('Brief ready')).toBeInTheDocument()
    expect(screen.queryByLabelText('running')).not.toBeInTheDocument()
    // the degraded flag is visible, and NAMES the withheld instrument
    expect(await screen.findByText(/degraded/i)).toBeInTheDocument()
    expect(screen.getByText(/GOLD/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /view brief/i }))
    expect(onViewBrief).toHaveBeenCalledOnce()
  })

  it('ERROR names what failed via `reason` AND shows the real cost (a failed run still spent)', async () => {
    server.use(
      http.get('*/generate/status', () =>
        HttpResponse.json(generateStatusErrorFixture),
      ),
    )
    renderFlow()
    await userEvent.click(screen.getByRole('button', { name: /generate/i }))
    expect(await screen.findByText(/trade language/i)).toBeInTheDocument()
    expect(screen.getByText(/buy signal/i)).toBeInTheDocument()
    // real cost on the failure — never a run that shows no cost
    expect(screen.getByText(/\$0\.11/)).toBeInTheDocument()
  })

  it('ALREADY-COMPLETE ($0) is handled gracefully + still flags the degraded brief', async () => {
    server.use(
      http.post('*/generate', () =>
        HttpResponse.json(generateAlreadyCompleteFixture),
      ),
    )
    renderFlow()
    await userEvent.click(screen.getByRole('button', { name: /generate/i }))
    expect(await screen.findByText(/served from store/i)).toBeInTheDocument()
    expect(screen.getByText(/degraded/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /view brief/i }),
    ).toBeInTheDocument()
  })

  it('409 fail-closed shows the reason verbatim, never a generic failure', async () => {
    server.use(
      http.post('*/generate', () =>
        HttpResponse.json(
          { detail: 'COMEX is red — hard-critical source unavailable' },
          { status: 409 },
        ),
      ),
    )
    renderFlow()
    await userEvent.click(screen.getByRole('button', { name: /generate/i }))
    expect(
      await screen.findByText(/COMEX is red — hard-critical/i),
    ).toBeInTheDocument()
  })

  it('a positioning-only fresh run keeps the honest label through completion', async () => {
    server.use(
      http.post('*/generate', () =>
        HttpResponse.json(generateRunPositioningOnlyFixture),
      ),
      http.get('*/generate/status', () =>
        HttpResponse.json(generateStatusDoneFixture),
      ),
    )
    renderFlow(false) // the RUN says positioning_only, not the readiness prop
    await userEvent.click(screen.getByRole('button', { name: /generate/i }))
    expect(await screen.findByText('Brief ready')).toBeInTheDocument()
    expect(screen.getByText(/positioning-only/i)).toBeInTheDocument()
  })
})
