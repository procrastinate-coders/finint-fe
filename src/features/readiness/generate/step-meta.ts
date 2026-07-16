/**
 * The 4 pipeline steps, in order, with plain human labels. The API's `detail`
 * string is rendered live beside each; these are just the stable names. NO
 * buy/sell language anywhere (law 5) — the system frames, it never acts.
 */
export const STEP_ORDER = ['fetch', 'scan', 'news', 'write'] as const

export const STEP_LABEL: Record<string, string> = {
  fetch: 'Fetch sources',
  scan: 'Scan the board',
  news: 'Read overnight news',
  write: 'Write the brief',
}

export type StepState = 'pending' | 'running' | 'done' | 'error'
