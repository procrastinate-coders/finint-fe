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
  const res = await fetch(`${BASE}/auth/refresh`, {
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
    return fetch(`${BASE}${path}`, {
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
