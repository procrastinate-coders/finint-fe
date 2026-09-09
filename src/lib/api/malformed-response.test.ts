import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { server } from '@/test/mocks/server'
import { ApiError, apiRequest, MalformedResponseError, NetworkError } from './client'

/**
 * ⚠️ MSW IS USED HERE, DELIBERATELY — a bad body is a RESPONSE-BODY FACT.
 *
 * The condition under test is "the server answered, and what came back was not
 * the JSON we asked for". That is exactly what MSW models well: a real response,
 * with a real status and real headers, carrying a body we choose. Stubbing
 * `fetch` here would be testing our own stub's `Response` object rather than the
 * path a served response actually takes.
 *
 * The opposite call is made in the sibling `timeout.test.ts`, which bypasses MSW
 * because a hang is a network-layer fact MSW cannot express.
 *
 * ⚠️ CARRIED FORWARD: `HttpResponse.error()` is MSW DECIDING TO FAIL, not the
 * network refusing to exist. It is not a substitute for a rejecting `fetch`, and
 * neither is it what these tests use — every case below is a genuine 2xx/5xx
 * response whose body is wrong.
 */
const H = 'https://apifinint.apextrader.trade'
const anySchema = z.object({}).passthrough()

describe('a body that is not the JSON we asked for is NAMED', () => {
  it('🔴 an nginx HTML error page says so, in one glance', async () => {
    // The realistic one: nginx answers before the app does. A bare SyntaxError
    // ("Unexpected token '<'") tells you nothing; the content-type and the first
    // line tell you it is the proxy.
    server.use(
      http.get(`${H}/readiness`, () =>
        HttpResponse.text(
          '<!DOCTYPE html>\n<html>\n<head><title>502 Bad Gateway</title></head>\n<body>…</body>\n</html>',
          { status: 502, headers: { 'Content-Type': 'text/html' } },
        ),
      ),
    )
    const err = (await apiRequest('/readiness', anySchema, { auth: false }).catch(
      (e: unknown) => e,
    )) as ApiError
    // ⚠️ It stays an ApiError ON PURPOSE — `.status` is what callers branch on
    // (a 404 from /agent-run means "no run landed", a different page from a gate
    // refusal). The name is added to the MESSAGE rather than by changing the
    // type, so nothing that reads `.status` is broken to gain it.
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(502)
    expect(err.message).toMatch(/expected json/i)
    expect(err.message).toContain('text/html')
    expect(err.message).toContain('<!DOCTYPE html>')
    // and NOT the useless status line it used to be
    expect(err.message).not.toBe('Bad Gateway')
  })

  it('⚠️ carries WHAT WAS RECEIVED — status, content-type, and the body’s start', async () => {
    server.use(
      http.get(`${H}/readiness`, () =>
        HttpResponse.text('not json at all', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    )
    const err = (await apiRequest('/readiness', anySchema, { auth: false }).catch(
      (e: unknown) => e,
    )) as MalformedResponseError
    expect(err.status).toBe(200)
    expect(err.contentType).toBe('text/plain')
    expect(err.bodyStart).toBe('not json at all')
    expect(err.path).toBe('/readiness')
  })

  it('truncates a long body rather than dumping it into the message', async () => {
    server.use(
      http.get(`${H}/readiness`, () =>
        HttpResponse.text('x'.repeat(5_000), {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    )
    const err = (await apiRequest('/readiness', anySchema, { auth: false }).catch(
      (e: unknown) => e,
    )) as MalformedResponseError
    expect(err.bodyStart.length).toBeLessThanOrEqual(101)
    expect(err.message.length).toBeLessThan(300)
  })

  it('🔴 an EMPTY 200 body is named, not reported as a syntax error', async () => {
    // A misconfigured proxy, or a 204 mislabelled 200.
    server.use(
      http.get(`${H}/readiness`, () =>
        HttpResponse.text('', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    const err = (await apiRequest('/readiness', anySchema, { auth: false }).catch(
      (e: unknown) => e,
    )) as MalformedResponseError
    expect(err).toBeInstanceOf(MalformedResponseError)
    expect(err.message).toMatch(/empty/i)
    expect(err.bodyStart).toBe('')
  })

  it('⚠️ is NOT a NetworkError — the server answered, it just answered wrongly', async () => {
    server.use(
      http.get(`${H}/readiness`, () =>
        HttpResponse.text('{oops', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    const err = await apiRequest('/readiness', anySchema, { auth: false }).catch(
      (e: unknown) => e,
    )
    expect(err).toBeInstanceOf(MalformedResponseError)
    expect(err).not.toBeInstanceOf(NetworkError)
    // and never the bare SyntaxError that told nobody anything
    expect((err as Error).name).not.toBe('SyntaxError')
  })

  it('a well-formed JSON body still parses normally', async () => {
    server.use(
      http.get(`${H}/readiness`, () => HttpResponse.json({ hello: 'world' })),
    )
    await expect(
      apiRequest('/readiness', anySchema, { auth: false }),
    ).resolves.toEqual({ hello: 'world' })
  })

  it('a 204 with no body is still fine — nothing was asked of it', async () => {
    server.use(
      http.post(`${H}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
    )
    await expect(
      apiRequest('/auth/logout', null, { method: 'POST', auth: false }),
    ).resolves.toBeUndefined()
  })
})
