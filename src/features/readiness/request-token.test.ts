import { describe, expect, it } from 'vitest'
import { extractRequestToken } from './request-token'

describe('extractRequestToken — accept the bare token OR the pasted URL bar', () => {
  it('returns a bare token as-is', () => {
    expect(extractRequestToken('AbC12Xy')).toBe('AbC12Xy')
    expect(extractRequestToken('  AbC12Xy  ')).toBe('AbC12Xy')
  })

  it('pulls the token out of the (broken) redirect URL Father pastes', () => {
    expect(
      extractRequestToken(
        'http://localhost:8080?status=success&request_token=AbC12Xy&action=login',
      ),
    ).toBe('AbC12Xy')
  })

  it('handles a "request_token=…" fragment', () => {
    expect(extractRequestToken('request_token=AbC12Xy')).toBe('AbC12Xy')
  })

  it('returns empty for empty input', () => {
    expect(extractRequestToken('')).toBe('')
    expect(extractRequestToken('   ')).toBe('')
  })
})
