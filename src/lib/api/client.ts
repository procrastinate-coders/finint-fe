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

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const parsed = apiErrorBody.safeParse(await res.json())
    if (parsed.success) {
      return new ApiError(
        res.status,
        messageFromErrorBody(parsed.data) ?? res.statusText ?? 'request failed',
        parsed.data,
      )
    }
  } catch {
    /* non-JSON body */
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
  const send = (token: string | null) => {
    const headers: Record<string, string> = {}
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
    if (token) headers.Authorization = `Bearer ${token}`
    return netFetch(`${BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    })
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
      throw await toApiError(res)
    }
  }

  if (!res.ok) throw await toApiError(res)
  if (res.status === 204 || schema === null) return undefined as T
  return schema.parse(await res.json())
}
