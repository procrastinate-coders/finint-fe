import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReadinessBrief, ReadinessSource } from '@/lib/api/contracts'
import { DecisionBar } from './DecisionBar'

const sources: ReadinessSource[] = [
  {
    key: 'kite',
    label: 'Kite (price/OI)',
    status: 'green',
    note: 'Fresh',
    critical: true,
    human_refreshable: true,
    action: 'kite_refresh',
    blocks_on_red: false,
  },
]

function renderBar(
  brief: ReadinessBrief | null,
  over: Partial<Parameters<typeof DecisionBar>[0]> = {},
) {
  render(
    <DecisionBar
      brief={brief}
      canGenerate={true}
      blockedReason={null}
      positioningOnly={false}
      freshCount="8/8"
      sources={sources}
      onViewBrief={vi.fn()}
      onGenerate={vi.fn()}
      onRefreshKite={vi.fn()}
      {...over}
    />,
  )
}

const complete: ReadinessBrief = {
  exists: true,
  date: '2026-07-16',
  generated_at: '2026-07-16T14:04:08Z',
  is_complete: true,
  guard_failed: false,
  positioning_only: false,
}
const incomplete: ReadinessBrief = {
  ...complete,
  is_complete: false,
  positioning_only: true,
}

describe('DecisionBar — the CTA matrix (FIN-172)', () => {
  it('COMPLETE brief → View brief, and NO Generate ($0 to open, never a false $0.12)', () => {
    renderBar(complete)
    expect(screen.getByRole('button', { name: /view brief/i })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /generate/i }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/\$0\.12/)).not.toBeInTheDocument()
    expect(screen.getByText(/\$0 to open/i)).toBeInTheDocument()
  })

  it('INCOMPLETE brief → BOTH View brief AND re-generate at the honest ~$0.12', () => {
    renderBar(incomplete)
    expect(screen.getByRole('button', { name: /view brief/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /re-generate.*\$0\.12/i }),
    ).toBeInTheDocument()
  })

  it('NO brief → Generate only, no View brief (the original readiness gate)', () => {
    renderBar(null)
    expect(
      screen.queryByRole('button', { name: /view brief/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^generate$/i })).toBeInTheDocument()
  })

  it('a brief block with exists:false reads as no brief', () => {
    renderBar({ ...complete, exists: false })
    expect(
      screen.queryByRole('button', { name: /view brief/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^generate$/i })).toBeInTheDocument()
  })

  it('a DEGRADED brief STILL flags degraded — never hidden behind a clean CTA (law 2/4)', () => {
    renderBar({ ...complete, guard_failed: true })
    expect(screen.getByText(/degraded/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view brief/i })).toBeInTheDocument()
  })
})

describe('DecisionBar — the manual Refresh CTA rides with generate (FIN-174)', () => {
  it('is present while there is NO brief or an INCOMPLETE one (freshen inputs before (re)generate)', () => {
    for (const brief of [null, incomplete]) {
      const { unmount } = render(
        <DecisionBar
          brief={brief}
          canGenerate
          blockedReason={null}
          positioningOnly={false}
          freshCount="8/8"
          sources={sources}
          onRefresh={vi.fn()}
        />,
      )
      expect(
        screen.getByRole('button', { name: /^refresh$/i }),
      ).toBeInTheDocument()
      unmount()
    }
  })

  it('is HIDDEN once a COMPLETE brief exists — the read is final, View brief is the only action', () => {
    renderBar(complete, { onRefresh: vi.fn() })
    expect(
      screen.queryByRole('button', { name: /^refresh$/i }),
    ).not.toBeInTheDocument()
    // the complete-brief CTA is still there — we removed a dead-end, not the surface
    expect(
      screen.getByRole('button', { name: /view brief/i }),
    ).toBeInTheDocument()
  })

  it('calls onRefresh when clicked, and is enabled with all sources green (no-brief gate)', async () => {
    const onRefresh = vi.fn()
    renderBar(null, { onRefresh })
    const btn = screen.getByRole('button', { name: /^refresh$/i })
    expect(btn).toBeEnabled()
    await userEvent.click(btn)
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('is disabled + relabelled while a refresh is in flight (no FE double-fire)', () => {
    renderBar(null, { refreshing: true })
    const btn = screen.getByRole('button', { name: /refreshing/i })
    expect(btn).toBeDisabled()
    // the idle label is gone — the same control is now the busy state
    expect(
      screen.queryByRole('button', { name: /^refresh$/i }),
    ).not.toBeInTheDocument()
  })
})
