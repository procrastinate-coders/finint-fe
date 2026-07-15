import type { ReactNode } from 'react'

interface PreviewModule {
  default: () => ReactNode
  title?: string
}

// Auto-collect every co-located *.preview.tsx across the app — zero wiring per
// component. Eager so the gallery renders synchronously; the whole chunk is
// code-split behind the DEV-only /dev/components route.
const modules = import.meta.glob<PreviewModule>('/src/**/*.preview.tsx', {
  eager: true,
})

export interface PreviewEntry {
  id: string
  title: string
  Render: () => ReactNode
}

export const previews: PreviewEntry[] = Object.entries(modules)
  .map(([path, mod]) => ({
    id: path,
    title:
      mod.title ?? path.split('/').pop()?.replace('.preview.tsx', '') ?? path,
    Render: mod.default,
  }))
  .sort((a, b) => a.title.localeCompare(b.title))
