import type { z } from 'zod'
import { tokenStore } from '@/lib/auth/session'
import {
  apiErrorBody,
  messageFromErrorBody,
  refreshResponse,
  type ApiErrorBody,
} from './contracts'

// FININT lives on its OWN host with BARE paths (no /api prefix — nothing to
// collide with). No trailing slash.
const BASE = (
  import.meta.env.VITE_FININT_API_BASE_URL ??
  'https://apifinint.apextrader.trade'
).replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly body: ApiErrorBody | null
  constructor(
    status: number,
    message: string,
    body: ApiErrorBody | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/**
 * ⚠️ THE API COULD NOT BE REACHED AT ALL — no response, no status, no server
 * opinion. This is NOT an auth failure and must never be reported as one: a dead
 * resolver, an offline laptop and a down box all land here, and telling someone
 * their session expired sends them to re-type a password that was never wrong,
 * against a server that cannot hear them.
 *
 * On 2026-09-09 this was a raw `TypeError: Failed to fetch` escaping the auth
 * bootstrap; nothing caught it and every route rendered a generic boundary.
 * Naming it is what lets each layer decide honestly what to say.
 */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super('Cannot reach the API')
    this.name = 'NetworkError'
    this.cause = cause
  }
}

/**
 * ⚠️ THE SERVER ANSWERED, AND ANSWERED TOO SLOWLY — a different fact from being
 * unreachable, and it must read differently. Unreachable means nothing replied;
 * this means the box accepted the connection and is struggling. On a 2GB
 * t3.small that has been OOM-killed and has had a lock-exhaustion incident, that
 * is the realistic failure, and before this it had NO failure mode at all: the
 * query hung forever and the skeleton never resolved.
 */
export class TimeoutError extends Error {
  readonly timeoutMs: number
  readonly path: string
  constructor(path: string, timeoutMs: number) {
    super(`The server is taking too long — ${path} did not answer within ${timeoutMs}ms`)
    this.name = 'TimeoutError'
    this.path = path
    this.timeoutMs = timeoutMs
  }
}

/**
 * ⚠️ THE SERVER ANSWERED WITH SOMETHING THAT IS NOT THE JSON WE ASKED FOR.
 *
 * A malformed body, an empty 200, or an nginx HTML 502 all reject inside
 * `res.json()` BEFORE zod ever sees them, and used to escape as a bare
 * `SyntaxError: Unexpected token '<'` — which names neither the endpoint, the
 * status, nor the fact that a proxy answered instead of the app.
 *
 * So it carries WHAT WAS ACTUALLY RECEIVED. "Expected JSON, got text/html (502):
 * <!DOCTYPE html…" identifies nginx in one glance; the SyntaxError identified
 * nothing.
 */
export class MalformedResponseError extends Error {
  readonly path: string
  readonly status: number
  readonly contentType: string
  readonly bodyStart: string
  constructor(
    path: string,
    status: number,
    contentType: string,
    bodyStart: string,
    cause?: unknown,
  ) {
    super(
      bodyStart === ''
        ? `Expected JSON from ${path}, got an empty body (${status}, ${contentType || 'no content-type'})`
        : `Expected JSON from ${path}, got ${contentType || 'no content-type'} (${status}): ${bodyStart}`,
    )
    this.name = 'MalformedResponseError'
    this.path = path
    this.status = status
    this.contentType = contentType
    this.bodyStart = bodyStart
    this.cause = cause
  }
}

/** Enough of the body to recognise WHAT answered, not enough to bury the message. */
const BODY_SAMPLE_CHARS = 100

/**
 * Read a response body as JSON, naming what came back when it is not JSON.
 *
 * ⚠️ `res.text()` FIRST, then `JSON.parse` — not `res.json()`. The body can only
 * be consumed once, and `res.json()` consumes it while telling us nothing about
 * what it consumed. Reading the text keeps the evidence.
 */
async function parseJsonBody(res: Response, path: string): Promise<unknown> {
  const contentType = res.headers.get('content-type') ?? ''
  let text: string
  try {
    text = await res.text()
  } catch (cause) {
    throw new MalformedResponseError(path, res.status, contentType, '', cause)
  }
  const sample = text.slice(0, BODY_SAMPLE_CHARS)
  if (text.trim() === '') {
    throw new MalformedResponseError(path, res.status, contentType, '')
  }
  try {
    return JSON.parse(text) as unknown
  } catch (cause) {
    throw new MalformedResponseError(path, res.status, contentType, sample, cause)
  }
}

