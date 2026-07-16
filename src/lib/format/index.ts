/**
 * THE formatter module (FFE-002). Import number/time presentation from here —
 * never reach for a raw `Intl.NumberFormat` or `toFixed()` in a component.
 */
export {
  DASH,
  formatInr,
  formatNumber,
  formatSignedNumber,
  formatPct,
  formatPercentile,
} from './number'
export { istClock, istTime, istDate, istDateTime } from './time'
