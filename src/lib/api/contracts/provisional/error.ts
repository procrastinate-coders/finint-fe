import { z } from 'zod'

/**
 * PROVISIONAL (FFE-008) — FININT is FastAPI, so its error envelope is
 * `{ detail: string | ValidationError[] }`, plus the brief-not-found shape
 * `{ reason: string }`. This is deliberately LENIENT: an auth failure returns
 * the SAME generic body regardless of whether the email or the password was
 * wrong — the UI must not leak which (task step 8 / backend design).
 */

const validationItem = z.object({
  loc: z.array(z.union([z.string(), z.number()])),
  msg: z.string(),
  type: z.string(),
})

export const apiErrorBody = z.object({
  detail: z.union([z.string(), z.array(validationItem)]).optional(),
  reason: z.string().optional(),
})

export type ApiErrorBody = z.infer<typeof apiErrorBody>

/** Best-effort human message from either envelope shape. */
export function messageFromErrorBody(body: ApiErrorBody): string | null {
  if (typeof body.detail === 'string') return body.detail
  if (Array.isArray(body.detail) && body.detail.length > 0) {
    return body.detail[0].msg
  }
  if (body.reason) return body.reason
  return null
}
