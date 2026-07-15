import { createFileRoute } from '@tanstack/react-router'
import { ReadinessScreen } from '@/features/readiness/ReadinessScreen'

export const Route = createFileRoute('/_authenticated/')({
  staticData: { title: 'Readiness' },
  component: ReadinessScreen,
})
