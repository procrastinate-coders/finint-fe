import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ReadinessSource } from '@/lib/api/contracts'
import { SourcesRail } from './SourcesRail'

// FIN-170 "shows a CTA": a source is actionable (a clickable refresh CTA) iff the backend
// marks it with an `action` AND it's not green — registry-driven, never a hardcoded key list
// (law 5). Before FIN-170, USD/INR came back action:null → not actionable → no button, the
// exact 2026-07-16 bug. Board (a backfill, action:null) must stay non-actionable.
function src(extra: Partial<ReadinessSource>): ReadinessSource {
  return {
    key: 'x',
    label: 'X',
    status: 'green',
    note: '',
    critical: false,
    human_refreshable: false,
    action: null,
    blocks_on_red: false,
    ...extra,
  }
}

function renderRail(sources: ReadinessSource[], onAction = vi.fn()) {
  render(
    <SourcesRail sources={sources} hovered={null} onHover={() => {}} onAction={onAction} />,
  )
  return onAction
}

describe('SourcesRail — the refresh CTA is registry-driven (FIN-170)', () => {
  it('a CRITICAL AMBER refreshable source is an actionable row (the CTA)', async () => {
    const onAction = renderRail([
      src({ key: 'usdinr', label: 'USD/INR', status: 'amber', critical: true, human_refreshable: true, action: 'refresh' }),
    ])
    await userEvent.click(screen.getByRole('button', { name: /USD\/INR/i }))
    expect(onAction).toHaveBeenCalledOnce() // clickable → the refresh CTA exists
  })

  it('board red (a backfill, action null) is NOT actionable — no false button', async () => {
    const onAction = renderRail([
      src({ key: 'board', label: 'Board completeness', status: 'red', action: null }),
    ])
    await userEvent.click(screen.getByRole('button', { name: /Board completeness/i }))
    expect(onAction).not.toHaveBeenCalled()
  })

  it('a GREEN refreshable source is NOT actionable — no clutter when fresh', async () => {
    const onAction = renderRail([
      src({ key: 'usdinr', label: 'USD/INR', status: 'green', human_refreshable: true, action: 'refresh' }),
    ])
    await userEvent.click(screen.getByRole('button', { name: /USD\/INR/i }))
    expect(onAction).not.toHaveBeenCalled()
  })
})
