/* eslint-disable */
/**
 * GENERATED from /openapi.json by `npm run gen:contracts` (FFE-004). DO NOT EDIT.
 * Schemas-only (the zodios client half is stripped — the app uses its own
 * apiRequest). Import via the contracts barrel, never from here directly.
 */
import { z } from 'zod'

const LoginBody = z
  .object({ email: z.string().default(''), password: z.string().default('') })
  .partial()
  .passthrough()
const TokenPairResponse = z
  .object({
    access_token: z.string(),
    refresh_token: z.string(),
    expires_at: z.string(),
    token_type: z.string(),
  })
  .passthrough()
const ValidationError = z
  .object({
    loc: z.array(z.union([z.string(), z.number()])),
    msg: z.string(),
    type: z.string(),
    input: z.unknown().optional(),
    ctx: z.object({}).partial().passthrough().optional(),
  })
  .passthrough()
const HTTPValidationError = z
  .object({ detail: z.array(ValidationError) })
  .partial()
  .passthrough()
const RefreshTokenBody = z
  .object({ refresh_token: z.string().default('') })
  .partial()
  .passthrough()
const AccessTokenResponse = z
  .object({
    access_token: z.string(),
    expires_at: z.string(),
    token_type: z.string(),
  })
  .passthrough()
const LogoutResponse = z.object({ ok: z.boolean() }).passthrough()
const MeResponse = z
  .object({
    id: z.number().int(),
    email: z.string(),
    is_active: z.boolean(),
    created_at: z.string(),
  })
  .passthrough()
const SourceStatus = z.object({
  key: z.string(),
  status: z.string(),
  note: z.union([z.string(), z.null()]).optional(),
})
const Regime = z.object({
  is_new: z.boolean(),
  regime_change: z.boolean(),
  headline: z.string(),
  body: z.union([z.string(), z.null()]).optional(),
})
const Macro = z.object({
  value: z.number(),
  change_pct: z.number(),
  note: z.union([z.string(), z.null()]).optional(),
})
const Tone = z.object({
  value: z.string(),
  note: z.union([z.string(), z.null()]).optional(),
})
const Backdrop = z.object({
  usd_inr: z.union([Macro, z.null()]).optional(),
  dxy: z.union([Macro, z.null()]).optional(),
  risk_tone: Tone,
})
const SourceRef = z
  .object({
    name: z.union([z.string(), z.null()]),
    url: z.union([z.string(), z.null()]),
  })
  .partial()
const ServedCatalyst = z.object({
  direction: z.string(),
  headline: z.string(),
  instruments: z.array(z.string()).optional(),
  source: SourceRef,
  hours_old: z.union([z.number(), z.null()]).optional(),
  is_new: z.boolean(),
  age_label: z.string(),
})
const ServedMarket = z.object({
  session_read: z.string(),
  regime: Regime,
  backdrop: Backdrop,
  catalysts: z.array(ServedCatalyst).optional(),
  cross_instrument: z.array(z.string()).optional(),
})
const ServedFactors = z
  .object({
    gap: z.union([z.number(), z.null()]),
    oi: z.union([z.number(), z.null()]),
    level: z.union([z.number(), z.null()]),
    vol: z.union([z.number(), z.null()]),
  })
  .partial()
const ServedScanRow = z.object({
  rank: z.number().int(),
  instrument: z.string(),
  name: z.string(),
  tier: z.string(),
  implied_open_pct: z.union([z.number(), z.null()]).optional(),
  oi_state: z.union([z.string(), z.null()]).optional(),
  cot_percentile: z.union([z.number(), z.null()]).optional(),
  factors: ServedFactors,
})
const ServedImpliedOpen = z
  .object({
    implied_open_pct: z.union([z.number(), z.null()]),
    intl_change_pct: z.union([z.number(), z.null()]),
    usdinr_change_pct: z.union([z.number(), z.null()]),
  })
  .partial()
const ServedLevels = z
  .object({ support: z.array(z.number()), resistance: z.array(z.number()) })
  .partial()
const ServedPositioning = z
  .object({
    oi_state: z.union([z.string(), z.null()]),
    cot_stance: z.union([z.string(), z.null()]),
    cot_percentile: z.union([z.number(), z.null()]),
    divergence_flag: z.boolean().default(false),
    divergence_note: z.union([z.string(), z.null()]),
  })
  .partial()
