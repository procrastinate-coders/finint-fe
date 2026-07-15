import { Glass } from './Glass'

export const title = 'Glass — chrome material'

export default function GlassPreview() {
  return (
    <div className="relative">
      <div className="apex-aura" aria-hidden>
        <span className="a-blue" />
        <span className="a-indigo" />
      </div>
      <div className="relative z-10 grid gap-6 sm:grid-cols-2">
        <Glass variant="panel" className="p-5">
          <p className="text-[13px] text-apex-fg-secondary">
            variant=&quot;panel&quot; — the resting frosted surface for sidebar
            and floating chrome.
          </p>
        </Glass>
        <Glass variant="toolbar" className="p-5">
          <p className="text-[13px] text-apex-fg-secondary">
            variant=&quot;toolbar&quot; — the lighter blur used by the header.
          </p>
        </Glass>
        <Glass variant="modal" className="p-5">
          <p className="text-[13px] text-apex-fg-secondary">
            variant=&quot;modal&quot; — the strongest blur for overlays + login.
          </p>
        </Glass>
        <Glass tone="danger" className="p-5">
          <p className="text-[13px] text-apex-fg-secondary">
            tone=&quot;danger&quot; — the ONE tinted glass, for an urgency
            wrapper. Never on data.
          </p>
        </Glass>
      </div>
    </div>
  )
}
