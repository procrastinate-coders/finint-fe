import { z } from 'zod'

/**
 * PROVISIONAL (FFE-008) — mirrors the REAL production /readiness payload
 * (CONTEXT.md, 2026-07-15) but is hand-authored because the backend endpoint
 * has no `response_model=` yet. Regenerate + delete once it does.
 *
 * The `sources` array is REGISTRY-DRIVEN (CLAUDE.md law 5): it went 6 → 8 and
 * will grow again. Consumers MUST map over `sources` and never hardcode the
 * list. `status` is kept a plain string (not an enum) so a new status value the
 * backend introduces renders rather than crashing the parse.
 */

export const readinessSource = z.object({
  key: z.string(),
  label: z.string(),
  status: z.string(), // 'green' | 'amber' | 'red' | … (registry-driven)
  note: z.string(),
  critical: z.boolean(),
  human_refreshable: z.boolean(),
  action: z.string().nullable(), // 'kite_refresh' | 'news_refresh' | null
  blocks_on_red: z.boolean(),
})

export const readinessResponse = z.object({
  sources: z.array(readinessSource),
  can_generate: z.boolean(),
  blocked_reason: z.string().nullable(),
  fresh_count: z.string(), // e.g. "7/8"
})

export type ReadinessSource = z.infer<typeof readinessSource>
export type ReadinessResponse = z.infer<typeof readinessResponse>