// === TIMEOUTS — DERIVED, NOT PICKED ======================================
//
// ⚠️ A TIMEOUT TUNED TO A BENCHMARK GOES STALE THE MOMENT THE BENCHMARK DOES, so
// both budgets below are EXPRESSIONS over constants that already exist and
// already mean something. Change the retry policy or the staleTime and these
// move with them.

/**
 * How long ONE attempt at a normal read may take.
 *
 * ⚠️ THE PREMISE WAS WRONG AND IT TOOK THE APP DOWN (2026-09-09). The first
 * version budgeted the WHOLE RETRY SEQUENCE inside `staleTime`:
 * `(30_000 − 3_000) / 3 attempts` = 9s per attempt. Then a real morning arrived —
 * `/readiness` is 18,250 bytes and took **10.49s** over a phone hotspot, under 1s
 * from the EC2 box itself — and the client cancelled at 9s a request that needed
 * 10.5s. Every data endpoint died; only `/auth/*` survived, because those
 * responses are 0.4–0.5 kB. The formula was sound; the assumption underneath it
 * was not.
 *
 * ⚠️ `staleTime` IS NOT A DEADLINE FOR ACQUIRING A VALUE. It says how long a
 * value we already HOLD stays worth keeping. Retries are recovery from failure,
 * not part of the cost of one successful fetch, and charging them against the
 * freshness window forced a per-attempt budget smaller than a single response.
 *
 * ⚠️ THE CORRECTED PREMISE, applied at the right granularity: ONE attempt must
 * finish inside the window in which its result would still be considered fresh.
 * A fetch that takes longer than `staleTime` lands on a value the app already
 * wants to refetch — it never gets ahead. That is a real statement about this
 * codebase's own constant, it still scales when the constant moves, and it is
 * NOT a number anybody chose.
 *
 * ⚠️ AND A STALE-BUT-ARRIVED VALUE BEATS A FRESH-BUT-CANCELLED ONE. Cancelling at
 * 9s gave the reader NOTHING, which is strictly worse than a read that lands a
 * few seconds past its freshness window.
 */
export function deriveReadTimeoutMs({ staleTimeMs }: { staleTimeMs: number }): number {
  return staleTimeMs
}

/** One attempt, one freshness window: 30s. ~2.9x the 10.49s measured today. */
export const READ_TIMEOUT_MS = deriveReadTimeoutMs({ staleTimeMs: 30_000 })

/**
 * What the reader actually waits before a hang is named.
 *
 * ⚠️ THE RETRY POLICY STILL MULTIPLIES THE BUDGET — that part of the original
 * reasoning was right, and raising the per-attempt budget made it worse, not
 * better. Left unhandled this would be 3 x 30s + 3s = 93s of skeleton before the
 * error screen. So `lib/query/client.ts` does NOT retry a TimeoutError: if one
 * attempt exhausted the whole freshness window, two more will too, and they buy
 * 60 further seconds to learn nothing. Worst case is one attempt.
 */
export function deriveWorstCaseWaitMs({
  perAttemptMs,
  attempts,
  backoffMs,
}: {
  perAttemptMs: number
  attempts: number
  backoffMs: number
}): number {
  return perAttemptMs * attempts + backoffMs
}

/**
 * How long POST /refresh may take.
 *
 * ⚠️ THE READ BUDGET WOULD KILL A LEGITIMATE REFRESH. A spine refresh runs 10
 * news queries server-side and takes ~30s of real work; giving up at 9s would
 * report a failure for work that is still running and about to succeed — the
 * fabrication this whole codebase exists to avoid, in a new place.
 *
 * So it mirrors the BACKEND's own derivation for the same operation:
 * `_derive_refresh_lock_ttl` = (queries × 2s + 10s) × 3. The FE gives up exactly
 * when the backend's own single-flight guard would, and scales with the query
 * count for the same reason the backend does (30s was tuned to a 3-query runtime
 * and went stale when the set grew).
 */
