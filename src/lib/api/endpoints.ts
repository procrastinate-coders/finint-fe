import { z } from 'zod'
import { tokenStore } from '@/lib/auth/session'
import { apiRequest } from './client'
import {
  generateResponse,
  generateStatusResponse,
  kiteLoginUrlResponse,
  kiteRefreshResponse,
  loginResponse,
  readinessResponse,
  refreshSpineResponse,
  user,
  type GenerateResponse,
  type GenerateStatusResponse,
  type KiteLoginUrlResponse,
  type KiteRefreshResponse,
  type LoginResponse,
  type ReadinessResponse,
  type RefreshSpineResponse,
  type User,
} from './contracts'

// --- auth (FIN-157; PROVISIONAL shapes) ----------------------------------

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
  tokenStore.setSession(
    {
      accessToken: res.access_token,
      expiresAt: res.expires_at,
      refreshToken: res.refresh_token,
      user: res.user,
    },
    remember,
  )
  return res
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/auth/logout', null, { method: 'POST' })
  } finally {
    // Clear locally even if the server revoke fails — the session is gone here.
    tokenStore.clear()
  }
}

export function getMe(signal?: AbortSignal): Promise<User> {
  return apiRequest('/auth/me', user, { signal })
}

// --- readiness ($0 gate) -------------------------------------------------

export function getReadiness(signal?: AbortSignal): Promise<ReadinessResponse> {
  return apiRequest('/readiness', readinessResponse, { signal })
}

// --- spine refresh + kite (FIN-156; PROVISIONAL shapes) ------------------

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

// --- generate (PAID — ~$0.06, minutes; poll status, don't block) ----------

export function generate(): Promise<GenerateResponse> {
  return apiRequest('/generate', generateResponse, { method: 'POST' })
}

export function getGenerateStatus(
  signal?: AbortSignal,
): Promise<GenerateStatusResponse> {
  return apiRequest('/generate/status', generateStatusResponse, { signal })
}

// --- brief (shape lands with FIN-149; parsed as unknown for now) ----------
// Deliberately untyped: the brief contract is large and is NOT built here.
// FIN-149 replaces `z.unknown()` with the generated brief schema.

export function getBriefToday(signal?: AbortSignal): Promise<unknown> {
  return apiRequest('/brief/today', z.unknown(), { signal })
}

export function getBrief(date: string, signal?: AbortSignal): Promise<unknown> {
  return apiRequest(`/brief/${encodeURIComponent(date)}`, z.unknown(), {
    signal,
  })
}

export function getBriefs(signal?: AbortSignal): Promise<unknown> {
  return apiRequest('/briefs', z.unknown(), { signal })
}
