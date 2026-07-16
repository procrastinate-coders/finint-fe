import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