const ServedAiRead = z.object({
  what_changed: z.string(),
  narrative: z.string(),
  positioning: z.union([ServedPositioning, z.null()]).optional(),
  cross_instrument_note: z.union([z.string(), z.null()]).optional(),
  watch: z.string(),
  why: z.string(),
  guard_failed: z.boolean().optional().default(false),
})
const ServedInstrument = z.object({
  instrument: z.string(),
  name: z.string(),
  tier: z.string(),
  data_tier: z.string(),
  implied_open: z.union([ServedImpliedOpen, z.null()]).optional(),
  oi_state: z.union([z.string(), z.null()]).optional(),
  cot_percentile: z.union([z.number(), z.null()]).optional(),
  atr: z.union([z.number(), z.null()]).optional(),
  levels: ServedLevels,
  factors: ServedFactors,
  ai_read: z.union([ServedAiRead, z.null()]).optional(),
})
const ServedMeta = z
  .object({
    deep_set: z.array(z.string()),
    guard_failed: z.boolean().default(false),
    fabricated_claims: z.number().int().default(0),
  })
  .partial()
const ServedBrief = z.object({
  date: z.string(),
  label: z.string(),
  market_open: z.string(),
  generated_at: z.string(),
  schema_version: z.string(),
  sources: z.array(SourceStatus).optional(),
  market: ServedMarket,
  scan: z.array(ServedScanRow).optional(),
  instruments: z.array(ServedInstrument).optional(),
  meta: ServedMeta,
})
const BriefListItem = z.object({
  date: z.string(),
  label: z.string(),
  generated_at: z.union([z.string(), z.null()]).optional(),
  guard_failed: z.boolean().optional().default(false),
})
const SourceHealthModel = z
  .object({
    key: z.string(),
    label: z.string(),
    status: z.string(),
    note: z.union([z.string(), z.null()]).optional(),
    critical: z.boolean(),
    human_refreshable: z.boolean().optional().default(false),
    action: z.union([z.string(), z.null()]).optional(),
    blocks_on_red: z.boolean().optional().default(false),
  })
  .passthrough()
const BoardRow = z
  .object({
    instrument_id: z.string(),
    segment: z.union([z.string(), z.null()]).optional(),
    data_tier: z.union([z.string(), z.null()]).optional(),
    contract: z.union([z.string(), z.null()]).optional(),
    close: z.union([z.number(), z.null()]).optional(),
    as_of: z.union([z.string(), z.null()]).optional(),
    oi: z.union([z.number(), z.null()]).optional(),
    oi_change: z.union([z.number(), z.null()]).optional(),
    oi_state: z.union([z.string(), z.null()]).optional(),
    cot_percentile: z.union([z.number(), z.null()]).optional(),
    cot_as_of: z.union([z.string(), z.null()]).optional(),
    is_fresh: z.boolean(),
    age_days: z.union([z.number(), z.null()]).optional(),
  })
  .passthrough()
const MacroRow = z
  .object({
    indicator: z.string(),
    value: z.union([z.number(), z.null()]).optional(),
    source: z.union([z.string(), z.null()]).optional(),
    as_of: z.union([z.string(), z.null()]).optional(),
    carried_forward: z.boolean(),
  })
  .passthrough()
const NewsWindow = z
  .object({
    rule: z.union([z.string(), z.null()]),
    threshold: z.union([z.string(), z.null()]),
  })
  .partial()
  .passthrough()
