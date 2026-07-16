import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressSteps } from './ProgressSteps'

describe('ProgressSteps — the 4 steps, consistent with status (FIN-164)', () => {
  it('renders all 4 steps in canonical order regardless of array order', () => {
    render(
      <ProgressSteps
        steps={[
          { key: 'write', state: 'pending' },
          { key: 'fetch', state: 'done' },
        ]}
      />,
    )
    const items = screen.getAllByRole('listitem').map((li) => li.textContent)
    expect(items[0]).toContain('Fetch sources')
    expect(items[1]).toContain('Scan the board')
    expect(items[2]).toContain('Read overnight news')
    expect(items[3]).toContain('Write the brief')
  })

  it('a mid-run status shows EXACTLY one running spinner', () => {
    render(
      <ProgressSteps
        steps={[
          { key: 'fetch', state: 'done' },
          { key: 'scan', state: 'done' },
          { key: 'news', state: 'running' },
          { key: 'write', state: 'pending' },
        ]}
      />,
    )
    expect(screen.getAllByLabelText('running')).toHaveLength(1)
  })

  it('a terminal DONE run shows NO spinner — every step is done (no eternal spinner)', () => {
    render(
      <ProgressSteps
        steps={[
          { key: 'fetch', state: 'done' },
          { key: 'scan', state: 'done' },
          { key: 'news', state: 'done' },
          { key: 'write', state: 'done' },
        ]}
      />,
    )
    expect(screen.queryByLabelText('running')).not.toBeInTheDocument()
    expect(screen.getAllByLabelText('done')).toHaveLength(4)
  })

  it('a terminal ERROR run shows the failed step, not a forever-spinner', () => {
    render(
      <ProgressSteps
        steps={[
          { key: 'fetch', state: 'done' },
          { key: 'scan', state: 'done' },
          { key: 'news', state: 'done' },
          { key: 'write', state: 'error' },
        ]}
      />,
    )
    expect(screen.queryByLabelText('running')).not.toBeInTheDocument()
    expect(screen.getByLabelText('failed')).toBeInTheDocument()
  })
})
