// The honesty logic now lives in @/lib/brief/honesty (shared with the brief
// surface, FIN-162). Re-exported so the generate flow's imports don't change.
export {
  summarizeDegradation,
  isPositioningOnly,
  type DegradationSummary,
} from '@/lib/brief/honesty'
