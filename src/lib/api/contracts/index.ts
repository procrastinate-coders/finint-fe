/**
 * The contract barrel — every API response is Zod-parsed against a schema from
 * here at the boundary (CLAUDE.md law 12; drift fails loudly).
 *
 * FFE-004: schemas are GENERATED from FIN-159's `/openapi.json` into
 * `_generated/schemas.ts` (via `npm run gen:contracts`), never hand-written.
 * This barrel gives them app-friendly names. The provisional/* schemas that the
 * scaffold shipped (FFE-008) are DELETED now that real generated schemas exist —
 * which was the whole point of FFE-004.
 *
 * The one exception is `./error` — the `{detail}` envelope isn't a reusable
 * OpenAPI component, so it can't be generated and stays hand-authored.
 */
import { z } from 'zod'
import { schemas } from './_generated/schemas'

// --- auth ----------------------------------------------------------------
// POST /auth/login → tokens ONLY (no user; the user comes from GET /auth/me).
export const loginResponse = schemas.TokenPairResponse
// POST /auth/refresh → a new ACCESS token only. The refresh token is NOT
// rotated — the response has no refresh_token (do not expect one, or every
// refresh throws and surfaces as a mysterious logout).
export const refreshResponse = schemas.AccessTokenResponse
export const logoutResponse = schemas.LogoutResponse
// GET /auth/me → the user identity. id is a NUMBER; there is no `name`.
export const meResponse = schemas.MeResponse

export type LoginResponse = z.infer<typeof schemas.TokenPairResponse>
export type RefreshResponse = z.infer<typeof schemas.AccessTokenResponse>
export type LogoutResponse = z.infer<typeof schemas.LogoutResponse>
export type User = z.infer<typeof schemas.MeResponse>

// --- readiness (FIN-160) -------------------------------------------------
export const readinessResponse = schemas.ReadinessResponse
export type ReadinessResponse = z.infer<typeof schemas.ReadinessResponse>
export type ReadinessSource = z.infer<typeof schemas.SourceHealthModel>

// --- readiness evidence (FIN-169) — the layered brief inputs the cockpit
// renders: the per-instrument board, the macro backdrop, and the news window.
export type ReadinessEvidence = z.infer<typeof schemas.ReadinessEvidence>
export type BoardRow = z.infer<typeof schemas.BoardRow>
export type MacroRow = z.infer<typeof schemas.MacroRow>
export type NewsEvidence = z.infer<typeof schemas.NewsEvidence>
export type NewsArticleEvidence = z.infer<typeof schemas.NewsArticleEvidence>

// --- spine refresh / kite / generate (FIN-160/161) -----------------------
// `RefreshResponse` in the spec is the SPINE refresh (POST /refresh) — distinct
// from the auth token refresh above.
export const refreshSpineResponse = schemas.RefreshResponse
export const kiteLoginUrlResponse = schemas.LoginUrlResponse
export const kiteRefreshResponse = schemas.KiteRefreshResponse
export const generateResponse = schemas.GenerateResponse
export const generateStatusResponse = schemas.GenerateStatusResponse

export type RefreshSpineResponse = z.infer<typeof schemas.RefreshResponse>
export type KiteLoginUrlResponse = z.infer<typeof schemas.LoginUrlResponse>
export type KiteRefreshResponse = z.infer<typeof schemas.KiteRefreshResponse>
export type GenerateResponse = z.infer<typeof schemas.GenerateResponse>
export type GenerateStatusResponse = z.infer<
  typeof schemas.GenerateStatusResponse
>

// --- brief (FIN-162) — the served brief schema is generated too ----------
export const servedBrief = schemas.ServedBrief
export const briefListItem = schemas.BriefListItem
export type ServedBrief = z.infer<typeof schemas.ServedBrief>
export type BriefListItem = z.infer<typeof schemas.BriefListItem>

// --- error (hand-authored — the {detail} envelope isn't in the spec) -----
export * from './error'
