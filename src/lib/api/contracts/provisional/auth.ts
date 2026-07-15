import { z } from 'zod'

/**
 * PROVISIONAL (FFE-008) — FININT's own auth (FIN-157) is NOT built yet, so this
 * is a designed-not-observed shape. It replaces apex-admin's operator JWT
 * entirely (FFE-001): FININT owns its login, its secret, its users table. When
 * FIN-157 lands, regenerate from /openapi.json and delete this file.
 *
 * Login is by EMAIL + password. The single user is Father.
 */

export const user = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
})

// POST /auth/login → access (15m) + refresh (30d, NOT rotated on /auth/refresh)
export const loginResponse = z.object({
  access_token: z.string(),
  expires_at: z.string(), // ISO8601 +05:30
  refresh_token: z.string(),
  user,
})

// POST /auth/refresh → a new access token only (refresh token is not rotated)
export const refreshResponse = z.object({
  access_token: z.string(),
  expires_at: z.string(),
})

export type User = z.infer<typeof user>
export type LoginResponse = z.infer<typeof loginResponse>
export type RefreshResponse = z.infer<typeof refreshResponse>
