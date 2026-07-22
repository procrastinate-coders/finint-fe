import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReadinessSource } from '@/lib/api/contracts'
import { RefreshScopeModal } from './RefreshScopeModal'

function src(
  key: string,
  status: string,
  extra: Partial<ReadinessSource> = {},
): ReadinessSource {
  return {
    key,
    label: key,
    status,
    note: '',
    critical: false,
    human_refreshable: true,
    action: 'refresh',
    blocks_on_red: false,
    ...extra,
  }
}

function renderModal(
  sources: ReadinessSource[],
  over: Partial<Parameters<typeof RefreshScopeModal>[0]> = {},
) {
  const props = {
    sources,
    onClose: vi.fn(),
    onRefreshAll: vi.fn(),
    onRefreshSources: vi.fn(),
    ...over,
  }
  render(<RefreshScopeModal {...props} />)
  return props
}

// comex fresh; USD/INR + News stale; kite + board are NOT /refresh-able.
const SOURCES: ReadinessSource[] = [
  src('comex', 'green', { label: 'COMEX' }),
  src('usdinr', 'amber', { label: 'USD/INR' }),
  src('news', 'red', { label: 'News (GNews)' }),
  src('kite', 'red', { label: 'Kite (price/OI)', action: 'kite_refresh' }),
  src('board', 'red', { label: 'Board', action: null }),
]

describe('RefreshScopeModal — data-driven refresh scope (FIN-192)', () => {
  it('lists ONLY /refresh-able sources — excludes kite (login) and board (backfill)', () => {
    renderModal(SOURCES)
    expect(
      screen.getByRole('button', { name: /refresh COMEX only/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /refresh USD\/INR only/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /refresh News \(GNews\) only/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /refresh Kite.*only/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /refresh Board only/i }),
    ).not.toBeInTheDocument()
  })

  it('recommends refreshing JUST the stale subset (the 2 non-green refreshable keys)', async () => {
    const props = renderModal(SOURCES)
    await userEvent.click(
      screen.getByRole('button', { name: /refresh 2 stale/i }),
    )
    expect(props.onRefreshSources).toHaveBeenCalledWith(['usdinr', 'news'])
    expect(props.onRefreshAll).not.toHaveBeenCalled()
  })

  it('a per-source Refresh fires the filtered refresh for just that key', async () => {
    const props = renderModal(SOURCES)
    await userEvent.click(
      screen.getByRole('button', { name: /refresh USD\/INR only/i }),
    )
    expect(props.onRefreshSources).toHaveBeenCalledWith(['usdinr'])
  })

  it('"Refresh all" fires the BARE full sweep, not a filtered one', async () => {
    const props = renderModal(SOURCES)
    await userEvent.click(screen.getByRole('button', { name: /refresh all/i }))
    expect(props.onRefreshAll).toHaveBeenCalledTimes(1)
    expect(props.onRefreshSources).not.toHaveBeenCalled()
  })

  it('when everything is fresh, there is NO stale CTA and the copy nudges against a needless sweep', () => {
    renderModal([
      src('comex', 'green', { label: 'COMEX' }),
      src('news', 'green', { label: 'News (GNews)' }),
    ])
    expect(
      screen.queryByRole('button', { name: /stale/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/already fresh/i)).toBeInTheDocument()
    // the full sweep is still available, just not encouraged
    expect(
      screen.getByRole('button', { name: /refresh all/i }),
    ).toBeInTheDocument()
  })
})
