import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Route as RootRoute } from '@/routes/__root'
import { ApiError, NetworkError, TimeoutError } from '@/lib/api/client'
import { RootErrorScreen } from './RootErrorScreen'

/**
 * ⚠️ THE DEFAULT BOUNDARY WAS THE BUG. TanStack Router renders
 * "Something went wrong!" with the cause behind a "Hide Error" toggle when no
 * errorComponent is registered — which is exactly what a dead resolver looked
 * like on every route on 2026-09-09.
 */
describe('the root error screen names what went wrong', () => {
  it('🔴 __root registers an errorComponent at all', () => {
    expect(RootRoute.options.errorComponent).toBeTruthy()
  })

  it('an unreachable API says so, in those words', () => {
    render(<RootErrorScreen error={new NetworkError(new TypeError('Failed to fetch'))} />)
    expect(
      screen.getByRole('heading', { name: /cannot reach the api/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/never reached the server/i)).toBeInTheDocument()
    // the browser's OWN words are shown, not a restatement of the headline
    expect(screen.getByText('Failed to fetch')).toBeVisible()
    // and does NOT imply a sign-out or a fault in the data
    expect(document.body.textContent).not.toMatch(/Something went wrong/i)
    expect(document.body.textContent).toMatch(/not a sign-out/i)
  })

  it('an API error names its status', () => {
    render(<RootErrorScreen error={new ApiError(503, 'upstream unavailable')} />)
    expect(screen.getByText(/the api returned 503/i)).toBeInTheDocument()
  })

  it('⚠️ ALWAYS shows the cause — never behind a toggle', () => {
    render(<RootErrorScreen error={new Error('a very specific failure')} />)
    // visible immediately, with no interaction
    expect(screen.getByText('a very specific failure')).toBeVisible()
    expect(screen.queryByText(/hide error|show error/i)).toBeNull()
  })

  it('a non-Error throw still gets named rather than swallowed', () => {
    render(<RootErrorScreen error={'a bare string'} />)
    expect(screen.getByText('a bare string')).toBeVisible()
  })

  it('⚠️ a TIMEOUT reads differently from an unreachable API', () => {
    render(<RootErrorScreen error={new TimeoutError('/readiness', 9000)} />)
    expect(
      screen.getByRole('heading', { name: /taking too long/i }),
    ).toBeInTheDocument()
    // it points at the SERVER, not at this machine's connection
    expect(screen.getByText(/up but struggling/i)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/cannot reach the api/i)
    expect(document.body.textContent).not.toMatch(/never reached the server/i)
  })
})