export function deriveRefreshTimeoutMs(queries: number): number {
  return (queries * 2_000 + 10_000) * 3
}

/** 9 mains + 1 macro = 10 queries per refresh (see the backend's budget math). */
export const REFRESH_TIMEOUT_MS = deriveRefreshTimeoutMs(10)

/**
 * `fetch`, with a rejection turned into a NAMED failure.
 *
 * ⚠️ AN ABORT IS NOT AN OUTAGE. React Query aborts in-flight requests on unmount
 * and on refetch, so an AbortError passes through untouched — dressing an
 * ordinary navigation up as "cannot reach the API" would cry outage several
 * times a session and teach the reader to ignore the message that matters.
 */
async function netFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch (cause) {
    // ⚠️ NOT `instanceof Error`. An abort arrives as a DOMException, which does
    // not extend Error in every runtime (it does not in jsdom) — so an
    // instanceof check silently reclassifies every cancelled request as an
    // outage. Match on the name, which is what the spec actually guarantees.
    if ((cause as { name?: string } | null)?.name === 'AbortError') throw cause
    throw new NetworkError(cause)
  }
}

// Called when the session is terminally unauthenticated (refresh failed/absent).
// The app wires this to router navigation toward /login.
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn
}

/**
 * ⚠️ A FAILED RESPONSE STAYS AN ApiError, ALWAYS — even when its body is HTML.
 * `ApiError.status` is what callers branch on (a 404 from /agent-run means "no
 * run landed", which is a different PAGE from a gate refusal), so turning an
 * nginx 502 into a MalformedResponseError would break that reading to gain a
 * name we can add to the message instead.
 *
 * So the status is preserved and the EVIDENCE is folded into the message: a bare
 * "Bad Gateway" does not say that nginx answered instead of the app, and
 * "Expected JSON, got text/html: <!DOCTYPE html…" does, in one glance.
 */
async function toApiError(res: Response, path: string): Promise<ApiError> {
  const contentType = res.headers.get('content-type') ?? ''
  let text = ''
  try {
    text = await res.text()
  } catch {
    /* body unreadable — fall through to the status line */
  }
  if (text.trim() !== '') {
    try {
      const parsed = apiErrorBody.safeParse(JSON.parse(text))
      if (parsed.success) {
        return new ApiError(
          res.status,
          messageFromErrorBody(parsed.data) ?? res.statusText ?? 'request failed',
          parsed.data,
        )
      }
    } catch {
      /* not JSON at all — say what it was */
    }
    return new ApiError(
      res.status,
      `Expected JSON from ${path}, got ${contentType || 'no content-type'} (${res.status}): ${text.slice(0, BODY_SAMPLE_CHARS)}`,
    )
  }
  return new ApiError(res.status, res.statusText || 'request failed')
}

// === SINGLE-FLIGHT REFRESH (CLAUDE.md law 13 — the trap) ==================
// Two concurrent 401s (a readiness poll + a brief fetch) MUST produce exactly
// ONE POST /auth/refresh, not two racing calls that clobber each other's tokens.
// One owner of the refresh promise. Do not reinvent this.
let refreshInFlight: Promise<string | null> | null = null

async function doRefresh(): Promise<string | null> {
  const refreshToken = tokenStore.getRefreshToken()
  if (!refreshToken) return null
  // ⚠️ A THROW HERE MEANS UNREACHABLE and propagates as NetworkError — the
  // session is NOT cleared. Only a server that ANSWERED and refused the token
  // clears it; wiping a good refresh token because the wifi dropped would log
  // Father out of a system he never left.
  const res = await netFetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!res.ok) {
    tokenStore.clear()
    return null
  }
  const data = refreshResponse.parse(await res.json())
  tokenStore.setAccessToken(data.access_token, data.expires_at)
  return data.access_token
}

export function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= doRefresh().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

/**
 * Ensure we hold a usable access token, minting one from the refresh token if
 * needed. Used by the `_authenticated` route guard so a hard reload rehydrates
 * BEFORE the shell renders (the access token is memory-only, so every reload
 * mints a fresh one via /auth/refresh — that is correct, not a bug). Returns
 * false when there is no session to restore → the guard sends you to /login.
 */
