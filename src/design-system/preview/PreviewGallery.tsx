import { previews } from './registry'

/** DEV-only component-state gallery, rendered inside the real app shell + canvas. */
export function PreviewGallery() {
  return (
    <div className="space-y-8 pb-16">
      <header>
        <h1 className="text-[24px] font-medium text-apex-fg">
          Component gallery
        </h1>
        <p className="mt-1 text-[13px] text-apex-fg-secondary">
          design-system primitives over the real canvas — DEV only (
          {previews.length} previews).
        </p>
      </header>

      {previews.map((p) => {
        const Render = p.Render
        return (
          <section key={p.id} className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.04em] text-apex-fg-tertiary">
              {p.title}
            </h2>
            <div className="rounded-[10px] border-[0.5px] border-apex-border bg-apex-primary p-6">
              <Render />
            </div>
          </section>
        )
      })}
    </div>
  )
}
