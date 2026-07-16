/**
 * When a substance guard fails closed, the backend replaces a text field's VALUE
 * with a literal sentinel ("(withheld — failed substance check)"). That is a
 * STATE, not content — printed verbatim, Father reads it as if it were the
 * session read. Every free-text field is checked; a match renders as a visible
 * held-back state (see Withheld.tsx) instead of the raw string. The single most
 * product-defining rendering decision in the brief. (Robust to dash variants +
 * surrounding whitespace.)
 */
const WITHHELD_RE = /withheld\s*[—–-]?\s*failed substance check/i

export function isWithheld(value: string | null | undefined): boolean {
  return typeof value === 'string' && WITHHELD_RE.test(value)
}
