/**
 * Father may paste the whole redirect URL from the address bar, or just the
 * token. Pull the `request_token` out of either. The redirect page itself won't
 * load (connection refused to localhost:8080) — that is EXPECTED; the token is
 * still right there in the URL bar.
 */
export function extractRequestToken(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  // A pasted URL or query fragment containing request_token=...
  const match = trimmed.match(/[?&]?request_token=([^&\s]+)/i)
  if (match) return match[1]
  // Otherwise assume they pasted the bare token.
  return trimmed
}
