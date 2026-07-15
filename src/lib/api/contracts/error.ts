import { z } from 'zod'

/**
 * The ONE error envelope (CONTRACT.md): FININT is FastAPI, so every error is
 * `{"detail": "<message>"}` (via `HTTPException`). FIN-157 standardised the three
 * competing shapes that used to exist ({error} / {reason} / {detail}) down to
 * this one — so the FE needs ONE parser. Hand-authored (not generated): a plain
 * `{detail}` error isn't a reusable component in the OpenAPI spec (only the 422
 * `HTTPValidationError` is), so it can't come out of codegen.
 *
 * The 422 validation body is `{"detail": [{loc,msg,type}, …]}` — we tolerate
 * both string and array `detail` so a validation error still yields a message.
 */

const validationItem = z.object({
  loc: z.array(z.union([z.string(), z.number()])),
  msg: z.string(),
  type: z.string(),
})

export const apiErrorBody = z.object({
  detail: z.union([z.string(), z.array(validationItem)]).optional(),
})

export type ApiErrorBody = z.infer<typeof apiErrorBody>

/** Best-effort human message from the {detail} envelope. */
export function messageFromErrorBody(body: ApiErrorBody): string | null {
  if (typeof body.detail === 'string') return body.detail
  if (Array.isArray(body.detail) && body.detail.length > 0) {
    return body.detail[0].msg
  }
  return null
}
