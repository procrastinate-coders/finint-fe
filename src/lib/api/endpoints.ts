import { z } from 'zod'
import { tokenStore } from '@/lib/auth/session'
import { apiRequest, REFRESH_TIMEOUT_MS } from './client'
import {
  agentRunResponse,
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
  type AgentRunResponse,
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

/**
 * The readiness gate. ⚠️ `evidence` IS OFF BY DEFAULT ON THE BACKEND (FIN-237):
 * the block is 18 kB of the 21 kB response, so the default is now slim (3.3 kB)
 * and callers ask for it. Only the cockpit needs it — everything else on this
 * screen (sources rail, decision bar) reads the spine, not the evidence.
 *
 * The default here MIRRORS the API's default rather than being convenient, so
 * nobody gets 18 kB by accident — on a phone hotspot that is 10s of transfer.
 */
export function getReadiness(
  evidence = false,
  signal?: AbortSignal,
): Promise<ReadinessResponse> {
  return apiRequest(`/readiness${evidence ? '?evidence=true' : ''}`, readinessResponse, {
    signal,
  })
}

// --- spine refresh + kite (FIN-160) --------------------------------------

/**
 * POST /refresh. Bare (no `sources`) refreshes EVERY leg — the "refresh all" /
 * on-land path, backward-compatible. FIN-192: pass `sources` (readiness dot-keys,
 * e.g. `['lme']`) to refresh ONLY that source's leg, so a single stale dot never
 * spends every quota-limited API. 'kite' is NOT a valid source here (the backend
 * 400s it — it's a Kite login, handled by the kite modal), so callers must not
 * send it.
 */
export function refreshSpine(
  sources?: string[],
): Promise<RefreshSpineResponse> {
  const filtered = sources != null && sources.length > 0
  return apiRequest('/refresh', refreshSpineResponse, {
    method: 'POST',
    // ⚠️ NOT the read budget. A spine refresh runs ~10 news queries server-side
    // and takes ~30s of real work; giving up at 9s would report a failure for
    // work that is still running and about to succeed.
    timeoutMs: REFRESH_TIMEOUT_MS,
    ...(filtered ? { body: { sources } } : {}),
  })
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

// --- agent run (FIN-227 Stream C) ------------------------------------------
// The harness's second read on the same board. One run per date; a GATE REFUSAL
// is a complete run with no agent output, not a 404 (SAD §5, gap 3).
export function getAgentRun(
  date: string,
  signal?: AbortSignal,
): Promise<AgentRunResponse> {
  return apiRequest(`/agent-run/${encodeURIComponent(date)}`, agentRunResponse, {
    signal,
  })
}