const NewsArticleEvidence = z
  .object({
    headline: z.union([z.string(), z.null()]).optional(),
    source_name: z.union([z.string(), z.null()]).optional(),
    url: z.union([z.string(), z.null()]).optional(),
    published_at: z.union([z.string(), z.null()]).optional(),
    age_hours: z.union([z.number(), z.null()]).optional(),
    status: z.string(),
    reason: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough()
const NewsEvidence = z
  .object({
    fetched_at: z.union([z.string(), z.null()]).optional(),
    count: z.number().int(),
    fresh_count: z.union([z.number(), z.null()]).optional(),
    window: NewsWindow,
    articles: z.array(NewsArticleEvidence),
  })
  .passthrough()
const ReadinessEvidence = z
  .object({
    board: z.array(BoardRow),
    macro: z.array(MacroRow),
    news: NewsEvidence,
  })
  .passthrough()
const BriefStatus = z
  .object({
    exists: z.boolean(),
    date: z.string(),
    generated_at: z.union([z.string(), z.null()]).optional(),
    is_complete: z.boolean(),
    guard_failed: z.boolean(),
    positioning_only: z.boolean(),
  })
  .passthrough()
const ReadinessResponse = z
  .object({
    sources: z.array(SourceHealthModel),
    can_generate: z.boolean(),
    blocked_reason: z.union([z.string(), z.null()]).optional(),
    fresh_count: z.string(),
    evidence: z.union([ReadinessEvidence, z.null()]).optional(),
    brief: z.union([BriefStatus, z.null()]).optional(),
  })
  .passthrough()
const KiteRefreshBody = z
  .object({ request_token: z.string().default('') })
  .partial()
  .passthrough()
const KiteRefreshResponse = z
  .object({
    ok: z.boolean(),
    reason: z.union([z.string(), z.null()]).optional(),
    source: SourceHealthModel,
  })
  .passthrough()
const MacroRefresh = z
  .object({
    ok: z.boolean(),
    rows: z.union([z.number(), z.null()]).optional(),
    source: z.union([z.string(), z.null()]).optional(),
    date_range: z.union([z.string(), z.null()]).optional(),
    error: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough()
const CotRefresh = z
  .object({
    ok: z.boolean(),
    action: z.union([z.string(), z.null()]).optional(),
    stored_pub: z.union([z.string(), z.null()]).optional(),
    reason: z.union([z.string(), z.null()]).optional(),
    stored: z.union([z.number(), z.null()]).optional(),
    scope: z.union([z.string(), z.null()]).optional(),
    stored_pub_before: z.union([z.string(), z.null()]).optional(),
    error: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough()
const NewsRefresh = z
  .object({
    ok: z.boolean(),
    date: z.union([z.string(), z.null()]).optional(),
    count: z.union([z.number(), z.null()]).optional(),
    queries_ok: z.union([z.number(), z.null()]).optional(),
    queries_total: z.union([z.number(), z.null()]).optional(),
    error: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough()
const TokenStatus = z
  .object({
    valid: z.boolean(),
    ttl_hours: z.number(),
    cta: z.union([z.string(), z.null()]).optional(),
    error: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough()
const RefreshReport = z
  .object({
    date: z.string(),
    macro: MacroRefresh,
    cot: CotRefresh,
    news: NewsRefresh,
    token: TokenStatus,
  })
  .passthrough()
const RefreshResponse = z
  .object({
    status: z.string(),
    guard: z.string(),
    started_at: z.union([z.string(), z.null()]).optional(),
    report: z.union([RefreshReport, z.null()]).optional(),
  })
  .passthrough()
const LoginUrlResponse = z.object({ url: z.string() }).passthrough()
const GenerateResponse = z
  .object({
    run_id: z.union([z.string(), z.null()]).optional(),
    status: z.string(),
    started: z.union([z.boolean(), z.null()]).optional(),
    positioning_only: z.union([z.boolean(), z.null()]).optional(),
    brief: z.union([ServedBrief, z.null()]).optional(),
  })
  .passthrough()
const RunStep = z
  .object({
    key: z.string(),
    state: z.string(),
    detail: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough()
const StageCost = z
  .object({
    stage: z.string(),
    input_tokens: z.number().int(),
    output_tokens: z.number().int(),
    web_search_calls: z.number().int(),
    retries: z.number().int(),
    cost_usd: z.number(),
  })
  .passthrough()
const CostReport = z
  .object({
    total_tokens: z.number().int(),
    input_tokens: z.number().int(),
    output_tokens: z.number().int(),
    cost_usd: z.number(),
    ceiling: z.number().int(),
    web_search_calls: z.number().int(),
    retries: z.number().int(),
    stages: z.array(StageCost),
  })
  .passthrough()
const GenerateStatusResponse = z
  .object({
    run_id: z.string(),
    date: z.string(),
    status: z.string(),
    steps: z.array(RunStep),
    brief_ready: z.boolean(),
    reason: z.union([z.string(), z.null()]).optional(),
    cost: z.union([CostReport, z.null()]).optional(),
  })
  .passthrough()

export const schemas = {
  LoginBody,
  TokenPairResponse,
  ValidationError,
  HTTPValidationError,
  RefreshTokenBody,
  AccessTokenResponse,
  LogoutResponse,
  MeResponse,
  SourceStatus,
  Regime,
  Macro,
  Tone,
  Backdrop,
  SourceRef,
  ServedCatalyst,
  ServedMarket,
  ServedFactors,
  ServedScanRow,
  ServedImpliedOpen,
  ServedLevels,
  ServedPositioning,
  ServedAiRead,
  ServedInstrument,
  ServedMeta,
  ServedBrief,
  BriefListItem,
  SourceHealthModel,
  BoardRow,
  MacroRow,
  NewsWindow,
  NewsArticleEvidence,
  NewsEvidence,
  ReadinessEvidence,
  BriefStatus,
  ReadinessResponse,
  KiteRefreshBody,
  KiteRefreshResponse,
  MacroRefresh,
  CotRefresh,
  NewsRefresh,
  TokenStatus,
  RefreshReport,
  RefreshResponse,
  LoginUrlResponse,
  GenerateResponse,
  RunStep,
  StageCost,
  CostReport,
  GenerateStatusResponse,
}
