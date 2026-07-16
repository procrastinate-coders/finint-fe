import { createFileRoute } from '@tanstack/react-router'
import { BriefScreen } from '@/features/brief/BriefScreen'

// FIN-161 routes "View brief" here; the full brief screen is FIN-162's to build.
export const Route = createFileRoute('/_authenticated/brief/today')({
  staticData: { title: 'Morning brief' },
  component: BriefScreen,
})
