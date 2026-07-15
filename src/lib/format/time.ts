/**
 * IST time/date presentation (FFE-002). Every operator-facing time is IST
 * (Asia/Kolkata), regardless of the viewer's timezone — the MCX board runs on
 * IST and the brief reads T-1 close pre-open. null / empty / invalid → "—"
 * (law 1), never a blank.
 *
 * Point-in-time is BY DESIGN (law 6): yesterday's close shown pre-open is
 * correct, not "stale" — so these helpers never editorialise, they only format.
 */

export { DASH } from './number'
import { DASH } from './number'

const IST = 'Asia/Kolkata'

const clockFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: IST,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: IST,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: IST,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const dateShortFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: IST,
  day: '2-digit',
  month: 'short',
})

/** "HH:MM:SS" in IST for the live header clock (takes a Date, never null). */
export function istClock(date: Date): string {
  return clockFmt.format(date)
}

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "HH:MM" in IST for an ISO8601 timestamp. null/invalid → "—". */
export function istTime(iso: string | null | undefined): string {
  const d = parse(iso)
  return d ? timeFmt.format(d) : DASH
}

/** "10 Jul 2026" in IST for a date/timestamp (COT as-of, brief date). null → "—". */
export function istDate(iso: string | null | undefined): string {
  const d = parse(iso)
  return d ? dateFmt.format(d) : DASH
}

/** "15 Jul, 16:50" in IST — a catalyst timestamp. null → "—". */
export function istDateTime(iso: string | null | undefined): string {
  const d = parse(iso)
  return d ? `${dateShortFmt.format(d)}, ${timeFmt.format(d)}` : DASH
}
