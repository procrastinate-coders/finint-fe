import { createFileRoute } from '@tanstack/react-router'
import { HistoryList } from '@/features/brief/HistoryList'

export const Route = createFileRoute('/_authenticated/history')({
  staticData: { title: 'History' },
  component: HistoryList,
})
