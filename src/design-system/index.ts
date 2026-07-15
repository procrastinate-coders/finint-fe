/**
 * The design-system public barrel — the single import surface for the visual
 * vocabulary (CLAUDE.md law 11). Ported from apex-admin, own copy (FFE-003).
 *
 * The flat DATA primitives physically live in `@/components/finint`; this
 * re-exports them in place so features import everything `from '@/design-system'`.
 */
export * from '@/components/finint' // flat, signal-pure DATA primitives
export * from './material' // glass material — CHROME ONLY
export * from './brand' // the FININT wordmark lockup (monochrome)
export * from './motion' // motion tokens
