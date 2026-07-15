import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/')({
  staticData: { title: 'Brief' },
  component: BriefShell,
})

/**
 * Empty shell for now — the real brief surface (market layer + scan board + the
 * per-instrument cards) is FIN-149. Deliberately renders NO data: a fabricated
 * brief would be the one unforgivable thing (CLAUDE.md law 1). It only proves
 * you're through the gate and the authed shell renders.
 */
function BriefShell() {
  return (
    <div className="rounded-[10px] border-[0.5px] border-apex-border bg-apex-primary p-10 text-center">
      <h1 className="text-[18px] font-medium text-apex-fg">
        This morning&apos;s brief
      </h1>
      <p className="mx-auto mt-2 max-w-[46ch] text-[14px] text-apex-fg-secondary">
        The market layer, the scan board (all 9 mains), and the per-instrument
        read render here. The surface is built in FIN-149 — this scaffold proves
        the shell, auth gate, and data plumbing only.
      </p>
    </div>
  )
}
