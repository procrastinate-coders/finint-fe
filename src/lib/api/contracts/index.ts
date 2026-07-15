/**
 * The contract barrel — every API response is Zod-parsed against a schema from
 * here at the boundary (CLAUDE.md law 12; drift fails loudly).
 *
 * FFE-004: schemas are GENERATED from /openapi.json into `_generated/`, never
 * hand-written. FFE-008: until the backend declares response models, the app
 * reads the PROVISIONAL schemas below. When codegen produces real schemas, add
 * `export * from './_generated/…'` here and delete the provisional file it
 * replaces — consumers importing from `@/lib/api/contracts` don't change.
 */
export * from './provisional/auth'
export * from './provisional/readiness'
export * from './provisional/system'
export * from './provisional/error'
