import { z } from 'zod'

/**
 * PROVISIONAL (FFE-008) — spine refresh, Kite, and generate shapes. These
 * endpoints are FIN-156 (refresh / kite login-url) and the paid generate flow;
 * their backend response models aren't declared yet. Shapes match the MSW
 * fixtures so parse-at-boundary works on mocks. Regenerate once the backend
 * types them.
 *
 * NO buy/sell language anywhere in these labels (CLAUDE.md law 2).
 */

// POST /refresh — trigger refresh_spine (macro + COT + news + token status)
export const refreshSpineResponse = z.object({
  ok: z.boolean(),
  refreshed: z.array(z.string()),
  reason: z.string().nullable(),
})

// GET /kite/login-url — the api_key stays on the backend
export const kiteLoginUrlResponse = z.object({
  url: z.string(),
})

// POST /kite/refresh — exchange a request_token; never 500s, a bad token is {ok:false}
export const kiteRefreshResponse = z.object({
  ok: z.boolean(),
  reason: z.string().nullable(),
  source: z.string(),
})

// POST /generate — kick off the (paid) brief run
export const generateResponse = z.object({
  run_id: z.string(),
  status: z.string(),
})

// GET /generate/status — the 4-step progress poll
export const generateStep = z.object({
  key: z.string(),
  label: z.string(),
  status: z.string(), // 'pending' | 'running' | 'done' | 'error'
})

export const generateStatusResponse = z.object({
  run_id: z.string(),
  status: z.string(),
  step: z.number(),
  steps: z.array(generateStep),
})

export type RefreshSpineResponse = z.infer<typeof refreshSpineResponse>
export type KiteLoginUrlResponse = z.infer<typeof kiteLoginUrlResponse>
export type KiteRefreshResponse = z.infer<typeof kiteRefreshResponse>
export type GenerateResponse = z.infer<typeof generateResponse>
export type GenerateStatusResponse = z.infer<typeof generateStatusResponse>
