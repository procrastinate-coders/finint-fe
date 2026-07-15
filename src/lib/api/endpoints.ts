import { z } from 'zod'
import { tokenStore } from '@/lib/auth/session'
import { apiRequest } from './client'
import {
  generateResponse,
  generateStatusResponse,
  kiteLoginUrlResponse,
  kiteRefreshResponse,
  loginResponse,
  meResponse,
  readinessResponse,
  refreshSpineResponse,
  type GenerateResponse,
  type GenerateStatusResponse,
  type KiteLoginUrlResponse,
  type KiteRefreshResponse,
  type LoginResponse,
  type ReadinessResponse,
  type RefreshSpineResponse,
  type User,
} from './contracts'

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

export function generate(): Promise<GenerateResponse> {
  return apiRequest('/generate', generateResponse, { method: 'POST' })
}

export function getGenerateStatus(
  signal?: AbortSignal,
): Promise<GenerateStatusResponse> {
  return apiRequest('/generate/status', generateStatusResponse, { signal })
}

// --- brief (FIN-162; parsed as unknown until that phase wires ServedBrief) -

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
