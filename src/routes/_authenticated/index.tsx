import { createFileRoute } from '@tanstack/react-router'
import { ReadinessScreen } from '@/features/readiness/ReadinessScreen'

export const Route = createFileRoute('/_authenticated/')({
  // FIN-172: the home IS the Morning brief (its "not yet" state is the cockpit).
  staticData: { title: 'Morning brief' },
  component: ReadinessScreen,
})
