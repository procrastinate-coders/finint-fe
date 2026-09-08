import { createFileRoute } from '@tanstack/react-router'
import { AgentRunScreen } from '@/features/agent-run/AgentRunScreen'

export const Route = createFileRoute('/_authenticated/agent-run/$date')({
  staticData: { title: 'Agent run' },
  component: RouteComponent,
})

function RouteComponent() {
  const { date } = Route.useParams()
  return <AgentRunScreen date={date} />
}
