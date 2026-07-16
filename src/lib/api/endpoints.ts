import { z } from 'zod'
import { tokenStore } from '@/lib/auth/session'
import { apiRequest } from './client'
import {
  briefListItem,
  generateResponse,
  generateStatusResponse,
  kiteLoginUrlResponse,
  kiteRefreshResponse,
  loginResponse,
  meResponse,
  readinessResponse,
  refreshSpineResponse,
  servedBrief,
  type BriefListItem,
  type GenerateResponse,
  type GenerateStatusResponse,
  type KiteLoginUrlResponse,
  type KiteRefreshResponse,
  type LoginResponse,
  type ReadinessResponse,
  type RefreshSpineResponse,
  type ServedBrief,
  type User,
} from './contracts'

const briefListResponse = z.array(briefListItem)

// --- auth (FIN-157) ------------------------------------------------------

export async function login(
  email: string,
  password: string,
  remember = true,
): Promise<LoginResponse> {
  const res = await apiRequest('/auth/login', loginResponse, {
    method: 'POST',
    body: { email, password },
    auth: false, // one of the two unauthenticated endpoints
  })
  // Login returns ONLY tokens — the user identity comes from GET /auth/me.
  tokenStore.setSession(
    {
      accessToken: res.access_token,
      expiresAt: res.expires_at,
      refreshToken: res.refresh_token,
    },
    remember,
  )
  return res
}

export async function logout(): Promise<void> {
  const refreshToken = tokenStore.getRefreshToken()
  try {
    // Revoke the refresh token server-side (needs a valid Bearer + the token).
    await apiRequest('/auth/logout', null, {
      method: 'POST',
      body: { refresh_token: refreshToken ?? '' },
    })
  } finally {
    // Clear locally even if the revoke fails — the session is gone here.
    tokenStore.clear()
  }
}

export function getMe(signal?: AbortSignal): Promise<User> {
  return apiRequest('/auth/me', meResponse, { signal })
}

// --- readiness (FIN-160; $0 gate) ----------------------------------------

export function getReadiness(signal?: AbortSignal): Promise<ReadinessResponse> {
  return apiRequest('/readiness', readinessResponse, { signal })
}

// --- spine refresh + kite (FIN-160) --------------------------------------

export function refreshSpine(): Promise<RefreshSpineResponse> {
  return apiRequest('/refresh', refreshSpineResponse, { method: 'POST' })
}

export function getKiteLoginUrl(
  signal?: AbortSignal,
): Promise<KiteLoginUrlResponse> {
  return apiRequest('/kite/login-url', kiteLoginUrlResponse, { signal })
}

export function kiteRefresh(
  requestToken: string,
): Promise<KiteRefreshResponse> {
  return apiRequest('/kite/refresh', kiteRefreshResponse, {
    method: 'POST',
    body: { request_token: requestToken },
  })
}

// --- generate (FIN-161; PAID) --------------------------------------------

// POST returns IMMEDIATELY (~3.7s) and the run continues in the BACKGROUND (~3
// min). NEVER block on it — the response is `{run_id, status:"running", …}` for a
// fresh run, or `{status:"already_complete", brief}` when today's brief exists
// (served from store — $0). Poll getGenerateStatus for the fresh-run progress.
export function generate(): Promise<GenerateResponse> {
  return apiRequest('/generate', generateResponse, { method: 'POST' })
}

export function getGenerateStatus(
  runId: string,
  signal?: AbortSignal,
): Promise<GenerateStatusResponse> {
  return apiRequest(
    `/generate/status?run_id=${encodeURIComponent(runId)}`,
    generateStatusResponse,
    { signal },
  )
}

// --- brief (FIN-162 owns the screen; FIN-161 reads today's for the honesty
// flags at handoff — meta.guard_failed / fabricated_claims) -----------------

export function getBriefToday(signal?: AbortSignal): Promise<ServedBrief> {
  return apiRequest('/brief/today', servedBrief, { signal })
}

export function getBrief(
  date: string,
  signal?: AbortSignal,
): Promise<ServedBrief> {
  return apiRequest(`/brief/${encodeURIComponent(date)}`, servedBrief, {
    signal,
  })
}

export function getBriefs(signal?: AbortSignal): Promise<BriefListItem[]> {
  return apiRequest('/briefs', briefListResponse, { signal })
}
