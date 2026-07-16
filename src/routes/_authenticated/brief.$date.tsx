import { createFileRoute } from '@tanstack/react-router'
import { BriefByDate } from '@/features/brief/BriefByDate'

export const Route = createFileRoute('/_authenticated/brief/$date')({
  staticData: { title: 'Brief' },
  component: RouteComponent,
})

function RouteComponent() {
  const { date } = Route.useParams()
  return <BriefByDate date={date} />
}
