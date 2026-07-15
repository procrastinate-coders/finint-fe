import type { ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type GlassVariant = 'sidebar' | 'toolbar' | 'panel' | 'modal' | 'overlay'

const variantClass: Record<GlassVariant, string> = {
  sidebar: '',
  panel: '',
  toolbar: 'apex-glass--toolbar',
  modal: 'apex-glass--modal',
  overlay: 'apex-glass--overlay',
}

export interface GlassProps {
  /** selects tint + blur + elevation preset */
  variant?: GlassVariant
  /** 'danger' = the ONE tinted glass (the urgency wrapper); never on data */
  tone?: 'neutral' | 'danger'
  /** hover sheen lift — chrome controls only, never a data row */
  interactive?: boolean
  /** semantic element (aside | header | section | div …) */
  as?: ElementType
  className?: string
  children?: ReactNode
}

/**
 * The ONLY component permitted to emit glass material (backdrop-filter + chrome
 * elevation). CHROME ONLY (CLAUDE.md law 9/10) — never wrap a data surface.
 * Data children keep their own opaque `--apex-bg-*` fills and read as solids on
 * the frost. Where glass and signal compete, signal wins.
 */
export function Glass({
  variant = 'panel',
  tone = 'neutral',
  interactive = false,
  as,
  className,
  children,
}: GlassProps) {
  const Comp: ElementType = as ?? 'div'
  return (
    <Comp
      className={cn(
        'apex-glass',
        variantClass[variant],
        tone === 'danger' && 'apex-glass--danger',
        interactive && 'apex-glass--interactive',
        className,
      )}
    >
      {children}
    </Comp>
  )
}
