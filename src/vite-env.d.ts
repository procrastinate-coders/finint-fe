/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the FININT FastAPI backend (its own host, bare paths). */
  readonly VITE_FININT_API_BASE_URL?: string
  /** '1' → run against MSW mock handlers instead of the live backend. */
  readonly VITE_API_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