export type AccessResult =
  | { ok: true }
  /** No refresh token on this device — nobody has signed in here. */
  | { ok: false; reason: 'no-session' }
  /** The server ANSWERED and refused the token. The session is over. */
  | { ok: false; reason: 'rejected' }
  /** No answer at all. The session may be perfectly good; we cannot tell. */
  | { ok: false; reason: 'unreachable' }

/**
 * The gate, with its REASON — because the three ways in are three different
 * facts and the screen must be able to say which one happened.
 *
 * ⚠️ IT DOES NOT THROW ON A DEAD NETWORK. That throw is what took the app down:
 * it escaped into `_authenticated.beforeLoad`, no route caught it, and every
 * route including root rendered TanStack Router's default error boundary. An
 * unreachable API degrades to the login screen; it does not kill the app.
 */
export async function checkAccess(): Promise<AccessResult> {
  if (tokenStore.getAccessToken()) return { ok: true }
  if (!tokenStore.getRefreshToken()) return { ok: false, reason: 'no-session' }
  try {
    return (await refreshAccessToken())
      ? { ok: true }
      : { ok: false, reason: 'rejected' }
  } catch (err) {
    if (err instanceof NetworkError) return { ok: false, reason: 'unreachable' }
    // An abort, or anything genuinely unexpected, stays itself.
    throw err
  }
}

/** The boolean form, for callers that only need "may I render this?". */
export async function ensureAccessToken(): Promise<boolean> {
  return (await checkAccess()).ok
}

interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean // default true
  signal?: AbortSignal
  /** Per-attempt budget. Defaults to READ_TIMEOUT_MS; /refresh passes its own. */
  timeoutMs?: number
}

/**
 * Make a request and Zod-parse the JSON body with `schema` (pass null for a
 * 204/no body). Bearer-authed by default. On a 401 against an authed request,
 * refresh once (single-flight) and retry ONCE; on terminal auth failure, clear
 * the session and notify the app (→ /login). `auth: false` opts out (used by
 * /auth/login and /auth/refresh, the only unauthenticated endpoints).
 */
export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T> | null,
  opts: RequestOptions = {},
): Promise<T> {
  const auth = opts.auth ?? true
  const timeoutMs = opts.timeoutMs ?? READ_TIMEOUT_MS

  /**
   * One attempt, with its own clock.
   *
   * ⚠️ THE BUDGET IS PER ATTEMPT, not per call — the 401 path below sends twice,
   * and a shared clock would give the retry whatever the first attempt left over.
   *
   * ⚠️ A TIMEOUT AND A CALLER'S ABORT BOTH SURFACE AS AbortError, so the two are
   * told apart by `timedOut`, set only by our own timer. React Query cancelling a
   * query on unmount must stay a cancellation; reporting it as "the server is
   * taking too long" would blame the backend for ordinary navigation.
   */
  const send = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {}
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
    if (token) headers.Authorization = `Bearer ${token}`

    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)
    const onCallerAbort = () => controller.abort()
    opts.signal?.addEventListener('abort', onCallerAbort, { once: true })

    try {
      return await netFetch(`${BASE}${path}`, {
        method: opts.method ?? 'GET',
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      })
    } catch (err) {
      if (timedOut) throw new TimeoutError(path, timeoutMs)
      throw err
    } finally {
      // ⚠️ ALWAYS clear it: a leaked timer fires later and aborts an unrelated
      // request, which would look like a random intermittent failure.
      clearTimeout(timer)
      opts.signal?.removeEventListener('abort', onCallerAbort)
    }
  }

  let res = await send(auth ? tokenStore.getAccessToken() : null)

  if (res.status === 401 && auth) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      res = await send(newToken)
    }
    if (res.status === 401) {
      tokenStore.clear()
      onUnauthorized?.()
      throw await toApiError(res, path)
    }
  }

  if (!res.ok) throw await toApiError(res, path)
  if (res.status === 204 || schema === null) return undefined as T
  // ⚠️ NOT res.json(): a bad body must name what it actually was (law 1 applied
  // to our own errors — "SyntaxError: Unexpected token '<'" tells nobody that
  // nginx answered instead of the app).
  return schema.parse(await parseJsonBody(res, path))
}
